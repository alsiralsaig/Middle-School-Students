/**
 * Service Worker — منصة الطالب السوداني الذكية
 *
 * الهدف: التطبيق يفتح **بدون إنترنت** (مهم جداً لطلاب السودان) ويتثبّت على الهاتف،
 * ويتحدّث فوراً عند صدور نسخة جديدة بدون الحاجة لمسح الكاش يدوياً.
 */
const VERSION = 'ssp-v1.3.1';
const SHELL_CACHE = `${VERSION}-shell`;
const ASSET_CACHE = `${VERSION}-assets`;
/**
 * كاش الملفات التي حمّلها الطالب للاستخدام بدون إنترنت.
 * ⚠️ اسمه مستقل ولا يُحذف عند تحديث نسخة التطبيق.
 */
const USER_FILES_CACHE = 'ssp-offline-files-v1';
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
          keys
            .filter((k) => k !== SHELL_CACHE && k !== ASSET_CACHE && k !== USER_FILES_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') {
    self.skipWaiting();
  }
});

const isApi = (url) => url.pathname.startsWith('/api/') || url.pathname.startsWith('/backend/');

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // واجهات الخادم والذكاء الاصطناعي: الشبكة فقط
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

  // التنقل بين الصفحات: الشبكة أولاً (بدون كاش المتصفح القديم) ثم الكاش عند انقطاع الإنترنت
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req, { cache: 'no-store' })
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(SHELL_CACHE).then((c) => c.put('/', copy)).catch(() => {});
          }
          return res;
        })
        .catch(async () => {
          const cached = await caches.match('/');
          return cached || (await caches.match(OFFLINE_URL)) || Response.error();
        })
    );
    return;
  }

  // باقي الملفات الثابتة: cache-first مع تحديث في الخلفية
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
