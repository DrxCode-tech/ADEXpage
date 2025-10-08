const CACHE_NAME = 'adex-cache-v1';
const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/ADEXsign.html',
  '/ADEXlogin.html',
  '/ADEXpasswordReset.html',
  '/aboutADEX.html',
  '/review.html',
  '/V3ADEX.html',
  '/AI_V3ADEX.html',
  '/ADEXsign.js',
  '/ADEXlogin.js',
  '/ADEXreset.js',
  '/V3ADEX.js',
  '/review.js',
  '/firebaseConfig.js',
  '/V3ADEX.css',
  '/AdexImg.jpg',
  '/icon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json'
];
// Install: cache static files
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
  );
});

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  return self.clients.claim();
});

// Fetch: network-first, then cache fallback
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // Cache the new response
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      })
      .catch(() => {
        // If network fails, return cached version
        return caches.match(event.request);
      })
  );
});
