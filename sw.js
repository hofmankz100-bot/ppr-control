const CACHE_NAME = "ppr-v244-mobile-layout";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=243-modules-audit",
  "./modules/compressor.js?v=243-modules-audit",
  "./modules/shgrp.js?v=243-modules-audit",
  "./modules/receiver.js?v=243-modules-audit",
  "./modules/requests.js?v=243-modules-audit",
  "./modules/comments.js?v=243-modules-audit",
  "./modules/director.js?v=243-modules-audit",
  "./app.js?v=243-modules-audit",
  "./manifest.json",
  "./icon.svg"
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
    event.respondWith(fetch(event.request));
    return;
  }
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
