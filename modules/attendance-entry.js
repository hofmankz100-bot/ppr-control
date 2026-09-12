(function () {
  const root = window.PPRModules ||= {};
  const EVENT_KEY = "ppr-attendance-updated-v1";
  let channel = null;

  function attendanceChannel() {
    if (!("BroadcastChannel" in window)) return null;
    channel ||= new BroadcastChannel("ppr-attendance");
    return channel;
  }

  function announce(session = {}) {
    const event = { at: Date.now(), expiresAt: String(session.expiresAt || "") };
    try { localStorage.setItem(EVENT_KEY, JSON.stringify(event)); } catch {}
    try { attendanceChannel()?.postMessage(event); } catch {}
  }

  function listen(refresh) {
    if (typeof refresh !== "function") return;
    window.addEventListener("storage", event => {
      if (event.key === EVENT_KEY) refresh();
    });
    const activeChannel = attendanceChannel();
    if (activeChannel) activeChannel.addEventListener("message", refresh);
  }

  function closeScanWindow(onBlocked) {
    window.close();
    window.setTimeout(() => {
      if (!window.closed && typeof onBlocked === "function") onBlocked();
    }, 120);
  }

  root.attendanceEntry = { announce, listen, closeScanWindow };
})();
