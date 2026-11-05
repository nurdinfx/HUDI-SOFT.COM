// Datel Clinic System — Self-Cleaning Service Worker
// Automatically cleans legacy cache and unregisters itself to prevent redirect/ERR_FAILED crashes

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((key) => caches.delete(key)));
    })
    .then(() => self.registration.unregister())
    .then(() => self.clients.claim())
  );
});

// Let native browser networking handle all requests directly without fetch interception
