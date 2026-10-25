import { put } from '@vercel/blob/client';
import { getApiBase } from './serverUrl';

export type MediaOwnerType = 'subject' | 'unit' | 'lesson' | 'exam' | 'library' | 'interactive-lesson';
export type MediaCategory = '' | 'textbook' | 'exam' | 'notes' | 'past-exams' | 'worksheets';

export interface MediaAsset {
  id: string;
  kind: string;
  title: string;
  url: string;
  category?: string | null;
  originalName?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  description?: string | null;
  createdAt?: string | null;
}

export const MIME: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain',
  csv: 'text/csv',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  opus: 'audio/opus',
  flac: 'audio/flac',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
};
const MB = 1024 * 1024;

/**
 * الحجم بلغة مفهومة. الرسالة القديمة كانت تقول «حجم الملف يتجاوز ٢٠ ميغابايت»
 * حتى لو كان الملف **فارغاً (٠ بايت)** — وهي الحالة التي يراها المستخدم فعلاً
 * مع منتقي ملفات أندرويد حين يعيد ملفاً افتراضياً من السحابة (Drive).
 * الآن نطبع الحجم الحقيقي دائماً، ونفرّق بين: فارغ / صيغة غير مدعومة / أكبر من الحد.
 */
export function formatFileSize(bytes?: number | null): string {
  if (bytes == null || !Number.isFinite(bytes)) return '';
  if (bytes < 1024) return `${bytes} بايت`;
  if (bytes < MB) return `${(bytes / 1024).toFixed(0)} كيلوبايت`;
  return `${(bytes / MB).toFixed(bytes < 10 * MB ? 2 : 1)} ميغابايت`;
}

/** نوع الملف كما سيراه الخادم؛ نطبّعه حتى لو أرسل أندرويد `''` أو octet-stream. */
export function resolveMime(file: File): string | undefined {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const declared = file.type && file.type !== 'application/octet-stream' ? file.type : '';
  return declared || MIME[ext];
}

/** فحص محلي **قبل** الرفع، برسائل تقول السبب والحجم الفعلي. */
export function validateFile(file: File): { ok: true; mime: string; limitMb: number } | { ok: false; reason: string } {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const mime = resolveMime(file);
  if (!mime || !MIME[ext]) {
    return { ok: false, reason: `«${file.name}» صيغته غير مدعومة${ext ? ` (${ext})` : ''}. المقبول: PDF, Word, Excel, PowerPoint, صور, صوت, فيديو.` };
  }
  const limit = mime.startsWith('audio/') ? 50 * MB : mime.startsWith('video/') ? 100 * MB : 20 * MB;
  if (!file.size || file.size < 1) {
    return {
      ok: false,
      reason: `«${file.name}» وصل فارغاً (٠ بايت) — متصفح الجوال لم يقرأ الملف. نزّله على ذاكرة الهاتف أولاً ثم اختره من «التنزيلات».`,
    };
  }
  if (file.size > limit) {
    return {
      ok: false,
      reason: `«${file.name}» حجمه ${formatFileSize(file.size)} والحد ${Math.round(limit / MB)} ميغابايت. اضغط الـPDF (مثلاً عبر تطبيق Smallpdf أو iLovePDF) ثم ارفعه.`,
    };
  }
  return { ok: true, mime, limitMb: Math.round(limit / MB) };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${getApiBase()}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'X-App': 'admin',
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...((init?.headers as Record<string, string>) || {}),
    },
  });
  const data = (await r.json().catch(() => ({}))) as T & { error?: string };
  if (!r.ok) throw new Error(data.error || `تعذّر إتمام العملية (${r.status})`);
  return data;
}

export async function uploadMediaAsset(a: {
  ownerType: MediaOwnerType;
  ownerId: string;
  file: File;
  title?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  onProgress?: (percent: number) => void;
}) {
  /* أثر واضح في console: بدونه ما كان ممكن نعرف هل الملف وصل بحجمه الحقيقي
     أم أن منتقي أندرويد أعاده فارغاً — وهذا سبب «الرفض يحمل» سابقاً. */
  // eslint-disable-next-line no-console
  console.info('[media] picked', { name: a.file.name, size: a.file.size, type: a.file.type, ownerType: a.ownerType, ownerId: a.ownerId });

  const check = validateFile(a.file);
  if (!check.ok) throw new Error(check.reason);
  const mime = check.mime;
  const ext = a.file.name.split('.').pop()?.toLowerCase() || 'bin';

  const name =
    a.file.name
      .normalize('NFKD')
      .replace(/[^\p{L}\p{N}._-]+/gu, '_')
      .slice(-110) || `media.${ext}`;
  const pathname = `media/public/${a.ownerType}/${encodeURIComponent(a.ownerId)}/${crypto.randomUUID()}-${name}`;
  const multipart = a.file.size > 5 * MB;
  const clientPayload = {
    ...(a.metadata || {}),
    ownerType: a.ownerType,
    ownerId: a.ownerId,
    access: 'public',
    title: a.title || a.file.name,
    description: a.description || '',
    fileName: a.file.name,
    mimeType: mime,
    sizeBytes: a.file.size,
  };

  const { clientToken } = await request<{ clientToken: string }>('/api/media/upload', {
    method: 'POST',
    body: JSON.stringify({
      type: 'blob.generate-client-token',
      payload: { pathname, clientPayload: JSON.stringify(clientPayload), multipart },
    }),
  });

  const blob = await put(pathname, a.file, {
    access: 'public',
    token: clientToken,
    contentType: mime,
    multipart,
    onUploadProgress: ({ percentage }) => a.onProgress?.(percentage),
  });
  // eslint-disable-next-line no-console
  console.info('[media] uploaded', { url: blob.url, size: formatFileSize(a.file.size) });
  return { url: blob.url, pathname: blob.pathname };
}

export async function listMediaAssets(ownerType: MediaOwnerType, ownerId: string) {
  const q = new URLSearchParams({ ownerType, ownerId });
  return (await request<{ assets: MediaAsset[] }>(`/api/media?${q}`)).assets;
}

export async function addMediaLink(ownerType: MediaOwnerType, ownerId: string, title: string, url: string, category?: string) {
  return (
    await request<{ asset: MediaAsset }>('/api/media/links', {
      method: 'POST',
      body: JSON.stringify({ ownerType, ownerId, title, url, category: category || undefined }),
    })
  ).asset;
}

export async function deleteMediaAsset(id: string) {
  await request(`/api/media/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function updateMediaCategory(id: string, category: string) {
  return (
    await request<{ asset: MediaAsset }>(`/api/media/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ category }),
    })
  ).asset;
}
