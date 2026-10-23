import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { del, get, head } from '@vercel/blob';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { Router, type Request } from 'express';
import { prisma } from '../lib/prisma.js';
import { cleanText, currentUser, requireAdmin, requireAuth } from '../lib/auth.js';

export const mediaRouter = Router();
const MB = 1024 * 1024;
const LIMIT = { document: 20 * MB, image: 20 * MB, audio: 50 * MB, video: 100 * MB } as const;
type Access = 'public' | 'private';
type Kind = keyof typeof LIMIT;
type Owner = 'subject' | 'unit' | 'lesson' | 'exam' | 'library' | 'interactive-lesson' | 'planner-event';
const TYPES: Record<string, { ext: string; kind: Kind }> = {
  'application/pdf': { ext: 'pdf', kind: 'document' },
  'application/msword': { ext: 'doc', kind: 'document' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { ext: 'docx', kind: 'document' },
  'application/vnd.ms-excel': { ext: 'xls', kind: 'document' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { ext: 'xlsx', kind: 'document' },
  'application/vnd.ms-powerpoint': { ext: 'ppt', kind: 'document' },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': { ext: 'pptx', kind: 'document' },
  'text/plain': { ext: 'txt', kind: 'document' },
  'text/csv': { ext: 'csv', kind: 'document' },
  'image/jpeg': { ext: 'jpg', kind: 'image' },
  'image/png': { ext: 'png', kind: 'image' },
  'image/webp': { ext: 'webp', kind: 'image' },
  'image/gif': { ext: 'gif', kind: 'image' },
  'audio/mpeg': { ext: 'mp3', kind: 'audio' },
  'audio/mp4': { ext: 'm4a', kind: 'audio' },
  'audio/aac': { ext: 'aac', kind: 'audio' },
  'audio/wav': { ext: 'wav', kind: 'audio' },
  'audio/x-wav': { ext: 'wav', kind: 'audio' },
  'audio/ogg': { ext: 'ogg', kind: 'audio' },
  'audio/opus': { ext: 'opus', kind: 'audio' },
  'audio/flac': { ext: 'flac', kind: 'audio' },
  'video/mp4': { ext: 'mp4', kind: 'video' },
  'video/webm': { ext: 'webm', kind: 'video' },
  'video/quicktime': { ext: 'mov', kind: 'video' },
};
const ADMIN_OWNERS = new Set<Owner>(['subject', 'unit', 'lesson', 'exam', 'library', 'interactive-lesson']);
/* Vercel يولّد اسم المتغيّر من اسم المخزن الذي تربطه. المخزن الخاص في هذا المشروع
   مربوط بالبادئة BLOB_PRIVATE_READ_WRITE_TOKEN، فيصل الرمز باسم
   BLOB_PRIVATE_READ_WRITE_TOKEN_READ_WRITE_TOKEN. نقبل الاسمين حتى يعمل المشروع
   دون إعادة ربط المخزن أو نسخ أي سر يدوياً. */
const blobToken = (access: Access) =>
  access === 'private'
    ? process.env.PRIVATE_BLOB_READ_WRITE_TOKEN ??
      process.env.BLOB_PRIVATE_READ_WRITE_TOKEN_READ_WRITE_TOKEN
    : process.env.BLOB_READ_WRITE_TOKEN;
const userOf = (req: Request) => (req as Request & { user?: ReturnType<typeof currentUser> }).user;
function parsePayload(value: string | null | undefined): Record<string, unknown> {
  if (!value) throw new Error('بيانات الرفع ناقصة');
  try { return JSON.parse(value) as Record<string, unknown>; } catch { throw new Error('بيانات الرفع غير صالحة'); }
}
async function ownsReview(uid: string, eventId: string) {
  const event = await prisma.plannerEvent.findFirst({ where: { id: eventId, userId: uid }, select: { type: true } });
  return event?.type === 'review';
}
export function mediaAssetDto(asset: {
  id: string; kind: string; access: string; ownerType: string; ownerId: string; userId: string | null;
  subjectId: string | null; category: string | null; title: string; description: string | null;
  originalName: string | null; mimeType: string | null; sizeBytes: number | null; pathname: string | null;
  url: string | null; externalUrl: string | null; createdAt: Date;
}) {
  const { pathname: _pathname, userId: _userId, ...safe } = asset;
  return { ...safe, url: asset.access === 'private' ? `/api/media/${asset.id}/content` : asset.externalUrl || asset.url };
}

mediaRouter.post('/media/upload', async (req, res) => {
  try {
    const body = req.body as HandleUploadBody;
    if (!body || !['blob.generate-client-token', 'blob.upload-completed'].includes(body.type)) {
      res.status(400).json({ error: 'طلب رفع غير صالح' }); return;
    }
    const callback = body.type === 'blob.upload-completed';
    const actor = userOf(req);
    if (!callback && !(actor?.role === 'admin' && actor.app === 'admin') && !(actor?.role === 'student' && actor.app === 'student')) {
      res.status(403).json({ error: 'غير مخوّل برفع الملفات' }); return;
    }
    if (body.type === 'blob.generate-client-token') {
      let data: Record<string, unknown>;
      try { data = parsePayload(body.payload.clientPayload); }
      catch (error) { res.status(400).json({ error: (error as Error).message }); return; }
      const access: Access = data.access === 'private' ? 'private' : 'public';
      const owner = cleanText(data.ownerType, 40) as Owner;
      const ownerId = cleanText(data.ownerId, 120);
      const mime = cleanText(data.mimeType, 120).toLowerCase();
      const file = TYPES[mime];
      const size = Number(data.sizeBytes);
      const fileName = cleanText(data.fileName, 180);
      if (!file || !fileName || !ownerId || !Number.isSafeInteger(size) || size < 1 || size > LIMIT[file.kind]) {
        res.status(400).json({ error: 'نوع الملف أو حجمه غير مسموح' }); return;
      }
      if (access === 'public' && !(actor?.role === 'admin' && actor.app === 'admin' && ADMIN_OWNERS.has(owner))) {
        res.status(403).json({ error: 'رفع الوسائط العامة متاح للإدارة فقط' }); return;
      }
      if (access === 'private' && !(actor?.role === 'student' && actor.app === 'student' && owner === 'planner-event' && await ownsReview(actor.uid, ownerId))) {
        res.status(403).json({ error: 'المرفقات الخاصة متاحة لجلسات المراجعة الشخصية فقط' }); return;
      }
      const prefix = `media/${access}/${owner}/${ownerId}/`;
      if (!body.payload.pathname.startsWith(prefix) || body.payload.pathname.slice(prefix.length).includes('/')) {
        res.status(400).json({ error: 'مسار التخزين غير صالح' }); return;
      }
      const ext = path.extname(fileName).slice(1).toLowerCase();
      if (ext !== file.ext && !(file.kind === 'image' && ext === 'jpeg')) {
        res.status(400).json({ error: 'امتداد الملف لا يطابق نوعه' }); return;
      }
      const host = process.env.VERCEL_ENV === 'production' ? process.env.VERCEL_PROJECT_PRODUCTION_URL : process.env.VERCEL_URL;
      const origin = host ? `https://${host}` : `${req.protocol}://${req.get('host')}`;
      (body.payload as typeof body.payload & { callbackUrl?: string }).callbackUrl = `${origin}${req.originalUrl}`;
    }
    const payloadRaw = body.type === 'blob.generate-client-token' ? body.payload.clientPayload : body.payload.tokenPayload;
    const requestedAccess: Access = parsePayload(payloadRaw).access === 'private' ? 'private' : 'public';
    const token = blobToken(requestedAccess);
    if (!token) { res.status(503).json({ error: requestedAccess === 'private' ? 'مخزن Blob الخاص غير مضبوط في API' : 'مخزن Blob العام غير مضبوط في API' }); return; }
    const request = Object.create(req) as Request;
    request.url = req.originalUrl;
    const result = await handleUpload({
      body, request, token,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const data = parsePayload(clientPayload);
        const access: Access = data.access === 'private' ? 'private' : 'public';
        const owner = cleanText(data.ownerType, 40) as Owner;
        const ownerId = cleanText(data.ownerId, 120);
        const mime = cleanText(data.mimeType, 120).toLowerCase();
        const file = TYPES[mime];
        const size = Number(data.sizeBytes);
        const user = userOf(req);
        if (!file || !Number.isSafeInteger(size) || size < 1 || size > LIMIT[file.kind]) throw new Error('نوع الملف أو حجمه غير مسموح');
        if (access === 'public' && !(user?.role === 'admin' && user.app === 'admin' && ADMIN_OWNERS.has(owner))) throw new Error('رفع الوسائط العامة متاح للإدارة فقط');
        if (access === 'private' && !(user?.role === 'student' && user.app === 'student' && owner === 'planner-event' && await ownsReview(user.uid, ownerId))) throw new Error('لا تملك صلاحية رفع هذا الملف');
        const prefix = `media/${access}/${owner}/${ownerId}/`;
        if (!pathname.startsWith(prefix) || pathname.slice(prefix.length).includes('/')) throw new Error('مسار تخزين غير صالح');
        return {
          allowedContentTypes: [mime], maximumSizeInBytes: LIMIT[file.kind], addRandomSuffix: true,
          tokenPayload: JSON.stringify({ access, ownerType: owner, ownerId, userId: access === 'private' ? user?.uid : null,
            kind: file.kind, title: cleanText(data.title, 180) || cleanText(data.fileName, 180),
            description: cleanText(data.description, 1000), originalName: cleanText(data.fileName, 180),
            mimeType: mime, subjectId: cleanText(data.subjectId, 80), category: cleanText(data.category, 40),
            author: cleanText(data.author, 100), publishYear: cleanText(data.publishYear, 9), pageCount: Number(data.pageCount) || 0 }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const data = parsePayload(tokenPayload);
        const access: Access = data.access === 'private' ? 'private' : 'public';
        const ownerType = cleanText(data.ownerType, 40);
        const ownerId = cleanText(data.ownerId, 120);
        const userId = access === 'private' ? cleanText(data.userId, 120) : null;
        if (access === 'private' && (!userId || !await ownsReview(userId, ownerId))) {
          await del(blob.pathname, { token: blobToken(access) }); throw new Error('تعذّر التحقق من مالك الملف');
        }
        const actual = await head(blob.pathname, { token: blobToken(access) });
        const mime = cleanText(data.mimeType, 120).toLowerCase();
        const file = TYPES[mime];
        if (!file || actual.contentType.toLowerCase().split(';')[0] !== mime || actual.size < 1 || actual.size > LIMIT[file.kind]) {
          await del(blob.pathname, { token: blobToken(access) }); throw new Error('بيانات الملف المرفوع غير مطابقة');
        }
        const asset = await prisma.mediaAsset.upsert({
          where: { pathname: blob.pathname },
          create: { id: `media-${randomUUID()}`, kind: file.kind, access, ownerType, ownerId, userId,
            subjectId: cleanText(data.subjectId, 80) || null, category: cleanText(data.category, 40) || null,
            title: cleanText(data.title, 180) || 'وسيط', description: cleanText(data.description, 1000) || null,
            originalName: cleanText(data.originalName, 180) || null, mimeType: mime, sizeBytes: actual.size,
            pathname: blob.pathname, url: access === 'public' ? blob.url : null }, update: {},
        });
        if (access === 'public' && ownerType === 'library') {
          await prisma.resource.upsert({
            where: { id: asset.id },
            create: { id: asset.id, subjectId: asset.subjectId, title: asset.title, category: asset.category || 'notes',
              fileType: path.extname(blob.pathname).slice(1).toUpperCase() || 'FILE',
              fileSize: `${(actual.size / MB).toFixed(1)} MB`, pageCount: Number(data.pageCount) || 0,
              author: cleanText(data.author, 100) || null, publishYear: cleanText(data.publishYear, 9) || null,
              isVerifiedCurriculum: false, downloadCount: 0, description: asset.description || '', previewSummary: '[]',
              filePath: asset.url, status: 'sample' },
            update: { filePath: asset.url },
          });
        }
      },
    });
    res.json(result);
  } catch (error) {
    console.error('[media]', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'تعذّر رفع الملف' });
  }
});

mediaRouter.post('/media/links', requireAdmin, async (req, res) => {
  try {
    const title = cleanText(req.body?.title, 180);
    const ownerType = cleanText(req.body?.ownerType, 40) as Owner;
    const ownerId = cleanText(req.body?.ownerId, 120);
    const rawUrl = cleanText(req.body?.url, 2048);
    let url: URL;
    try { url = new URL(rawUrl); } catch { res.status(400).json({ error: 'الرابط غير صالح' }); return; }
    if (!title || !ownerId || !ADMIN_OWNERS.has(ownerType) || !['http:', 'https:'].includes(url.protocol)) {
      res.status(400).json({ error: 'بيانات الرابط غير صالحة' }); return;
    }
    const asset = await prisma.mediaAsset.create({ data: {
      id: `media-${randomUUID()}`, kind: 'link', access: 'public', ownerType, ownerId,
      title, externalUrl: url.toString(), category: cleanText(req.body?.category, 40) || null,
      subjectId: cleanText(req.body?.subjectId, 80) || null, description: cleanText(req.body?.description, 1000) || null,
    } });
    if (ownerType === 'library') await prisma.resource.create({ data: {
      id: asset.id, subjectId: asset.subjectId, title, category: asset.category || 'notes', fileType: 'LINK',
      fileSize: 'رابط خارجي', pageCount: 0, isVerifiedCurriculum: false, downloadCount: 0,
      description: asset.description || '', previewSummary: '[]', filePath: url.toString(), status: 'sample',
    } });
    res.status(201).json({ asset: mediaAssetDto(asset) });
  } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : 'تعذّر حفظ الرابط' }); }
});

