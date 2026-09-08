"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { createLatestMirrorQueue } = require("../server/latest-mirror-queue");
const tick = () => new Promise(resolve => setImmediate(resolve));

function fixture({ failDuringPrepare = false } = {}) {
  let finishProbe, rejectWrite;
  let holdProbe = true;
  let online = false;
  let delivered = 0;
  let prepared = 0;
  let backups = 0;
  let photos = 0;
  let prepareError = null;
  let now = Date.now();
  class RecoveryDate extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  }
  const target = { name: "mirror", healthy: true, pool: {
    async query() { if (holdProbe) await new Promise(resolve => { finishProbe = resolve; }); return { rows: [] }; }
  } };
  const queue = createLatestMirrorQueue({
    async write() {
      delivered += 1;
      if (online) return;
      if (delivered === 1) await new Promise((resolve, reject) => { rejectWrite = reject; });
      else throw new Error("mirror failed after prepare resumed its queue");
    },
    onError() { target.healthy = false; }
  });
  const source = fs.readFileSync(path.join(__dirname, "../server.js"), "utf8")
    .match(/async function recoverPostgresReplicas\([^]*?\n\}/)[0];
  const context = vm.createContext({
    postgresPool: { nodes: [{ name: "primary", healthy: true, pool: { async query() { return { rows: [] }; } } }, target], status: () => ({}) },
    postgresStateStore: { async prepareMirror() {
      prepared += 1;
      if (prepareError) throw prepareError;
      if (!failDuringPrepare) online = true;
      queue.resume();
      // A resumed background delivery can fail before prepare's caller resumes.
      if (failDuringPrepare) await tick();
    } },
    storageStatus: { authoritative: "primary" }, postgresClusterStatus: null,
    compressLegacyBackupTables: async () => { backups += 1; },
    syncPostgresPhotos: async () => { photos += 1; },
    process: { env: {} }, Date: RecoveryDate
  });
  vm.runInContext(source, context);
  return {
    queue, target, recover: () => context.recoverPostgresReplicas(),
    get prepared() { return prepared; }, get delivered() { return delivered; },
    get backups() { return backups; }, get photos() { return photos; },
    failWrite: () => rejectWrite(new Error("mirror failed during successful health probe")),
    releaseProbe() { holdProbe = false; finishProbe(); },
    goOnline() { online = true; },
    setPrepareError(error) { prepareError = error; },
    advanceTime(milliseconds) { now += milliseconds; }
  };
}

test("actual recovery rechecks mirror health after an awaited successful probe and resumes the paused latest snapshot", async () => {
  const f = fixture();
  f.queue.enqueue({ revision: 1n, serializedState: "complete revision 1" });
  await tick();
  const recovery = f.recover();
  f.failWrite(); await tick();
  assert.equal(f.target.healthy, false);
  f.queue.enqueue({ revision: 2n, serializedState: "complete revision 2" }, false);
  f.releaseProbe(); await recovery; await f.queue.flush();
  assert.equal(f.prepared, 1);
  assert.equal(f.target.healthy, true);
  assert.equal(f.queue.status().completedRevision, "2");
  assert.equal(f.backups, 1);
  assert.equal(f.photos, 1, "the existing recovery body is triggered along with the fence/resume");
});

test("a fresh mirror failure during prepare is not overwritten by an older successful probe", async () => {
  const f = fixture({ failDuringPrepare: true });
  f.queue.enqueue({ revision: 1n, serializedState: "complete revision 1" });
  await tick();
  const recovery = f.recover();
  f.failWrite(); await tick();
  f.releaseProbe(); await recovery;
  assert.equal(f.prepared, 1);
  assert.equal(f.target.healthy, false, "the next cycle must still see the paused queue as unhealthy");
  await assert.rejects(f.queue.flush(), /failed after prepare/);
  f.queue.enqueue({ revision: 2n, serializedState: "complete revision 2" }, false);
  f.goOnline();
  await f.recover(); await f.queue.flush();
  assert.equal(f.prepared, 2);
  assert.equal(f.target.healthy, true);
  assert.equal(f.queue.status().completedRevision, "2");
});

test("failed preparation keeps recovery unhealthy, honors backoff, and resumes on the next eligible cycle", async () => {
  const f = fixture();
  f.queue.enqueue({ revision: 1n, serializedState: "complete revision 1" });
  await tick();
  const recovery = f.recover();
  f.failWrite(); await tick();
  f.setPrepareError(new Error("temporary fence connection failure"));
  f.releaseProbe(); await recovery;
  assert.equal(f.target.healthy, false);
  assert.equal(f.target.error, "temporary fence connection failure");
  assert.equal(f.target.recoveryFailures, 1);
  assert.ok(f.target.nextRecoveryAt);
  await assert.rejects(f.queue.flush());
  f.queue.enqueue({ revision: 2n, serializedState: "complete revision 2" }, false);
  f.setPrepareError(null); f.goOnline();
  await f.recover();
  assert.equal(f.prepared, 1, "unhealthy replica is not retried before its existing backoff expires");
  f.advanceTime(31000);
  await f.recover(); await f.queue.flush();
  assert.equal(f.prepared, 2);
  assert.equal(f.target.healthy, true);
  assert.equal(f.target.error, "");
  assert.equal(f.target.nextRecoveryAt, "");
  assert.equal(f.queue.status().completedRevision, "2");
});
