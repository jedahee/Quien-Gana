/* ¿Quién Gana? — service worker
   Hace el sitio instalable (PWA / "APK simulado") y con lectura offline.
   Estrategia:
   - Navegación (páginas HTML): network-first con fallback a caché (offline).
   - assets/ y estáticos: cache-first (no cambian salvo redespliegue).
   - data/*.json: stale-while-revalidate (el número más reciente gana, pero
     si hay caché previa se sigue leyendo sin red). El contenido crítico ya
     está en el HTML, así que una caída del JSON nunca rompe la lectura.
   - VERSIÓN de caché: se incrementa al rediseñar (al cambiar la VERSIÓN,
     el 'activate' purga cachés antiguas automáticamente). */
const VERSION = 'qg-v1';
const CACHE = `quiengana-${VERSION}`;

const PRECACHE = [
  './',
  './assets/css/main.css',
  './assets/js/main.js',
  './assets/js/data.js',
  './assets/js/search.js',
  './assets/js/counters.js',
  './assets/js/charts.js',
  './assets/js/quien-gana-block.js',
  './assets/img/logo-header.png',
  './assets/img/logo-header-dark.png',
  './data/search-index.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith('quiengana-')).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(req, fallbackUrl) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    const cached = await cache.match(req);
    return cached || (fallbackUrl && (await cache.match(fallbackUrl))) || Response.error();
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(req);
  const fresh = fetch(req)
    .then((res) => { if (res.ok) cache.put(req, res.clone()); return res; })
    .catch(() => cached);
  return cached || fresh;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, './'));
  } else if (url.pathname.startsWith(self.location.pathname.replace(/sw\.js$/, '') + 'data/') ||
             url.pathname.includes('/data/')) {
    event.respondWith(staleWhileRevalidate(request));
  } else if (url.pathname.includes('/assets/')) {
    event.respondWith(cacheFirst(request));
  }
  // El resto (manifest, favicons sueltos si no están precacheados) pasa por red.
});