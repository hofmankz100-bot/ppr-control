"use strict";

const PRIMARY_PROBE_UNAVAILABLE = "PPR_PRIMARY_PROBE_UNAVAILABLE";

function startupAborted() {
  const error = new Error("Server startup was aborted");
  error.name = "AbortError";
  error.code = "ABORT_ERR";
  return error;
}

function assertNotAborted(signal) {
  if (signal?.aborted) throw startupAborted();
}

function abortableDelay(delayMs, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(startupAborted()); return; }
    const cleanup = () => signal?.removeEventListener("abort", aborted);
    const timer = setTimeout(() => { cleanup(); resolve(); }, delayMs);
    function aborted() {
      clearTimeout(timer);
      cleanup();
      reject(startupAborted());
    }
    signal?.addEventListener("abort", aborted, { once: true });
  });
}

// Only the marker from the initial, cleaned-up primary probe is retryable.
// Schema changes, state validation, migrations and uncertain commits fail once.
async function initializeWithPrimaryRetry(initialize, {
  attempts = 12, delayMs = 5000, signal, onRetry = () => {}, sleep = abortableDelay
} = {}) {
  if (typeof initialize !== "function") throw new TypeError("Storage initializer must be a function");
  if (!Number.isSafeInteger(attempts) || attempts < 1 || attempts > 20) throw new RangeError("Startup attempts must be between 1 and 20");
  if (!Number.isSafeInteger(delayMs) || delayMs < 0 || delayMs > 60000) throw new RangeError("Startup delay must be between 0 and 60000 ms");
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    assertNotAborted(signal);
    try {
      const storage = await initialize();
      assertNotAborted(signal);
      return storage;
    } catch (error) {
      assertNotAborted(signal);
      if (error?.code !== PRIMARY_PROBE_UNAVAILABLE || attempt === attempts) throw error;
      onRetry({ attempt, attempts, delayMs });
      await sleep(delayMs, signal);
    }
  }
}

module.exports = { PRIMARY_PROBE_UNAVAILABLE, abortableDelay, initializeWithPrimaryRetry };
