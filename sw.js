/* YJ工作台 Service Worker v4 — HTML 网络优先，静态资源缓存优先 */
const CACHE = 'yj-workspace-v4';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './logo.svg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) {
    // 跨域（Supabase / CDN）：网络优先，失败不缓存
    e.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }

  const isNavigate = req.mode === 'navigate';
  const isHtml = isNavigate || url.pathname.endsWith('.html') || url.pathname === '/';

  if (isHtml) {
    // HTML：网络优先 —— 始终获取最新版，离线时回退缓存
    e.respondWith(
      fetch(req).then((resp) => {
        if (resp && resp.status === 200 && resp.type === 'basic') {
          const copy = resp.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return resp;
      }).catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html')))
    );
    return;
  }

  // 静态资源（图标/manifest 等）：缓存优先
  e.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((resp) => {
        if (resp && resp.status === 200 && resp.type === 'basic') {
          const copy = resp.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return resp;
      }).catch(() => caches.match('./index.html'));
    })
  );
});