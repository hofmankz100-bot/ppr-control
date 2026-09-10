const CACHE_NAME = "ppr-v789-server-recovery-1-hotfix1";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.min.css?v=v789-server-recovery-1",
  "./modules/compressor.js?v=327-ppr-autofill-refresh",
  "./modules/shgrp.js?v=327-ppr-autofill-refresh",
  "./modules/receiver.js?v=288-print-request-pages",
  "./modules/comments.js?v=288-print-request-pages",
  "./modules/director.js?v=288-print-request-pages",
  "./modules/print-assets.js?v=v789-server-recovery-1",
  "./modules/device-cache-policy.js?v=v789-server-recovery-1",
  "./modules/production-work-ui.js?v=v789-server-recovery-1",
  "./modules/production-work-ui.css?v=v789-server-recovery-1",
  "./modules/mobile-dialogs.css?v=v789-server-recovery-1",
  "./app.min.js?v=v789-server-recovery-1",
  "./node_modules/jsqr/dist/jsQR.js?v=v789-server-recovery-1",
  "./manifest.json",
  "./icon.svg",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png"
  ,"./hoffmann-logo.png"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(event.request).catch(() => new Response(JSON.stringify({ ok: false, offline: true }), {
      status: 503,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
    })));
    return;
  }
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (!response) throw new Error("empty response");
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        if (event.request.mode === "navigate") {
          const index = await caches.match("./index.html") || await caches.match("./");
          if (index) return index;
        }
        return new Response("ППР временно недоступен. Проверьте сеть и обновите страницу.", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" }
        });
      })
  );
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil((async () => {
    try {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const existing = windows[0];
      const targetUrl = new URL(event.notification.data?.url || "/", self.location.origin).href;
      if (existing) {
        if ("navigate" in existing) await existing.navigate(targetUrl);
        await existing.focus();
        return;
      }
      await self.clients.openWindow(targetUrl);
    } catch (error) {
      console.warn("Notification click failed", error);
    }
  })());
});

self.addEventListener("push", event => {
  let payload = {};
  try { payload = event.data?.json?.() || {}; } catch { payload = { body: event.data?.text?.() || "" }; }
  const title = payload.title || "ППР Контроль";
  const options = {
    body: payload.body || "Новое уведомление",
    icon: payload.icon || "/icon-192.png",
    badge: payload.badge || "/icon-192.png",
    tag: payload.tag || `ppr-${Date.now()}`,
    data: payload.data || {},
    renotify: true
  };
  event.waitUntil(self.registration.showNotification(title, options));
});
