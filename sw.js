// Офлайн-режим: файлы приложения кешируются, сайт открывается без интернета.
const CACHE = 'kosmic-v28';
const CDN = 'https://cdn.jsdelivr.net/npm/three@0.170.0/';
const FILES = [
  './', './index.html', './manifest.webmanifest', './css/styles.css',
  './js/app.js', './js/store.js', './js/ui.js', './js/icons.js', './js/body.js', './js/body3d.js', './js/anatomy3d.js', './js/bodyview.js', './js/figure.js', './js/hero.js', './js/heatmap.js', './js/stats.js', './js/premium.js', './js/i18n.js', './js/emoji.js', './js/bodysnap.js', './js/planner.js', './js/data/exercises.js',
  './js/views/home.js', './js/views/workouts.js', './js/views/food.js', './js/views/goals.js', './js/views/habits.js', './js/views/settings.js', './js/views/sleep.js',
  './icons/icon-32.png', './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// Сначала сеть (чтобы получать обновления), при отсутствии сети — кеш
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  // библиотека 3D (Three.js) с CDN: версия зафиксирована, поэтому кешируем навсегда
  if (e.request.url.startsWith(CDN)) {
    e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy));
      return res;
    })));
    return;
  }
  if (new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    // no-cache: всегда проверяем, не обновился ли файл на сервере
    fetch(e.request, { cache: 'no-cache' }).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('./index.html')))
  );
});
