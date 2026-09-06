"use strict";

function createApiDispatcher({ stateTransactions, handleApiTransaction, readBody, enqueueStateWrite, getPostgresStateStore, readDbFile }) {
  async function readPhotoAuthSnapshot() {
    const store = getPostgresStateStore();
    if (store) return store.authSnapshot();
    const { users, authSessions } = readDbFile();
    return { users, authSessions };
  }

  return async function handleApi(req, res, pathname, url) {
    if (pathname === "/api/health") return handleApiTransaction(req, res, pathname, url);
    if (req.method === "GET" && pathname.startsWith("/api/photos/")) {
      // Every photo still passes the regular session check, including disk hits.
      // Parallel images must not each retain a clone of the full working database.
      return stateTransactions.view(() => handleApiTransaction(req, res, pathname, url), { snapshot: readPhotoAuthSnapshot });
    }
    if (["GET", "HEAD", "OPTIONS"].includes(req.method) || pathname === "/api/translate") {
      return stateTransactions.view(() => handleApiTransaction(req, res, pathname, url));
    }
    // Network uploads must finish before holding the shared PostgreSQL state lock.
    await readBody(req).catch(() => {});
    return enqueueStateWrite(() => handleApiTransaction(req, res, pathname, url));
  };
}

module.exports = { createApiDispatcher };
