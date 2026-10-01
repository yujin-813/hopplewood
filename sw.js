/* 호플우드 서비스워커 — 오프라인 캐시 */
importScripts('./games/narration-manifest.js');
/* 캐시 이름과 아래 파일 버전(?v=내용 해시)은 scripts/sync-games.cjs가 만든다. 손으로 고치지 않는다. */
const CACHE = 'hopplewood-fc6083b6'; // cache:name
/* 숫자가 든 문장(900여 개)은 처음에 한꺼번에 받지 않고, 들을 때 받아서 캐시에 둔다 */
const NARRATION = Object.entries(self.HW_NARRATION_FILES || {}).filter(([text]) => !/\d/.test(text)).map(([, path]) => './' + path.replace(/^\.\//, ''));
const CORE = [
  './',
  './index.html',
  './start.html',
  './parents-guide.html',
  './buy.html',
  './privacy.html',
  './manifest.webmanifest',
  './assets/fonts/Jua-Regular.ttf',
  // assets:start
  './games/characters.js?v=3ac7585e',
  './games/funnel.js?v=f9addf59',
  './games/narration-manifest.js?v=3b15cfb0',
  './games/platform.js?v=039dd1e7',
  './games/pack.js?v=60e586ec',
  './games/music.js?v=b4e0267c',
  './games/registry.js?v=48965a25',
  './games/g1-route/game.js?v=9b85c809',
  './games/g2-pattern/game.js?v=5d2f7ed0',
  './games/g3-face/game.js?v=42eb994a',
  './games/g4-number/game.js?v=0c649601',
  './games/g5-beaver/game.js?v=29055a32',
  './games/g6-shell/game.js?v=bc51fd0c',
  './games/g7-garden/game.js?v=bed41e2e',
  './games/g8-leaf/game.js?v=068a0ce6',
  './games/hopplewood.css?v=a54fd31b',
  './games/parent-guide.css?v=120296e0',
  './games/g3-face/game.css?v=8bc602b4',
  './games/g4-number/game.css?v=9235f796',
  './games/g5-beaver/game.css?v=ed58f177',
  './games/g6-shell/game.css?v=b73b4fe3',
  './games/g7-garden/game.css?v=6c5dfef4',
  './games/g8-leaf/game.css?v=c61b1d80',
  './games/forest.css?v=1f75bdb9',
  './games/mom-voice.css?v=e60e8825',
  './games/parent-guide.js?v=39f60b2d',
  './games/forest.js?v=ef069f00',
  './games/mom-voice.js?v=c2be0f44',
  // assets:end
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  './icons/apple-touch-icon-180.png',
  './icons/favicon-32.png',
  ...NARRATION
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
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')).then(hit => hit || caches.match('./')))
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
