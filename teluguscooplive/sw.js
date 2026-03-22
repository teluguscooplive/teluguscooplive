/* ═══════════════════════════════════════════════════════════
   TeluguScoopLive — Service Worker v1.0
   Strategy: Network-first for news (always fresh),
             Cache-first for static assets (fonts, icons)
   ═══════════════════════════════════════════════════════════ */

const CACHE_NAME = 'tsl-v1';
const CACHE_DURATION_STATIC = 7 * 24 * 60 * 60; // 7 days

// Assets to pre-cache on install
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/offline.html',
];

// Static asset hosts — cache aggressively
const STATIC_HOSTS = [
  'fonts.gstatic.com',
  'fonts.googleapis.com',
  'cdn.jsdelivr.net',
];

// ── Install: pre-cache shell ──────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_ASSETS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: clean old caches ────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys
        .filter(k => k !== CACHE_NAME)
        .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: smart routing ──────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin API calls
  if (request.method !== 'GET') return;
  if (url.hostname.includes('supabase.co')) return;
  if (url.hostname.includes('cricapi.com')) return;
  if (url.hostname.includes('groq.com')) return;
  if (url.hostname.includes('telegram.org')) return;

  // Static assets (fonts, CDN) → Cache-first
  if (STATIC_HOSTS.some(h => url.hostname.includes(h))) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Unsplash images → Cache-first (images don't change)
  if (url.hostname.includes('unsplash.com')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // HTML pages → Network-first (always get fresh news)
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Everything else → Network-first
  event.respondWith(networkFirst(request));
});

// ── Cache-first strategy ──────────────────────────────────
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

// ── Network-first strategy ────────────────────────────────
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Fallback for HTML
    if (request.headers.get('accept')?.includes('text/html')) {
      const offline = await caches.match('/offline.html');
      if (offline) return offline;
    }
    return new Response('Offline', { status: 503 });
  }
}
