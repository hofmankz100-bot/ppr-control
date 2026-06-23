(function () {
  const root = window.PPRModules ||= {};
  root.socket = {
    applyDelta(target, patch, mergeObject, mergeArray) {
      if (!patch) return target;
      target.checks = mergeObject(target.checks, patch.checks);
      target.requests = mergeObject(target.requests, patch.requests);
      target.inventory = mergeObject(target.inventory, patch.inventory);
      target.catalog ||= { equipment: {} };
      target.catalog.equipment = mergeObject(target.catalog.equipment, patch.catalog?.equipment);
      target.directorMessages = mergeArray(target.directorMessages, patch.directorMessages);
      target.downtimes = mergeArray(target.downtimes, patch.downtimes);
      target.compressorJournal = mergeObject(target.compressorJournal, patch.compressorJournal);
      target.gasJournal = mergeObject(target.gasJournal, patch.gasJournal);
      target.journalDueSince = { ...(target.journalDueSince || {}), ...(patch.journalDueSince || {}) };
      target.auditHistory = mergeArray(target.auditHistory, patch.auditHistory);
      return target;
    }
  };
})();
