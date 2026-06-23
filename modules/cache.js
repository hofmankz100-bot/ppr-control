(function () {
  const root = window.PPRModules ||= {};
  const DB_NAME = "ppr-control-local-v1";
  const DB_VERSION = 1;
  const openDb = () => new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) return reject(new Error("IndexedDB unavailable"));
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("kv")) db.createObjectStore("kv");
      if (!db.objectStoreNames.contains("queue")) db.createObjectStore("queue", { keyPath: "id" });
      if (!db.objectStoreNames.contains("photos")) db.createObjectStore("photos");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const transaction = async (storeName, mode, work) => {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      let result;
      try { result = work(store); } catch (error) { reject(error); return; }
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
    }).finally(() => db.close());
  };
  root.cache = {
    async get(key) {
      const db = await openDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction("kv", "readonly");
        const req = tx.objectStore("kv").get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => db.close();
      });
    },
    set(key, value) {
      return transaction("kv", "readwrite", store => store.put(value, key));
    },
    async queueList() {
      const db = await openDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction("queue", "readonly");
        const req = tx.objectStore("queue").getAll();
        req.onsuccess = () => resolve((req.result || []).sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => db.close();
      });
    },
    queuePut(item) {
      return transaction("queue", "readwrite", store => store.put(item));
    },
    queueDelete(id) {
      return transaction("queue", "readwrite", store => store.delete(id));
    },
    photoPut(id, value) {
      return transaction("photos", "readwrite", store => store.put(value, id));
    },
    async photoGet(id) {
      const db = await openDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction("photos", "readonly");
        const req = tx.objectStore("photos").get(id);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => db.close();
      });
    }
  };
})();
