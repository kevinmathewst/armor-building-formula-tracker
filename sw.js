const CACHE = 'abf-shell-v13';
const PRECACHE = ['./', './index.html', './day-picker.js', './manifest.webmanifest', './icon.svg'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Always get the app shell from the network when online.
  // This prevents an installed PWA/service worker from pinning an old build.
  if (event.request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('/index.html')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            event.waitUntil(
              caches.open(CACHE).then(cache => cache.put('./index.html', copy))
            );
          }
          return response;
        })
        .catch(() => caches.match('./index.html').then(response => response || caches.match('./')))
    );
    return;
  }

  // Other assets are network-first, with offline cache fallback.
  event.respondWith(
    fetch(event.request, { cache: 'no-store' })
      .then(response => {
        if (response.ok) {
          const copy = response.clone();
          event.waitUntil(
            caches.open(CACHE).then(cache => cache.put(event.request, copy))
          );
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});