mediaRouter.get('/media', requireAuth, async (req, res) => {
  const user = currentUser(req);
  const ownerType = cleanText(req.query.ownerType, 40);
  const ownerId = cleanText(req.query.ownerId, 120);
  if (!ownerType || !ownerId) { res.status(400).json({ error: 'نوع المحتوى ومعرّفه مطلوبان' }); return; }
  const where = user.role === 'admin' && user.app === 'admin'
    ? { ownerType, ownerId, access: 'public' }
    : { ownerType, ownerId, OR: [{ access: 'public' }, { access: 'private', userId: user.uid }] };
  const assets = await prisma.mediaAsset.findMany({ where, orderBy: { createdAt: 'asc' } });
  res.setHeader('Cache-Control', 'private, no-store');
  res.json({ assets: assets.map(mediaAssetDto) });
});

mediaRouter.get('/media/:id/content', requireAuth, async (req, res) => {
  const user = currentUser(req);
  const asset = await prisma.mediaAsset.findUnique({ where: { id: req.params.id } });
  if (!asset) { res.status(404).end(); return; }
  if (asset.access !== 'private' || asset.userId !== user.uid || user.role !== 'student' || user.app !== 'student') { res.status(403).end(); return; }
  try {
    const result = await get(asset.pathname!, { access: 'private', token: blobToken('private'), headers: req.headers.range ? { Range: req.headers.range } : undefined });
    if (!result) { res.status(404).end(); return; }
    res.setHeader('Content-Type', result.blob.contentType || asset.mimeType || 'application/octet-stream');
    res.setHeader('Content-Length', result.headers.get('content-length') || String(result.blob.size));
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Accept-Ranges', result.headers.get('accept-ranges') || 'bytes');
    const range = result.headers.get('content-range');
    if (range) { res.setHeader('Content-Range', range); res.status(206); }
    const { Readable } = await import('node:stream');
    Readable.fromWeb(result.stream as import('node:stream/web').ReadableStream).pipe(res);
  } catch (error) { console.error('[private media read]', error); res.status(502).end(); }
});

