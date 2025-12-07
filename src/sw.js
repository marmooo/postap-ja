const cacheName = "2025-12-08 00:00";
const urlsToCache = [
  "/postap-ja/index.js",
  "/postap-ja/mp3/bgm.mp3",
  "/postap-ja/mp3/cat.mp3",
  "/postap-ja/mp3/end.mp3",
  "/postap-ja/problems.json",
  "/postap-ja/favicon/favicon.svg",
  "https://marmooo.github.io/fonts/textar-light.woff2",
];

async function preCache() {
  const cache = await caches.open(cacheName);
  await Promise.all(
    urlsToCache.map((url) =>
      cache.add(url).catch((err) => console.warn("Failed to cache", url, err))
    ),
  );
  self.skipWaiting();
}

async function handleFetch(event) {
  const cached = await caches.match(event.request);
  return cached || fetch(event.request);
}

async function cleanOldCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map((name) => name !== cacheName ? caches.delete(name) : null),
  );
  self.clients.claim();
}

self.addEventListener("install", (event) => {
  event.waitUntil(preCache());
});
self.addEventListener("fetch", (event) => {
  event.respondWith(handleFetch(event));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(cleanOldCaches());
});
