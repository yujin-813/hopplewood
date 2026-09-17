/* 호플우드 서비스워커 — 오프라인 캐시 */
const CACHE = 'hopplewood-v53';
const V = '?v=53';
const CORE = [
  './',
  './index.html',
  './privacy.html',
  './manifest.webmanifest',
  './games/characters.js' + V,
  './games/platform.js' + V,
  './games/pack.js' + V,
  './games/hopplewood.css' + V,
  './games/face-game.css' + V,
  './games/face-game.js' + V,
  './games/number-game.css' + V,
  './games/number-game.js' + V,
  './games/block-game.css' + V,
  './games/block-game.js' + V,
  './games/forest.css' + V,
  './games/forest.js' + V,
  './games/parent-guide.css' + V,
  './games/parent-guide.js' + V,
  './games/mom-voice.css' + V,
  './games/mom-voice.js' + V,
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  './icons/apple-touch-icon-180.png',
  './icons/favicon-32.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* 정상 응답만 캐시에 넣는다. 404·500·오류 응답이 오프라인 화면을 덮어쓰지 않게 한다. */
function cacheable(res) {
  return res && (res.ok || res.type === 'opaque');
}

/* 화면 이동은 최신 버전을 먼저 확인하고, 실패하면 저장된 화면을 쓴다. 나머지 파일은 캐시를 우선 사용한다. */
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(res => {
        if (res.ok && url.origin === self.location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put('./index.html', copy)).catch(() => {});
        }
        return res;
      }).catch(() => caches.match('./index.html').then(hit => hit || caches.match('./')))
    );
    return;
  }
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (cacheable(res)) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      }
      return res;
    }))
  );
});
