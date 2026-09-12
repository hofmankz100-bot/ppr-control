"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "../server.js"), "utf8");
const implementation = source.slice(source.indexOf("function createManualBackup("), source.indexOf("function backupChecksum("));

function harness({ failWrite = false } = {}) {
  const current = { checks: { saved: { text: "Актуальная запись — қазақша" } }, pprWorkTemplates: { kept: { works: ["Осмотр"] } } };
  const files = new Map([["/data/db.json", JSON.stringify({ checks: {} })]]);
  const events = [];
  let counter = 0;
  const context = vm.createContext({
    readDb: () => current, backupDir: "/data/backups", path: path.posix,
    safeFileName: () => "manual", crypto: { randomBytes: () => ({ toString: () => String(++counter) }) },
    pruneOldBackups: () => events.push("prune"),
    fs: {
      mkdirSync() {},
      openSync(file, flags, mode) { assert.equal(flags, "wx"); assert.equal(mode, 0o600); assert.ok(!files.has(file)); files.set(file, ""); return file; },
      writeFileSync(file, contents) { if (failWrite) throw Error("disk full"); files.set(file, contents); },
      fsyncSync() { events.push("fsync"); }, closeSync() { events.push("close"); },
      renameSync(from, to) { events.push("publish"); files.set(to, files.get(from)); files.delete(from); },
      unlinkSync(file) { files.delete(file); }
    }
  });
  vm.runInContext(implementation, context);
  return { current, files, events, save: snapshot => context.createManualBackup("manual", snapshot) };
}

test("manual backup contains current state when the local PostgreSQL mirror is stale", () => {
  const h = harness(), before = JSON.stringify(h.current);
  const file = h.save();
  assert.deepEqual(JSON.parse(h.files.get(file)), h.current);
  assert.equal(JSON.stringify(h.current), before);
  assert.deepEqual(JSON.parse(h.files.get("/data/db.json")), { checks: {} });
  assert.deepEqual(h.events, ["fsync", "close", "publish", "prune"]);
});

test("admin backup file uses the same explicit snapshot as its checksum and PostgreSQL payload", () => {
  const h = harness(), explicit = { checks: { beforeChange: { text: "Снимок до операции" } } };
  const file = h.save(explicit);
  assert.deepEqual(JSON.parse(h.files.get(file)), explicit);
  assert.match(source, /createManualBackup\(automatic \? `automatic_\$\{cleanLabel\}` : cleanLabel, payload\)/);
  assert.notEqual(file, h.save(explicit), "copies cannot overwrite each other within the same millisecond");
});

test("failed write is not published as a valid backup and leaves prior copies untouched", () => {
  const h = harness({ failWrite: true });
  h.files.set("/data/backups/old.json", "old backup");
  assert.throws(() => h.save(), /disk full/);
  assert.deepEqual([...h.files.keys()], ["/data/db.json", "/data/backups/old.json"]);
  assert.equal(h.files.get("/data/backups/old.json"), "old backup");
  assert.deepEqual(h.events, ["close"]);
});
