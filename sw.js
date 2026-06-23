// IMPORTANT : importScripts('version.js') a été retiré — il empêchait l'installation PWA sur Android
// (Chrome Android est strict : un échec d'importScripts bloque toute la PWA, contrairement à Chrome desktop).
// Le CACHE_NAME doit donc être synchronisé MANUELLEMENT avec version.js à chaque changement de version.
const CACHE_NAME = 'phil-mobile-Build 7.2.2';
const ASSETS = [
  '/',
    '/wp_consultant_hub.html',
  '/wp_rem.html',
  '/wp_orange.html',
  '/wp_eneco.html',

  // PDF
  '/documents/wp_salesforce.pdf',
  '/documents/wp_mysmart.pdf',
  '/documents/wp_commissions.pdf',
  '/documents/wp_smartPlan.pdf',
  '/documents/wp_orangeproduits.pdf',

  // Images
  'https://app.phil-mobile.be/images/logo.png',
  'https://app.phil-mobile.be/images/splash.png',

  // Librairies externes
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js'
];

// Installation — mise en cache des assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        ASSETS.map(url =>
          cache.add(url).catch(() => console.warn('Cache miss:', url))
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// Activation — suppression des anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch — Network First pour HTML/JS (toujours la dernière version en ligne, cache en secours hors-ligne),
// Cache First pour les assets vraiment statiques (images, PDF, libs externes qui ne changent jamais)
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (event.request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;

  const isAppShell =
    event.request.url.endsWith('.html') ||
    event.request.url.endsWith('.js');

  const isStatic =
    !isAppShell && (
      ASSETS.some(a => event.request.url.includes(a)) ||
      event.request.url.endsWith('.pdf') ||
      event.request.url.endsWith('.png') ||
      event.request.url.endsWith('.css')
    );

  if (isAppShell) {
    event.respondWith(
      fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match(event.request))
    );
  } else if (isStatic) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;

        return fetch(event.request).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache =>
              cache.put(event.request, clone)
            );
          }
          return response;
        }).catch(() => cached);
      })
    );
  } else {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
  }
});

// Message : forcer la mise à jour du cache
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
