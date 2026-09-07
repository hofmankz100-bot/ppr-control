"use strict";

const { AsyncLocalStorage } = require("node:async_hooks");
const { createReadLimiter } = require("./read-limiter");

function createStateTransactions({ begin, committed, snapshot = committed, publish, onEffectError = () => {}, onTransactionError = () => {} }) {
  const context = new AsyncLocalStorage();
  let queue = Promise.resolve();
  // A full state clone is large. On a 512 MB Render instance, serializing two
  // such readers at once can cross the memory ceiling and cause a 502 restart.
  const limitReads = createReadLimiter(1, 64);
  const limitTranslations = createReadLimiter(1, 8);

  function current() {
    const transaction = context.getStore();
    return transaction?.open ? transaction : null;
  }

  function run(task) {
    const parent = current();
    if (parent && !parent.readOnly) return Promise.resolve().then(task);
    const next = queue.then(async () => {
      let session;
      try { session = await begin(); } catch (error) { onTransactionError(error); throw error; }
      const transaction = { baseline: session.state, state: structuredClone(session.state), dirty: false, open: true, effects: [] };
      try {
        const result = await context.run(transaction, task);
        // The transaction owns its draft exclusively after task completion. Pass
        // that object through commit/publish instead of allocating another full
        // database clone at the hottest point of every write.
        const snapshot = transaction.dirty ? transaction.state : session.state;
        transaction.open = false;
        const committed = await session.commit(transaction.dirty ? snapshot : null);
        transaction.superseded = Boolean(committed?.superseded);
        if (!transaction.superseded) publish(snapshot, { changed: transaction.dirty });
        if (parent?.readOnly) parent.state = structuredClone(transaction.superseded ? committed.latestState : snapshot);
        for (const { effect, critical } of transaction.effects) {
          if (critical) await effect();
          else try { Promise.resolve(effect()).catch(onEffectError); } catch (error) { onEffectError(error); }
        }
        return result;
      } catch (error) {
        transaction.open = false;
        try { await session.rollback(); } catch (rollbackError) { onEffectError(rollbackError); }
        onTransactionError(error);
        throw error;
      } finally {
        transaction.open = false;
        transaction.baseline = null;
        transaction.state = null;
        transaction.effects = [];
        await session.release?.();
      }
    });
    queue = next.catch(() => {});
    return next;
  }

  return {
    run,
    async view(task, { snapshot: readSnapshot = snapshot, lane = "read" } = {}) {
      if (current()) return task();
      const limit = lane === "translation" ? limitTranslations : limitReads;
      return limit(async () => {
        let state;
        try { state = await readSnapshot(); } catch (error) { onTransactionError(error); throw error; }
        const view = { state: structuredClone(state), open: true, readOnly: true };
        state = null;
        try { return await context.run(view, task); }
        finally {
          view.open = false;
          // Socket listeners/timers inherit AsyncLocalStorage; do not let them
          // retain an obsolete full snapshot after the HTTP handler completes.
          view.state = null;
        }
      });
    },
    current,
    read: () => current()?.state || structuredClone(committed()),
    baseline: () => current()?.baseline || committed(),
    stage(state) {
      const transaction = current();
      if (!transaction || transaction.readOnly) throw new Error("State writes require an active transaction");
      transaction.state = state;
      transaction.dirty = true;
    },
    defer(effect, { critical = false } = {}) {
      const transaction = current();
      if (!transaction || transaction.readOnly) return false;
      transaction.effects.push({ effect, critical });
      return true;
    },
    idle: () => current() ? Promise.resolve() : queue
  };
}

module.exports = { createStateTransactions };
