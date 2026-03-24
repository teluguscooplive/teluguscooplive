/* TeluguScoopLive — Service Worker v3
   Deploy this file as /sw.js at the root of your Netlify site.
   This enables PWA install prompt on Android/Chrome. */
'use strict';

var CACHE_NAME = 'tsl-cache-v3';
var OFFLINE_URL = '/';

// Install — cache the shell
self.addEventListener('install', function(e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll([OFFLINE_URL]).catch(function() {});
    })
  );
});

// Activate — clean old caches
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() { return self.clients.claim(); })
  );
});

// Fetch — network first, cache fallback
self.addEventListener('fetch', function(e) {
  var url = e.request.url;

  // Always use network for: API calls, Supabase, Telegram, fonts, analytics
  if (url.includes('supabase.co') ||
      url.includes('api.telegram.org') ||
      url.includes('googleapis.com') ||
      url.includes('googletagmanager') ||
      url.includes('pollinations.ai') ||
      url.includes('api.groq.com') ||
      url.includes('graph.facebook.com') ||
      url.includes('unsplash.com') ||
      e.request.method !== 'GET') {
    return;
  }

  e.respondWith(
    fetch(e.request).then(function(response) {
      // Cache successful responses for the app shell
      if (response && response.status === 200 && response.type === 'basic') {
        var copy = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(e.request, copy);
        });
      }
      return response;
    }).catch(function() {
      // Network failed — serve from cache
      return caches.match(e.request).then(function(cached) {
        return cached || caches.match(OFFLINE_URL);
      });
    })
  );
});
