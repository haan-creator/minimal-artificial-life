const CACHE_NAME = 'minimal-life-v0.4.1';

const APP_SHELL = [
  './',
  './index.html',
  './site.webmanifest',
  './apple-touch-icon.png',
  './icon-512.png'
];

const APP_SHELL_PATHS = new Set(
  APP_SHELL.map(path => new URL(path, self.registration.scope).pathname)
);

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;

  // Only handle safe same-origin GET requests.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // For HTML navigation, prefer the network so new versions appear quickly.
  // If offline, fall back to the cached app shell.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy));
          }
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Only cache known local app-shell assets.
  if (!APP_SHELL_PATHS.has(url.pathname)) return;

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;

      return fetch(request).then(response => {
        if (!response || !response.ok) return response;

        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        return response;
      });
    })
  );
});
