(function (root, factory) {
  const policy = factory();
  if (typeof module === "object" && module.exports) module.exports = policy;
  else root.PprDeviceCachePolicy = policy;
})(typeof window === "object" ? window : globalThis, function () {
  function timestamp(item = {}) {
    return Math.max(0, ...[item.updatedAt, item.deletedAt, item.endedAt, item.at, item.startedAt, item.createdAt]
      .map(value => Date.parse(value || "")).filter(Number.isFinite));
  }

  function newest(items) {
    return (Array.isArray(items) ? items : []).filter(Boolean).slice().sort((a, b) => timestamp(b) - timestamp(a));
  }

  function selectDowntimes(items, closedLimit = 200) {
    let closed = 0;
    return newest(items).filter(item => {
      // Keep active work and deletion markers regardless of their age. Dropping
      // a tombstone can revive an old local record when snapshots are merged.
      if (item.deleted || item.clearAll || !item.endedAt) return true;
      return closed++ < closedLimit;
    });
  }

  function hasOpenRemark(record = {}) {
    const item = record.to || {};
    return (Array.isArray(item.commentLog) ? item.commentLog : []).some(entry =>
      entry && !entry.resolved && !entry.closedWithoutScore && !entry.deleted
      && String(entry.text || entry.photo || "").trim()
    ) || (!item.resolved && Boolean(String(item.comment || item.commentPhoto || item.nodeDraftText || "").trim()));
  }

  function selectChecks(checks = {}, recentLimit = 500) {
    let recent = 0;
    const entries = Object.entries(checks).sort(([leftKey, left], [rightKey, right]) => {
      const time = (key, record) => Math.max(timestamp(record), timestamp(record?.to), Date.parse(key.split(":").at(-1)) || 0);
      return time(rightKey, right) - time(leftKey, left);
    });
    return Object.fromEntries(entries.filter(([, record]) => hasOpenRemark(record) || recent++ < recentLimit));
  }

  function canRestoreCachedProfile(user) {
    return Boolean(user && (user.id || user.employeeId) && user.name && user.role
      && user.approved !== false && !user.pendingApproval && !user.registrationPending);
  }

  function isSessionRejected(error) {
    return [401, 403].includes(Number(error?.status));
  }

  function queueItemOwnedBy(item, user) {
    if (!item || !user) return false;
    if (item.ownerId) return String(item.ownerId) === String(user.id || "");
    return Boolean(item.ownerEmployeeId && String(item.ownerEmployeeId) === String(user.employeeId || ""));
  }

  function createPendingStateOwner(storage, key) {
    const ownerKey = `${key}-pending-owner-v1`, legacyKey = `${key}-pending-legacy-profile-v1`;
    const read = item => { try { return JSON.parse(storage.getItem(item) || "null"); } catch { return null; } };
    const pending = () => storage.getItem(`${key}-pending`) === "1";
    const identity = user => ({ ownerId: user?.id || "", ownerEmployeeId: user?.employeeId || "", ownerName: user?.name || "" });
    const hasIdentity = item => Boolean(item && (String(item.ownerId || "").trim() || String(item.ownerEmployeeId || "").trim()));
    const captureLegacy = user => {
      if (pending() && !hasIdentity(read(ownerKey)) && !hasIdentity(read(legacyKey)) && canRestoreCachedProfile(user)) storage.setItem(legacyKey, JSON.stringify(identity(user)));
    };
    return {
      owner: () => {
        const owner = read(ownerKey), legacy = read(legacyKey);
        return hasIdentity(owner) ? owner : hasIdentity(legacy) ? legacy : null;
      },
      captureLegacy,
      reconcile(user, stored) {
        captureLegacy(stored);
        const owner = read(ownerKey);
        const legacy = read(legacyKey);
        if (pending() && !hasIdentity(owner) && queueItemOwnedBy(legacy, user)) storage.setItem(ownerKey, JSON.stringify(identity(user)));
        const resolvedOwner = read(ownerKey);
        const knownOwner = hasIdentity(resolvedOwner) ? resolvedOwner : null;
        const knownLegacy = hasIdentity(legacy) ? legacy : null;
        return !pending() || (!knownOwner && !knownLegacy) || queueItemOwnedBy(knownOwner, user);
      },
      owns: user => !pending() || queueItemOwnedBy(read(ownerKey), user),
      mark(user) {
        if (!pending() && canRestoreCachedProfile(user)) storage.setItem(ownerKey, JSON.stringify(identity(user)));
        storage.setItem(`${key}-pending`, "1");
      },
      clear() { storage.removeItem(`${key}-pending`); storage.removeItem(ownerKey); storage.removeItem(legacyKey); }
    };
  }

  function createQueueFlusher({ read, write, send, canSend, canSendItem = () => true, identity, discard, settled = () => {}, schedule = setTimeout, cancel = clearTimeout }) {
    let inFlight = null;
    let retryTimer = null;
    function flush() {
      if (inFlight || !canSend()) return inFlight;
      cancel(retryTimer);
      retryTimer = null;
      inFlight = (async () => {
        while (canSend()) {
          const item = read().find(canSendItem);
          if (!item) break;
          try { await send(item); }
          catch (error) { if (!discard(error)) break; }
          // Read again after awaiting the server: another scan may have appended
          // work. Never overwrite that live queue with an earlier snapshot.
          write(read().filter(candidate => identity(candidate) !== identity(item)));
        }
      })().finally(() => {
        inFlight = null;
        settled();
        // Reconnect can happen while a failed request is still settling. That
        // online event sees inFlight, so completion must arrange another drain.
        if (canSend() && read().some(canSendItem)) retryTimer = schedule(flush, 1500);
      });
      return inFlight;
    }
    return flush;
  }

  return Object.freeze({ selectDowntimes, selectChecks, selectAudit: (items, limit = 200) => newest(items).slice(0, limit), canRestoreCachedProfile, isSessionRejected, queueItemOwnedBy, createPendingStateOwner, createQueueFlusher });
});
