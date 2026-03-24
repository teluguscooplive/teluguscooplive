/* TeluguScoopLive — Service Worker v4
   Handles: /manifest.json interception, app shell caching, offline fallback
   Deploy at root: /sw.js */
'use strict';

var CACHE = 'tsl-v4';

var MANIFEST = JSON.stringify({
  name: 'TeluguScoopLive',
  short_name: 'TSL News',
  description: 'Breaking Telugu News, Cinema, Politics & Cricket',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  background_color: '#1a2f5e',
  theme_color: '#E8192C',
  orientation: 'portrait-primary',
  lang: 'te',
  icons: [
    { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
    { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
  ]
});

self.addEventListener('install', function(e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function(c) {
      return c.addAll(['/']).catch(function() {});
    })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e) {
  var url = e.request.url;

  // Intercept /manifest.json — serve dynamic manifest with correct headers
  if (url.endsWith('/manifest.json') || url.includes('/manifest.json?')) {
    e.respondWith(new Response(MANIFEST, {
      headers: {
        'Content-Type': 'application/manifest+json',
        'Access-Control-Allow-Origin': '*'
      }
    }));
    return;
  }

  // Skip API, CDN, non-GET
  if (url.includes('supabase.co') ||
      url.includes('api.telegram.org') ||
      url.includes('googleapis.com') ||
      url.includes('googletagmanager') ||
      url.includes('pollinations.ai') ||
      url.includes('unsplash.com') ||
      url.includes('graph.facebook.com') ||
      url.includes('api.groq.com') ||
      url.includes('cdn.jsdelivr.net') ||
      e.request.method !== 'GET') {
    return;
  }

  // Cache first, network fallback
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      return cached || fetch(e.request).then(function(res) {
        if (res && res.status === 200 && res.type === 'basic') {
          var copy = res.clone();
          caches.open(CACHE).then(function(c) { c.put(e.request, copy); });
        }
        return res;
      }).catch(function() {
        return cached || new Response('Offline', { status: 503 });
      });
    })
  );
});
