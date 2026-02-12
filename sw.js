const CACHE_NAME = "zakat-app-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/dalil.html",
  "/fiqih.html",
  "/kalkulator.html",
  "/laz.html",
  "/style.css",
  "/script.js",
  "/dalil.js",
  "/fiqih.js",
  "/kalkulator.js",
  "/laz.js",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
];

// 1. Install Service Worker & Cache semua file
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Opened cache");
      return cache.addAll(urlsToCache);
    }),
  );
});

// 2. Fetch data (Cek cache dulu, kalau gak ada baru ke internet)
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response; // Return dari cache (Offline mode jalan)
      }
      return fetch(event.request); // Ambil dari internet
    }),
  );
});

// 3. Activate (Hapus cache lama jika ada update versi)
self.addEventListener("activate", (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        }),
      );
    }),
  );
});
