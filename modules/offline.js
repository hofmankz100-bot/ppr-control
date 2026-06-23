(function () {
  const root = window.PPRModules ||= {};
  root.offline = {
    async enqueue(patch, meta = {}) {
      const item = {
        id: meta.actionId || `op:${Date.now()}:${Math.random().toString(16).slice(2)}`,
        type: "delta",
        patch,
        meta,
        createdAt: new Date().toISOString()
      };
      await root.cache.queuePut(item);
      return item;
    },
    list() {
      return root.cache.queueList();
    },
    remove(id) {
      return root.cache.queueDelete(id);
    }
  };
})();
