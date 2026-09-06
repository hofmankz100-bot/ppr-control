"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { setImmediate: nextTurn } = require("node:timers/promises");
const { createPostgresTestPool } = require("../tools/testing/postgres-test-pool");

test("sandbox teardown waits for every client end after pg-pool ends early", async () => {
  class EarlyEndingPool extends EventEmitter {
    endCalls = 0;
    async end() { this.endCalls += 1; }
  }
  const tracked = createPostgresTestPool({}, EarlyEndingPool);
  const first = new EventEmitter();
  const second = new EventEmitter();
  const alreadyClosed = new EventEmitter();
  for (const client of [first, second, alreadyClosed]) tracked.pool.emit("connect", client);
  alreadyClosed.emit("end");
  let databaseDropped = false;
  const closing = tracked.close();
  closing.then(() => { databaseDropped = true; });
  assert.equal(tracked.close(), closing, "Repeated cleanup must share the same close operation");
  await nextTurn();
  assert.equal(tracked.pool.endCalls, 1);
  assert.equal(databaseDropped, false, "Resolved Pool.end does not mean every TCP connection has closed");
  first.emit("end");
  await nextTurn();
  assert.equal(databaseDropped, false);
  second.emit("end");
  await closing;
  assert.equal(databaseDropped, true);
});

test("pool shutdown errors are propagated without hiding pool error events", async () => {
  const failure = new Error("deliberate pool shutdown failure");
  class FailingPool extends EventEmitter { async end() { throw failure; } }
  const tracked = createPostgresTestPool({}, FailingPool);
  await assert.rejects(tracked.close(), error => error === failure);
  assert.throws(() => tracked.pool.emit("error", failure), error => error === failure);
});
