// Edeviser Service Worker - cache-first for app shell, network-first for API
// E1.13: same-origin GETs only. Cross-origin requests (Google Fonts, CDNs) are
// handled natively by the browser - a SW fallback must never serve the app
// shell (index.html) for them, which previously produced MIME text/html
// stylesheet refusals.
const CACHE_NAME = 'edeviser-v3';
const SHELL_ASSETS = ['/', '/index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // E1.13: let the browser handle cross-origin requests (fonts, CDNs, analytics).
  if (url.origin !== self.location.origin) return;
  // Never cache Supabase API responses
  if (url.hostname.includes('supabase')) return;
  // Never cache POST/PUT/DELETE
  if (event.request.method !== 'GET') return;

  // Cache-first for static assets
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
    return;
  }

  // Network-first for everything else same-origin
  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(event.request).then((cached) => cached || caches.match('/'))
    )
  );
});