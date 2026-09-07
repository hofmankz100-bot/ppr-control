"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { EventEmitter } = require("node:events");
const multiPostgres = require("../multi-postgres");
const {
  PRIMARY_PROBE_UNAVAILABLE, initializeWithPrimaryRetry, abortableDelay
} = require("../server/startup-retry");

function unavailable(message = "Authoritative PostgreSQL database is unavailable") {
  return Object.assign(new Error(message), { code: PRIMARY_PROBE_UNAVAILABLE });
}

const isAbort = error => {
  assert.equal(error.name, "AbortError");
  assert.equal(error.code, "ABORT_ERR");
  return true;
};

test("startup retry returns the initializer result unchanged without waiting on success", async () => {
  const ready = { mode: "postgres-cluster" };
  const result = await initializeWithPrimaryRetry(async () => ready, {
    sleep: async () => assert.fail("successful startup cannot sleep"),
    onRetry: () => assert.fail("successful startup cannot report a retry")
  });
  assert.equal(result, ready);
  assert.equal(PRIMARY_PROBE_UNAVAILABLE, "PPR_PRIMARY_PROBE_UNAVAILABLE");
});

test("only primary-probe error codes are retried and the configured signal reaches sleep", async () => {
  const controller = new AbortController();
  const waits = [];
  let calls = 0, retries = 0;
  const ready = { mode: "postgres-cluster" };
  const result = await initializeWithPrimaryRetry(async () => {
    calls += 1;
    if (calls < 3) throw unavailable();
    return ready;
  }, {
    attempts: 4, delayMs: 17, signal: controller.signal,
    sleep: async (...args) => { waits.push(args); },
    onRetry: () => { retries += 1; }
  });
  assert.equal(result, ready);
  assert.equal(calls, 3);
  assert.equal(retries, 2);
  assert.deepEqual(waits, [[17, controller.signal], [17, controller.signal]]);
});

test("same-message errors and other connection codes fail immediately", async () => {
  for (const failure of [
    new Error("Authoritative PostgreSQL database is unavailable"),
    new Error(PRIMARY_PROBE_UNAVAILABLE),
    Object.assign(new Error("connection refused"), { code: "ECONNREFUSED" }),
    Object.assign(new Error("similar marker"), { code: `${PRIMARY_PROBE_UNAVAILABLE} ` })
  ]) {
    let calls = 0;
    await assert.rejects(initializeWithPrimaryRetry(async () => { calls += 1; throw failure; }, {
      sleep: async () => assert.fail("unmarked failures must not sleep"),
      onRetry: () => assert.fail("unmarked failures must not be retried")
    }), error => error === failure);
    assert.equal(calls, 1);
  }
});

test("bounded retries preserve the final failure and never sleep after the terminal attempt", async () => {
  const failures = [unavailable("first"), unavailable("second"), unavailable("last")];
  let calls = 0, waits = 0, retries = 0;
  await assert.rejects(initializeWithPrimaryRetry(async () => { throw failures[calls++]; }, {
    attempts: 3, delayMs: 0,
    sleep: async () => { waits += 1; },
    onRetry: () => { retries += 1; }
  }), error => error === failures[2]);
  assert.equal(calls, 3);
  assert.equal(waits, 2);
  assert.equal(retries, 2);
});

test("default startup retry bounds are twelve attempts and five-second requested waits", async () => {
  let calls = 0;
  const waits = [];
  const failure = unavailable();
  await assert.rejects(initializeWithPrimaryRetry(async () => { calls += 1; throw failure; }, {
    sleep: async delay => { waits.push(delay); }
  }), error => error === failure);
  assert.equal(calls, 12);
  assert.deepEqual(waits, Array(11).fill(5000));
});

test("invalid retry limits fail before initialization", async () => {
  const invalid = [
    ...[0, -1, 21, 1.5, NaN, "2"].map(attempts => ({ attempts })),
    ...[-1, 60001, NaN, "1"].map(delayMs => ({ delayMs }))
  ];
  for (const options of invalid) {
    await assert.rejects(initializeWithPrimaryRetry(async () => assert.fail("invalid options cannot initialize"), {
      ...options, sleep: async () => assert.fail("invalid options cannot wait")
    }), Error);
  }
  for (const options of [{ attempts: 1, delayMs: 0 }, { attempts: 20, delayMs: 60000 }]) {
    assert.equal(await initializeWithPrimaryRetry(async () => "ready", options), "ready");
  }
});

test("an already-aborted startup signal prevents even the first initialization", async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(initializeWithPrimaryRetry(async () => assert.fail("aborted startup cannot initialize"), {
    signal: controller.signal, sleep: async () => assert.fail("aborted startup cannot sleep")
  }), isAbort);
});

