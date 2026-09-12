"use strict";

// Keep only credentials and the original authorization identity on a stream;
// never retain its HTTP request, transaction view or full working-state snapshot.
function createRealtimeAuth({ readState, readAuthSnapshot, authenticatedUser, onError = () => {} }) {
  const identity = user => JSON.stringify([user.id, user.role, user.roleUpdatedAt || ""]);
  function capture(req, user) {
    if (!user) return null;
    return { request: { headers: { cookie: req.headers.cookie || "", "x-test-user-id": req.headers["x-test-user-id"] || "" } }, identity: identity(user) };
  }
  async function authenticate(req) {
    try { return capture(req, authenticatedUser(req, await readAuthSnapshot())); }
    catch (error) { onError(error); return null; }
  }
  function validator() {
    let authState, loaded = false;
    // One committed projection per broadcast/heartbeat, shared across clients.
    // Session expiry is still evaluated by authenticatedUser at each delivery.
    return client => {
      if (!client.pprAuth) return false;
      if (!loaded) {
        loaded = true;
        try {
          const state = readState();
          authState = { users: state.users || [], authSessions: state.authSessions || [] };
        } catch (error) { onError(error); }
      }
      if (!authState) return false;
      try {
        const user = authenticatedUser(client.pprAuth.request, authState);
        return Boolean(user && identity(user) === client.pprAuth.identity);
      } catch (error) { onError(error); return false; }
    };
  }
  return { capture, authenticate, validator };
}

module.exports = { createRealtimeAuth };
