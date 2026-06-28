// Minimal service worker: no caching, just a network passthrough. Its sole
// purpose is to satisfy Chrome's PWA installability criteria so the "Install"
// button appears. Keeping it cache-free avoids any stale-asset issues.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request).catch(() => Response.error()))
})