test("aborting during retry sleep prevents the next initialization even when injected sleep resolves", async () => {
  const controller = new AbortController();
  let calls = 0;
  await assert.rejects(initializeWithPrimaryRetry(async () => { calls += 1; throw unavailable(); }, {
    signal: controller.signal,
    sleep: async (_delay, signal) => {
      assert.equal(signal, controller.signal);
      controller.abort();
    }
  }), isAbort);
  assert.equal(calls, 1);
});

test("a shutdown during successful initialization prevents the startup success continuation", async () => {
  const controller = new AbortController();
  let finish;
  const pending = new Promise(resolve => { finish = resolve; });
  let continued = false;
  const result = initializeWithPrimaryRetry(() => pending, { signal: controller.signal })
    .then(() => { continued = true; });
  controller.abort();
  finish({ mode: "postgres-cluster" });
  await assert.rejects(result, isAbort);
  assert.equal(continued, false, "aborted initialization must not start port listeners");
});

test("abortable delay handles abort before or during waiting without a real long delay", async () => {
  const already = new AbortController();
  already.abort();
  await assert.rejects(abortableDelay(60000, already.signal), isAbort);
  const waiting = new AbortController();
  const delay = abortableDelay(60000, waiting.signal);
  waiting.abort();
  await assert.rejects(delay, isAbort);
  await abortableDelay(0);
});

const serverSource = fs.readFileSync(path.join(__dirname, "../server.js"), "utf8");
const initializerSource = serverSource.match(/async function initializeStorage\(\) \{[\s\S]*?\n\}/)?.[0];
const { createPostgresCluster } = require("../server/postgres-cluster");

function isolatedInitializer({ failProbe, ddlError } = {}) {
  assert.ok(initializerSource, "server storage initializer must be present");
  const pools = [], queries = [];
  class FakePool extends EventEmitter {
    constructor() { super(); this.ends = 0; pools.push(this); }
    async query(sql) {
      queries.push(sql);
      if (sql === "SELECT now()") {
        if (failProbe) throw new Error("temporary probe connection failure");
        return { rows: [{ now: new Date() }] };
      }
      if (String(sql).includes("state_revision::text")) return { rows: [] };
      if (ddlError) throw ddlError;
      assert.fail("unavailable primary probe must not reach schema initialization");
    }
    async end() { this.ends += 1; }
  }
  const context = {
    process: { env: { DATABASE_URL: "postgres://startup-test.invalid/test" } },
    storageStatus: { mode: "json" }, postgresClusterStatus: null,
    createPostgresCluster,
    console: { warn() {}, error() {} },
    require(name) {
      if (name === "pg") return { Pool: FakePool };
      if (name === "./multi-postgres") return multiPostgres;
      throw new Error(`Unexpected initializer dependency: ${name}`);
    }
  };
  return { initialize: vm.runInNewContext(`(${initializerSource})`, context), pools, queries };
}

test("server marks only the failed primary probe and closes it before any DDL is attempted", async () => {
  const isolated = isolatedInitializer({ failProbe: true });
  await assert.rejects(isolated.initialize(), error => {
    assert.equal(error.code, PRIMARY_PROBE_UNAVAILABLE);
    return true;
  });
  assert.deepEqual(isolated.queries, ["SELECT now()"]);
  assert.deepEqual(isolated.pools.map(pool => pool.ends), [1]);
  assert.ok(initializerSource.indexOf("createPostgresCluster") < initializerSource.indexOf("CREATE TABLE"));
});

test("schema errors after a successful probe do not receive the startup retry marker", async () => {
  const failure = new Error("Authoritative PostgreSQL database is unavailable");
  const isolated = isolatedInitializer({ ddlError: failure });
  await assert.rejects(isolated.initialize(), error => error === failure && error.code !== PRIMARY_PROBE_UNAVAILABLE);
  assert.equal(isolated.queries[0], "SELECT now()");
  assert.match(isolated.queries[1], /state_revision::text/);
  assert.match(isolated.queries[2], /CREATE TABLE/);
});

test("automatic monitoring and backup timers remain idle until storage is ready", async () => {
  for (const [timerName, operation] of [
    ["systemMonitorTimer", "refreshSystemMonitoring"],
    ["automaticBackupTimer", "runAutomaticBackupIfDue"]
  ]) {
    const timerSource = serverSource.match(new RegExp(`const ${timerName} = setInterval\\(\\(\\) => \\{([\\s\\S]*?)\\n\\},`));
    assert.ok(timerSource, `${timerName} callback must be present`);
    let calls = 0;
    const context = {
      storageReady: false,
      [operation]: async () => { calls += 1; },
      console: { warn() {} }
    };
    const callback = vm.runInNewContext(`(() => { ${timerSource[1]} })`, context);
    callback();
    assert.equal(calls, 0, `${operation} ran before storage initialization`);
    context.storageReady = true;
    callback();
    assert.equal(calls, 1, `${operation} did not resume after initialization`);
  }
});
