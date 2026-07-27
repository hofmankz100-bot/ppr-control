const CACHE_NAME = "ppr-v275-reliable-forced-update";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=275-reliable-forced-update",
  "./modules/compressor.js?v=288-print-request-pages",
  "./modules/shgrp.js?v=288-print-request-pages",
  "./modules/receiver.js?v=288-print-request-pages",
  "./modules/requests.js?v=288-print-request-pages",
  "./modules/comments.js?v=288-print-request-pages",
  "./modules/director.js?v=288-print-request-pages",
  "./app.js?v=275-reliable-forced-update",
  "./assets/repair-master.png?v=v266-walking-legs-angry-fist",
  "./assets/repair-master-fist.png?v=v266-walking-legs-angry-fist",
  "./assets/repair-master-walk-a.png?v=v266-walking-legs-angry-fist",
  "./assets/repair-master-walk-b.png?v=v266-walking-legs-angry-fist",
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
    } catch {}
  })());
});

self.addEventListener("push", event => {
  event.waitUntil((async () => {
    let payload = {};
    try { payload = event.data?.json() || {}; } catch {}
    const count = Math.max(0, Number(payload.badgeCount) || 0);
    try {
      if (count > 0 && "setAppBadge" in self.navigator) await self.navigator.setAppBadge(count);
      else if ("clearAppBadge" in self.navigator) await self.navigator.clearAppBadge();
    } catch {}
    if (payload.clearTag) {
      const notifications = await self.registration.getNotifications({ tag: payload.clearTag });
      notifications.forEach(notification => notification.close());
      if (payload.silentUpdate) return;
    }
    await self.registration.showNotification(payload.title || "ALKZ — новое замечание", {
      body: payload.body || "Поступило новое замечание",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: payload.tag || `${payload.type || "notice"}:${payload.entityId || "general"}`,
      renotify: true,
      silent: false,
      data: { url: payload.url || "/" }
    });
  })());
});
