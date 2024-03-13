const CACHE_NAME = "2024-03-13 09:40";
const urlsToCache = [
  "/postap-ja/",
  "/postap-ja/index.js",
  "/postap-ja/mp3/bgm.mp3",
  "/postap-ja/mp3/cat.mp3",
  "/postap-ja/mp3/end.mp3",
  "/postap-ja/problems.json",
  "/postap-ja/favicon/favicon.svg",
  "https://marmooo.github.io/fonts/textar-light.woff2",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    }),
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName)),
      );
    }),
  );
});
