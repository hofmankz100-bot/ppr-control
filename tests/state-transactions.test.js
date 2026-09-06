"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createStateTransactions } = require("../server/state-transactions");

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

function store(commitHook = async () => {}) {
  let durable = { users: [], count: 0 };
  let cache = structuredClone(durable);
  const observed = { begins: 0, commits: 0, rollbacks: 0, releases: 0, effects: [] };
  const transactions = createStateTransactions({
    async begin() {
      observed.begins += 1;
      return {
        state: structuredClone(durable),
        async commit(state) {
          await commitHook(state);
          if (state) durable = structuredClone(state);
          observed.commits += 1;
        },
        async rollback() { observed.rollbacks += 1; },
        release() { observed.releases += 1; }
      };
    },
    committed: () => cache,
    publish: snapshot => { cache = snapshot; },
    onEffectError: error => observed.effects.push(error.message)
  });
  return { transactions, observed, durable: () => durable, cache: () => cache };
}

test("HTTP acknowledgement and broadcast wait for the durable commit", async () => {
  const writing = deferred();
  const commit = deferred();
  const fixture = store(async () => { writing.resolve(); await commit.promise; });
  const published = [];
  const request = fixture.transactions.run(() => {
    const state = fixture.transactions.read();
    state.users.push("new-session");
    fixture.transactions.stage(state);
    fixture.transactions.defer(() => published.push("http-200"), { critical: true });
    fixture.transactions.defer(() => published.push("websocket"));
  });
  await writing.promise;
  assert.deepEqual(published, []);
  assert.deepEqual(fixture.transactions.read().users, []);
  assert.deepEqual(fixture.durable().users, []);
  commit.resolve();
  await request;
  assert.deepEqual(published, ["http-200", "websocket"]);
  assert.deepEqual(fixture.cache().users, ["new-session"]);
});

test("a failed commit cannot acknowledge login or keep its session in memory", async () => {
  let failing = true;
  const fixture = store(async () => { if (failing) throw new Error("commit unavailable"); });
  let acknowledged = false;
  await assert.rejects(fixture.transactions.run(() => {
    const state = fixture.transactions.read();
    state.users.push("must-not-authenticate");
    fixture.transactions.stage(state);
    fixture.transactions.defer(() => { acknowledged = true; }, { critical: true });
  }), /commit unavailable/);
  assert.equal(acknowledged, false);
  assert.deepEqual(fixture.cache().users, []);
  assert.deepEqual(fixture.durable().users, []);
  assert.equal(fixture.observed.rollbacks, 1);
  assert.equal(fixture.observed.releases, 1);
  failing = false;
  await fixture.transactions.run(() => {
    const state = fixture.transactions.read();
    assert.deepEqual(state.users, []);
    state.users.push("accepted-session");
    fixture.transactions.stage(state);
  });
  assert.deepEqual(fixture.durable().users, ["accepted-session"]);
});

test("nested mutation helpers share a transaction instead of deadlocking or committing early", async () => {
  const fixture = store();
  await fixture.transactions.run(async () => {
    const state = fixture.transactions.read();
    state.count += 1;
    fixture.transactions.stage(state);
    await fixture.transactions.run(async () => {
      assert.equal(fixture.transactions.read().count, 1);
      await fixture.transactions.idle();
      fixture.transactions.read().count += 1;
      fixture.transactions.stage(fixture.transactions.read());
    });
    assert.equal(fixture.observed.commits, 0);
  });
  assert.equal(fixture.observed.begins, 1);
  assert.equal(fixture.observed.commits, 1);
  assert.equal(fixture.durable().count, 2);
});

test("concurrent requests read the latest committed state before their mutation", async () => {
  const fixture = store();
  await Promise.all(Array.from({ length: 20 }, () => fixture.transactions.run(async () => {
    const state = fixture.transactions.read();
    await Promise.resolve();
    state.count += 1;
    fixture.transactions.stage(state);
  })));
  assert.equal(fixture.durable().count, 20);
  assert.equal(fixture.cache().count, 20);
  assert.equal(fixture.observed.commits, 20);
});

test("a rejected operation discards its draft and deferred actions", async () => {
  const fixture = store();
  let emitted = false;
  await assert.rejects(fixture.transactions.run(() => {
    const state = fixture.transactions.read();
    state.count = 100;
    fixture.transactions.stage(state);
    fixture.transactions.defer(() => { emitted = true; });
    throw new Error("invalid operation");
  }), /invalid operation/);
  assert.equal(fixture.durable().count, 0);
  assert.equal(fixture.cache().count, 0);
  assert.equal(emitted, false);
  assert.equal(fixture.observed.commits, 0);
});

test("read-only operations cannot publish accidental mutations or leak cache references", async () => {
  const fixture = store();
  await fixture.transactions.run(() => { fixture.transactions.read().count = 100; });
  assert.equal(fixture.cache().count, 0);
  fixture.transactions.read().users.push("outside-mutation");
  assert.deepEqual(fixture.cache().users, []);
  assert.throws(() => fixture.transactions.stage({ count: 10 }), /active transaction/);
});

test("notification errors are reported but a critical response failure is propagated", async () => {
  const fixture = store();
  await fixture.transactions.run(() => {
    fixture.transactions.defer(() => { throw new Error("push unavailable"); });
  });
  assert.deepEqual(fixture.observed.effects, ["push unavailable"]);
  await assert.rejects(fixture.transactions.run(() => {
    fixture.transactions.defer(() => { throw new Error("response serialization failed"); }, { critical: true });
  }), /response serialization failed/);
});

test("long readonly handlers retain an isolated snapshot without blocking a concurrent commit", async () => {
  const fixture = store();
  const started = deferred();
  const continueRead = deferred();
  const read = fixture.transactions.view(async () => {
    assert.equal(fixture.transactions.read().count, 0);
    assert.throws(() => fixture.transactions.stage({ count: 99 }), /active transaction/);
    started.resolve();
    await continueRead.promise;
    assert.equal(fixture.transactions.read().count, 0);
  });
  await started.promise;
  try {
    await fixture.transactions.run(() => {
      const state = fixture.transactions.read();
      state.count = 1;
      fixture.transactions.stage(state);
    });
    assert.equal(fixture.cache().count, 1);
  } finally { continueRead.resolve(); }
  await read;
  assert.equal(fixture.observed.begins, 1);
});

test("a readonly handler can perform a short nested mutation and then observe its committed result", async () => {
  const fixture = store();
  await fixture.transactions.view(async () => {
    await fixture.transactions.run(() => {
      const state = fixture.transactions.read();
      state.users.push("created-configuration");
      fixture.transactions.stage(state);
    });
    assert.deepEqual(fixture.transactions.read().users, ["created-configuration"]);
    assert.equal(fixture.transactions.current().readOnly, true);
  });
  assert.equal(fixture.observed.begins, 1);
  assert.equal(fixture.observed.commits, 1);
});
