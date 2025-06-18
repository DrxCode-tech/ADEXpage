/*const CACHE_NAME = 'adex-cache-v6'; // Bump version whenever you update
const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/signADEX.js',
  '/LoginADEX.html',
  '/LoginADEX.js',
  '/V2ADEX.html',
  '/V2ADEX.js',
  '/V2ADEX.css',
  '/review.html',
  '/review.js',
  '/AboutADEX.html',
  '/firebaseConfig.js',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json'
];

// Install event: cache files
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Caching app shell');
      return cache.addAll(FILES_TO_CACHE);
    }).then(() => self.skipWaiting()) // Skip waiting, activate immediately
  );
});

// Activate event: delete old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate');
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim()) // Take control immediately
  );
});

// Fetch event: cache-first strategy
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        // Optionally cache new requests here
        return networkResponse;
      });
    }).catch(() => {
      // Offline fallback (optional)
      // return caches.match('/offline.html');
    })
  );
});

// Optional: Notify client of new version
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({ type: 'UPDATE_AVAILABLE' });
      });
    })
  );
});
*/

