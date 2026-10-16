/**
 * Service Worker — منصة الطالب السوداني الذكية
 *
 * الهدف: التطبيق يفتح **بدون إنترنت** (مهم جداً لطلاب السودان) ويتثبّت على الهاتف.
 * الاستراتيجية:
 *   • التطبيق نفسه (شل): cache-first — يفتح فوراً حتى بدون نت.
 *   • الملفات الثابتة (JS/CSS/صور): cache-first وتُحدَّث في الخلفية.
 *   • طلبات API: الشبكة فقط (الذكاء الاصطناعي محتاج نت) مع رسالة واضحة لو فشل.
 *   • الصفحات: network-first مع الرجوع للكاش.
 */
const VERSION = 'ssp-v1.0.0';
const SHELL_CACHE = `${VERSION}-shell`;
const ASSET_CACHE = `${VERSION}-assets`;
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(['/', OFFLINE_URL, '/manifest.webmanifest']))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== SHELL_CACHE && k !== ASSET_CACHE).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

const isApi = (url) => url.pathname.startsWith('/api/');

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // الذكاء الاصطناعي: شبكة فقط
  if (isApi(url)) {
    event.respondWith(
      fetch(req).catch(
        () =>
          new Response(JSON.stringify({ offline: true, reply: '' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          })
      )
    );
    return;
  }

  // التنقل بين الصفحات: الشبكة أولاً، والكاش عند عدم التغطية
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put('/', copy)).catch(() => {});
          return res;
        })
        .catch(async () => {
          const cached = await caches.match('/');
          return cached || (await caches.match(OFFLINE_URL)) || Response.error();
        })
    );
    return;
  }

  // باقي الملفات: cache-first مع تحديث في الخلفية
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(ASSET_CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