/**
 * تغيير تصنيف وسيط موجود (كتاب / امتحان / مذكرة …) بدون إعادة رفع.
 * الغرض: الملفات التي رُفعت قبل إضافة خيار النوع يمكن تصحيحها من اللوحة.
 */
mediaRouter.patch('/media/:id', requireAdmin, async (req, res) => {
  const ALLOWED = new Set(['', 'textbook', 'exam', 'notes', 'worksheets', 'past-exams']);
  const raw = cleanText(req.body?.category, 40);
  if (!ALLOWED.has(raw)) { res.status(400).json({ error: 'تصنيف غير معروف' }); return; }
  const existing = await prisma.mediaAsset.findUnique({ where: { id: req.params.id }, select: { id: true, ownerType: true } });
  if (!existing) { res.status(404).json({ error: 'الوسيط غير موجود' }); return; }
  const asset = await prisma.mediaAsset.update({ where: { id: existing.id }, data: { category: raw || null } });
  if (existing.ownerType === 'library') {
    await prisma.resource.updateMany({ where: { id: asset.id }, data: { category: asset.category || 'notes' } });
  }
  res.json({ asset: mediaAssetDto(asset) });
});

mediaRouter.delete('/media/:id', requireAuth, async (req, res) => {
  const user = currentUser(req);
  const asset = await prisma.mediaAsset.findUnique({ where: { id: req.params.id } });
  if (!asset) { res.status(404).json({ error: 'الوسيط غير موجود' }); return; }
  const allowed = asset.access === 'private'
    ? asset.userId === user.uid && user.role === 'student' && user.app === 'student'
    : user.role === 'admin' && user.app === 'admin';
  if (!allowed) { res.status(403).json({ error: 'غير مخوّل' }); return; }
  try {
    if (asset.pathname) await del(asset.pathname, { token: blobToken(asset.access as Access) });
    if (asset.ownerType === 'library') await prisma.resource.deleteMany({ where: { id: asset.id } });
    await prisma.mediaAsset.delete({ where: { id: asset.id } });
    res.json({ ok: true });
  } catch (error) { res.status(502).json({ error: error instanceof Error ? error.message : 'تعذّر الحذف' }); }
});

export async function deleteMediaForOwner(ownerType: string, ownerIds: string[], userId?: string) {
  if (!ownerIds.length) return;
  const where = { ownerType, ownerId: { in: ownerIds }, ...(userId ? { userId } : {}) };
  const assets = await prisma.mediaAsset.findMany({ where, select: { id: true, pathname: true, access: true } });
  for (const asset of assets) if (asset.pathname) await del(asset.pathname, { token: blobToken(asset.access as Access) });
  if (ownerType === 'library' && assets.length) await prisma.resource.deleteMany({ where: { id: { in: assets.map(a => a.id) } } });
  await prisma.mediaAsset.deleteMany({ where });
}
