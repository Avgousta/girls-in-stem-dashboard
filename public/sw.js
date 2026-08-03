// Minimal service worker — exists solely to satisfy PWA installability criteria.
// No caching: every request passes straight through to the network so the
// dashboard's data is never served stale.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
