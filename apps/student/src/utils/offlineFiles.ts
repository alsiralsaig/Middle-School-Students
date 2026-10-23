/**
 * تحميل الملفات للاستخدام **بدون إنترنت**.
 *
 * الفكرة (نفس فكرة تطبيق الثانوي): الطالب يضغط زر التحميل 📥 بجانب أي ملف،
 * فيُخزَّن الملف نفسه داخل الجهاز (Cache Storage)، وتُحفظ بياناته (العنوان،
 * المادة، الحجم) في IndexedDB. بعدها يفتحه من تبويب «بدون نت» حتى لو
 * انقطع الإنترنت تماماً.
 *
 * مهم: لو المتصفح لا يدعم Cache Storage نخزّن الملف كـ Blob في IndexedDB
 * كخطة بديلة، فالميزة لا تسقط على الأجهزة القديمة.
 */

const DB_NAME = 'ssp-offline-media';
const DB_VERSION = 1;
const STORE = 'files';
/** اسم كاش مستقل — لا يُمسح مع تحديثات التطبيق (انظر sw.js) */
export const OFFLINE_CACHE = 'ssp-offline-files-v1';

export interface OfflineFileMeta {
  /** مفتاح فريد = رابط الملف الأصلي */
  url: string;
  title: string;
  mimeType?: string | null;
  kind?: string | null;
  sizeLabel?: string | null;
  bytes?: number;
  subjectId?: string | null;
  subjectName?: string | null;
  savedAt: string;
}

interface StoredRow extends OfflineFileMeta {
  /** يُستخدم فقط في الخطة البديلة (Blob داخل IndexedDB) */
  blob?: Blob;
}

function hasIdb(): boolean {
  return typeof window !== 'undefined' && 'indexedDB' in window;
}

function hasCache(): boolean {
  return typeof window !== 'undefined' && 'caches' in window;
}

export function offlineSupported(): boolean {
  return hasIdb() && (hasCache() || true);
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'url' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = run(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result as T);
        req.onerror = () => reject(req.error);
      }),
  );
}

/**
 * يحمّل الملف ويخزّنه في الجهاز.
 * @returns حجم الملف بالبايت
 */
export async function saveOfflineFile(
  meta: Omit<OfflineFileMeta, 'savedAt'>,
  onProgress?: (percent: number) => void,
): Promise<OfflineFileMeta> {
  if (!hasIdb()) throw new Error('المتصفح لا يدعم التخزين المحلي');

  onProgress?.(8);
  const res = await fetch(meta.url, { mode: 'cors' });
  if (!res.ok) throw new Error(`تعذّر تنزيل الملف (${res.status})`);

  // نقرأ المحتوى تدريجياً حتى نعطي نسبة تقدّم حقيقية
  const total = Number(res.headers.get('content-length') || 0);
  let blob: Blob;
  if (res.body && total > 0 && typeof ReadableStream !== 'undefined') {
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        received += value.byteLength;
        onProgress?.(Math.min(92, 8 + Math.round((received / total) * 84)));
      }
    }
    blob = new Blob(chunks as BlobPart[], { type: res.headers.get('content-type') || 'application/octet-stream' });
  } else {
    blob = await res.blob();
  }

  onProgress?.(94);

  if (hasCache()) {
    const cache = await caches.open(OFFLINE_CACHE);
    await cache.put(meta.url, new Response(blob, {
      headers: {
        'Content-Type': meta.mimeType || blob.type || 'application/octet-stream',
        'Content-Length': String(blob.size),
      },
    }));
    await tx('readwrite', (s) => s.put({ ...meta, bytes: blob.size, savedAt: new Date().toISOString() } as StoredRow));
  } else {
    await tx('readwrite', (s) =>
      s.put({ ...meta, bytes: blob.size, blob, savedAt: new Date().toISOString() } as StoredRow),
    );
  }

  onProgress?.(100);
  return { ...meta, bytes: blob.size, savedAt: new Date().toISOString() };
}

/** كل الملفات المحمّلة (الأحدث أولاً) */
export async function listOfflineFiles(): Promise<OfflineFileMeta[]> {
  if (!hasIdb()) return [];
  try {
    const rows = await tx<StoredRow[]>('readonly', (s) => s.getAll() as IDBRequest<StoredRow[]>);
    return (rows || [])
      .map(({ blob: _blob, ...rest }) => rest)
      .sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1));
  } catch {
    return [];
  }
}

export async function isFileOffline(url: string): Promise<boolean> {
  if (!hasIdb()) return false;
  try {
    const row = await tx<StoredRow | undefined>('readonly', (s) => s.get(url));
    return !!row;
  } catch {
    return false;
  }
}

/** عنوان محلي (blob:) يفتح الملف المحفوظ بدون إنترنت */
export async function getOfflineObjectUrl(url: string): Promise<string | null> {
  if (!hasIdb()) return null;
  try {
    if (hasCache()) {
      const cache = await caches.open(OFFLINE_CACHE);
      const hit = await cache.match(url);
      if (hit) return URL.createObjectURL(await hit.blob());
    }
    const row = await tx<StoredRow | undefined>('readonly', (s) => s.get(url));
    if (row?.blob) return URL.createObjectURL(row.blob);
    return null;
  } catch {
    return null;
  }
}

export async function removeOfflineFile(url: string): Promise<void> {
  if (!hasIdb()) return;
  if (hasCache()) {
    const cache = await caches.open(OFFLINE_CACHE);
    await cache.delete(url).catch(() => undefined);
  }
  await tx('readwrite', (s) => s.delete(url));
}

/** تنسيق الحجم للعرض */
export function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return '';
  const units = ['بايت', 'كيلوبايت', 'ميغابايت', 'غيغابايت'];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n >= 10 || i === 0 ? Math.round(n) : n.toFixed(1)} ${units[i]}`;
}

/** يستنتج نوع الملف من الامتداد حين لا يصل نوع صريح من الخادم */
export function guessMime(url: string, mimeType?: string | null): string {
  if (mimeType) return mimeType;
  const clean = url.split('?')[0].toLowerCase();
  const ext = clean.slice(clean.lastIndexOf('.') + 1);
  const map: Record<string, string> = {
    pdf: 'application/pdf',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    gif: 'image/gif',
    mp3: 'audio/mpeg',
    m4a: 'audio/mp4',
    aac: 'audio/aac',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    opus: 'audio/opus',
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
  };
  return map[ext] || 'application/octet-stream';
}

/** هل الملف قابلاً للعرض داخل التطبيق؟ */
export function canPreviewInApp(mime: string): boolean {
  return mime === 'application/pdf' || mime.startsWith('image/') || mime.startsWith('audio/') || mime.startsWith('video/');
}

/** بادئة عرض قصيرة للملف */
export function fileBadge(mime: string): string {
  if (mime === 'application/pdf') return 'PDF';
  if (mime.startsWith('image/')) return 'صورة';
  if (mime.startsWith('audio/')) return 'صوت';
  if (mime.startsWith('video/')) return 'فيديو';
  if (mime.includes('word')) return 'Word';
  if (mime.includes('sheet') || mime.includes('excel')) return 'Excel';
  if (mime.includes('presentation') || mime.includes('powerpoint')) return 'PowerPoint';
  return 'ملف';
}
