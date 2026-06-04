const CACHE_NAME = 'philmobile-v2';

const FILES_TO_CACHE = [
  '/',
  '/wp_home.html',
  '/wp_consultant_hub.html',
  '/logo.png',
  '/manifest.json',
  '/wp_rem.html',
  '/wp_orange.html',
  '/wp_eneco.html',
  '/wp_salesforce.pdf',
  '/wp_mysmart.pdf',
  '/wp_commissions.pdf',
  '/wp_smartPlan.pdf',
  '/wp_orangeproduits.pdf',
];

// Installation : on met tout en cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activation : on supprime les anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch : cache d'abord, internet si pas en cache
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).catch(() => {
        if (event.request.destination === 'document') {
          return caches.match('/wp_home.html');
        }
      });
    })
  );
});
