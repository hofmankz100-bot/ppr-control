"use strict";

function createApiDispatcher({ stateTransactions, handleApiTransaction, readBody, enqueueStateWrite, sendJson, getPostgresStateStore = () => null, readDbFile = () => ({}) }) {
  async function readPhotoAuthSnapshot() {
    const store = getPostgresStateStore();
    if (store) return store.authSnapshot();
    const { users, authSessions } = readDbFile();
    return { users, authSessions };
  }

  async function readAttendanceSnapshot() {
    const store = getPostgresStateStore();
    if (store) return store.attendanceSnapshot();
    const { users, authSessions, attendanceSessions, attendanceConfig } = readDbFile();
    return { users, authSessions, attendanceSessions, attendanceConfig };
  }

  return async function handleApi(req, res, pathname, url) {
    if (pathname === "/api/health") return handleApiTransaction(req, res, pathname, url);
    if (req.method === "GET" && pathname.startsWith("/api/photos/")) {
      // Every photo still passes the regular session check, including disk hits.
      // Parallel images must not each retain a clone of the full working database.
      return stateTransactions.view(() => handleApiTransaction(req, res, pathname, url), { snapshot: readPhotoAuthSnapshot });
    }
    if (req.method === "GET" && ["/api/state", "/api/changes", "/api/events", "/api/auth/session", "/api/users"].includes(pathname)) {
      // These routes only need fresh authorization; /api/state serves the
      // separately cached committed payload. Avoid cloning all working records
      // for every 30-second session/users poll and reconnect handshake.
      return stateTransactions.view(() => handleApiTransaction(req, res, pathname, url), { snapshot: readPhotoAuthSnapshot });
    }
    if (req.method === "GET" && ["/api/attendance/status", "/api/attendance/qr"].includes(pathname)) {
      return stateTransactions.view(() => handleApiTransaction(req, res, pathname, url), { snapshot: readAttendanceSnapshot });
    }
    if (pathname === "/api/translate") {
      // External translation can take minutes; it must not occupy QR/read slots.
      return stateTransactions.view(() => handleApiTransaction(req, res, pathname, url), { lane: "translation" });
    }
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      return stateTransactions.view(() => handleApiTransaction(req, res, pathname, url));
    }
    // Network uploads must finish before holding the shared PostgreSQL state lock.
    let body;
    try { body = await readBody(req); }
    catch {
      sendJson(res, 400, { ok: false, error: "Повреждённый запрос. Обновите приложение и повторите отправку.", code: "invalid_json_encoding" });
      return true;
    }
    return enqueueStateWrite(() => handleApiTransaction(req, res, pathname, url));
  };
}

module.exports = { createApiDispatcher };
