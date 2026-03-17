const CACHE_NAME = 'qr-sistem-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/main.css',
  '/js/app.js',
  '/js/api.js',
  '/js/auth.js',
  '/js/i18n.js',
  '/js/notifications.js',
  '/js/utils.js',
  '/js/qr.js',
  '/js/scanner.js',
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
];

// Install: Cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: Network-first for API, cache-first for static
self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.url.includes('/api/')) {
    // Network first for API calls
    event.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ error: 'offline', message: 'Baglanti yok' }), {
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
  } else {
    // Cache first for static assets
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
  }
});
