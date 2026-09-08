"use strict";

// Only complete snapshots from the same authoritative revision history belong
// here. A higher revision replaces a pending snapshot, never an active write.
function createLatestMirrorQueue({ write, onError = () => {} }) {
  let active = null;
  let pending = null;
  let requested = -1n;
  let completed = -1n;
  let paused = false;
  let available = true;
  let lastError = null;

  function start() {
    if (active || paused || !available || !pending) return;
    const job = { snapshot: pending, promise: null };
    pending = null;
    active = job;
    job.promise = Promise.resolve().then(() => write(job.snapshot)).then(() => {
      completed = job.snapshot.revision;
    }, error => {
      lastError = error;
      paused = true;
      // Retain the failed full snapshot unless a newer complete one is waiting.
      if (!pending || pending.revision < job.snapshot.revision) pending = job.snapshot;
      onError(error);
    }).finally(() => {
      job.snapshot = null;
      active = null;
      start();
    });
    // Errors are exposed by flush and onError; background jobs must not create
    // an unhandled rejection if an observer itself throws.
    job.promise.catch(() => {});
  }

  return {
    enqueue(snapshot, healthy = true) {
      available = healthy;
      if (snapshot.revision <= requested) return;
      requested = snapshot.revision;
      pending = snapshot;
      start();
    },
    async pause() {
      paused = true;
      if (active) await active.promise;
    },
    resume() {
      paused = false;
      available = true;
      lastError = null;
      start();
    },
    async flush() {
      const watermark = requested;
      while (completed < watermark) {
        if (!active) throw lastError || Object.assign(new Error("PostgreSQL mirror is unavailable with a pending snapshot"), { code: "PPR_MIRROR_PENDING" });
        await active.promise;
      }
      return { revision: completed.toString() };
    },
    status: () => ({
      activeRevision: active?.snapshot?.revision?.toString() ?? null,
      pendingRevision: pending?.revision?.toString() ?? null,
      completedRevision: completed.toString()
    })
  };
}

module.exports = { createLatestMirrorQueue };
