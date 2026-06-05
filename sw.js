const CACHE_NAME = 'phil-mobile-v6';
const ASSETS = [
  '/',
  '/wp_home.html',
  '/wp_consultant_hub.html',
  '/wp_rem.html',
  '/wp_orange.html',
  '/wp_eneco.html',
  '/wp_salesforce.pdf',
  '/wp_mysmart.pdf',
  '/wp_commissions.pdf',
  '/wp_smartPlan.pdf',
  '/wp_orangeproduits.pdf',
  'https://app.phil-mobile.be/logo.png',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js'
];

// Installation — mise en cache des assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        ASSETS.map(url => cache.add(url).catch(() => console.warn('Cache miss:', url)))
      );
    }).then(() => self.skipWaiting())
  );
});

// Activation — suppression des anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — Cache First pour assets statiques, Network First pour le reste
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;

  const isStatic = ASSETS.some(a => event.request.url.includes(a)) ||
    event.request.url.endsWith('.html') ||
    event.request.url.endsWith('.pdf') ||
    event.request.url.endsWith('.png') ||
    event.request.url.endsWith('.js') ||
    event.request.url.endsWith('.css');

  if (isStatic) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
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
  if (event.data === 'skipWaiting') self.skipWaiting();
});
