// Lets Bendir & Raï open without a connection once it has been visited, and makes it installable.
// Pages are fetched fresh when online (so updates show up straight away) and come from the cache when offline.
// Sounds and fonts come from the cache first and are refreshed in the background.
var CACHE = 'bendir-rai-v1';
var CORE = ['./', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 's/drums.json'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  if (req.mode === 'navigate') { // the page itself: network first
    e.respondWith(fetch(req).then(function (res) {
      var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put('./', copy); });
      return res;
    }).catch(function () { return caches.match('./'); }));
    return;
  }
  e.respondWith(caches.open(CACHE).then(function (c) { // everything else: cache first, refreshed in the background
    return c.match(req).then(function (hit) {
      var fresh = fetch(req).then(function (res) { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; });
      if (hit) { fresh.catch(function () {}); return hit; }
      return fresh;
    });
  }));
});
