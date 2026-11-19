// Lets Bendir & Raï open without a connection once it has been visited, and makes it installable.
// The page, its scripts and its stylesheet are fetched fresh when online, so an update always arrives
// whole (a new page never runs with old scripts), and come from the cache when offline.
// Sounds, icons and fonts come from the cache first and are refreshed in the background.
var CACHE = 'bendir-rai-v2';
var CODE = ['./', 'css/app.css', 'js/core.js', 'js/audio.js', 'js/studio.js', 'js/compose.js', 'js/drum-machine.js', 'js/app.js'];
var CORE = CODE.concat(['manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 's/drums.json']);

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function isCode(req) {
  if (req.mode === 'navigate') return true;
  var u = new URL(req.url);
  return u.origin === location.origin && /\.(html|js|css)$/.test(u.pathname) && !/\/sw\.js$/.test(u.pathname);
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  if (isCode(req)) { // network first
    e.respondWith(fetch(req).then(function (res) {
      if (res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req.mode === 'navigate' ? './' : req, copy); }); }
      return res;
    }).catch(function () { return caches.match(req.mode === 'navigate' ? './' : req); }));
    return;
  }
  e.respondWith(caches.open(CACHE).then(function (c) { // cache first, refreshed in the background
    return c.match(req).then(function (hit) {
      var fresh = fetch(req).then(function (res) { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; });
      if (hit) { fresh.catch(function () {}); return hit; }
      return fresh;
    });
  }));
});
