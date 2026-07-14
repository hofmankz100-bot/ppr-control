const CACHE_NAME = "ppr-v129";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=129",
  "./modules/compressor.js?v=288-print-request-pages",
  "./modules/shgrp.js?v=288-print-request-pages",
  "./modules/receiver.js?v=288-print-request-pages",
  "./modules/requests.js?v=288-print-request-pages",
  "./modules/comments.js?v=288-print-request-pages",
  "./modules/director.js?v=288-print-request-pages",
  "./app.js?v=129",
  "./node_modules/jsqr/dist/jsQR.js?v=313-spelling-fixes",
  "./manifest.json",
  "./icon.svg"
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
