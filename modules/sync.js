(function () {
  const root = window.PPRModules ||= {};
  const clone = value => JSON.parse(JSON.stringify(value ?? null));
  let baseline = null;
  const objectPatch = (before = {}, after = {}) => {
    const patch = {};
    const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
    keys.forEach(key => {
      if (JSON.stringify(before?.[key]) !== JSON.stringify(after?.[key])) {
        patch[key] = after?.[key] === undefined ? { id: key, deleted: true, updatedAt: new Date().toISOString() } : clone(after[key]);
      }
    });
    return patch;
  };
  const arrayPatch = (before = [], after = []) => {
    const oldMap = new Map((before || []).filter(item => item?.id).map(item => [item.id, item]));
    return (after || []).filter(item => item?.id && JSON.stringify(oldMap.get(item.id)) !== JSON.stringify(item)).map(clone);
  };
  root.sync = {
    seed(state) {
      baseline = clone(state);
    },
    diff(state) {
      const before = baseline || {};
      const patch = {
        checks: objectPatch(before.checks, state.checks),
        requests: objectPatch(before.requests, state.requests),
        inventory: objectPatch(before.inventory, state.inventory),
        catalog: { equipment: objectPatch(before.catalog?.equipment, state.catalog?.equipment) },
        directorMessages: arrayPatch(before.directorMessages, state.directorMessages),
        downtimes: arrayPatch(before.downtimes, state.downtimes),
        compressorJournal: objectPatch(before.compressorJournal, state.compressorJournal),
        gasJournal: objectPatch(before.gasJournal, state.gasJournal),
        journalDueSince: objectPatch(before.journalDueSince, state.journalDueSince),
        auditHistory: arrayPatch(before.auditHistory, state.auditHistory)
      };
      baseline = clone(state);
      return patch;
    },
    hasChanges(patch) {
      return Object.entries(patch || {}).some(([key, value]) => key === "catalog"
        ? Object.keys(value?.equipment || {}).length > 0
        : Array.isArray(value) ? value.length > 0 : Object.keys(value || {}).length > 0);
    },
    clone
  };
})();
