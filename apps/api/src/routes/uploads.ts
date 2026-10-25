import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import { put, del } from '@vercel/blob';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import { prisma } from '../lib/prisma.js';
import { cleanText, currentUser, requireAdmin, requireAuth } from '../lib/auth.js';
import { UPLOAD_DIR, ensureUploadDir } from '../lib/paths.js';

export const uploadsRouter = Router();

if (!process.env.VERCEL) ensureUploadDir();

const MAX_SIZE = 60 * 1024 * 1024; // ٦٠ ميغابايت — كتب PDF الرسمية تصل ٥٠
const ALLOWED = new Map([
  ['application/pdf', 'pdf'],
  ['application/msword', 'doc'],
  ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'docx'],
  ['application/vnd.ms-excel', 'xls'],
  ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'xlsx'],
  ['application/vnd.ms-powerpoint', 'ppt'],
  ['application/vnd.openxmlformats-officedocument.presentationml.presentation', 'pptx'],
  ['text/plain', 'txt'],
  ['text/csv', 'csv'],
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);

const ALLOWED_EXTENSIONS = new Set(ALLOWED.values());
const fileExtension = (file: Express.Multer.File): string | undefined => {
  const byMime = ALLOWED.get(file.mimetype);
  if (byMime) return byMime;
  const byName = path.extname(file.originalname).slice(1).toLowerCase();
  return file.mimetype === 'application/octet-stream' && ALLOWED_EXTENSIONS.has(byName) ? byName : undefined;
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (fileExtension(file)) cb(null, true);
    else cb(new Error('نوع الملف غير مدعوم — PDF أو Office أو TXT/CSV أو صورة'));
  },
});

/** يحول أخطاء multer إلى ردّ 400 برسالة واضحة */
function runUpload(req: Request, res: Response): Promise<void> {
  return new Promise((resolve) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        res.status(400).json({ error: (err as Error).message || 'تعذّر رفع الملف' });
      }
      resolve();
    });
  });
}

const humanSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} بايت`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} كيلوبايت`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} ميغابايت`;
};

/** تخزين دائم على Vercel Blob في الإنتاج؛ ملفات محلية للتطوير فقط. */
async function storeUploadedFile(file: Express.Multer.File): Promise<string> {
  const safe = path.basename(file.originalname).replace(/[^\p{L}\p{N}._-]/gu, '_').slice(0, 80) || 'file';
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (token) {
    const result = await put(`uploads/${Date.now()}-${randomUUID()}-${safe}`, file.buffer, { access: 'public', token });
    return result.url;
  }
  if (process.env.VERCEL) throw new Error('تخزين الملفات الدائم غير مُعدّ: أضف BLOB_READ_WRITE_TOKEN في إعدادات API على Vercel.');
  ensureUploadDir();
  const filename = `${Date.now()}-${randomUUID()}-${safe}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), file.buffer);
  return `/uploads/${filename}`;
}

async function deleteStoredFile(fileUrl: string): Promise<void> {
  if (fileUrl.startsWith('/uploads/')) {
    const full = path.join(UPLOAD_DIR, path.basename(fileUrl));
    if (fs.existsSync(full)) fs.unlinkSync(full);
    return;
  }
  if (fileUrl.startsWith('https://') && process.env.BLOB_READ_WRITE_TOKEN) {
    await del(fileUrl, { token: process.env.BLOB_READ_WRITE_TOKEN });
  }
}

/* ============================ رفع ملف للمكتبة ============================ */

uploadsRouter.post('/uploads/resource', requireAuth, async (req, res) => {
  await runUpload(req, res);
  if (res.headersSent) return;
  try {
    if (!req.file) {
      res.status(400).json({ error: 'لم يتم اختيار ملف' });
      return;
    }
    const title = cleanText(req.body?.title, 150) || req.file.originalname;
    const subjectId = cleanText(req.body?.subjectId, 40) || null;
    const category = cleanText(req.body?.category, 30) || 'notes';
    const description = cleanText(req.body?.description, 600);
    const author = cleanText(req.body?.author, 80) || null;
    const user = currentUser(req);

    const ext = fileExtension(req.file) ?? 'bin';
    const filePath = await storeUploadedFile(req.file);
    let resource;
    try {
      resource = await prisma.resource.create({
      data: {
        id: `upl-${Date.now().toString(36)}`,
        subjectId,
        title,
        category,
        fileType: ext.toUpperCase(),
        fileSize: humanSize(req.file.size),
        pageCount: Number(req.body?.pageCount) || 0,
        author,
        publishYear: cleanText(req.body?.publishYear, 9) || null,
        isVerifiedCurriculum: false,
        downloadCount: 0,
        description,
        previewSummary: '[]',
        filePath,
        status: 'sample',
      },
      });
    } catch (e) {
      await deleteStoredFile(filePath).catch(() => undefined);
      throw e;
    }

    console.log(`📤 ${user.name} رفع ملفاً: ${title}`);
    res.status(201).json({ resource: { ...resource, previewSummary: [] } });
  } catch (e) {
    console.error('upload error:', e);
    res.status(400).json({ error: (e as Error).message || 'تعذّر رفع الملف' });
  }
});

/* ============================ رفع مباشر لمرفقات الامتحانات ============================ */

const examBlobClientRoute = '/admin/exams/:examId/attachments/client';
const allowedBlobTypes = [...ALLOWED.keys()];

/** يحفظ بيانات Blob de-duplicated (Vercel قد يعيد callback عند إعادة المحاولة). */
async function saveExamBlob(
  blob: { url: string; pathname: string; contentType: string },
  tokenPayload: string | null | undefined,
): Promise<void> {
  if (!tokenPayload) throw new Error('بيانات رفع الملف غير مكتملة');
  const payload = JSON.parse(tokenPayload) as {
    examId?: string; fileName?: string; sizeBytes?: number; userName?: string;
  };
  const examId = cleanText(payload.examId, 80);
  const exam = await prisma.exam.findUnique({
    where: { id: examId }, select: { id: true, title: true, subjectId: true },
  });
  if (!exam) throw new Error('الامتحان غير موجود');

  const extension = path.extname(blob.pathname).slice(1).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(extension)) throw new Error('نوع الملف غير مدعوم');
  const fileType = extension.toUpperCase();
  const safeName = cleanText(payload.fileName, 150) || path.basename(blob.pathname);
  const bytes = Number(payload.sizeBytes);
  const fileSize = Number.isFinite(bytes) && bytes >= 0 && bytes <= MAX_SIZE
    ? humanSize(bytes)
    : 'غير محدد';
  const id = `examfile-${exam.id}-${createHash('sha256').update(blob.pathname).digest('hex').slice(0, 24)}`;
  const data = {
    subjectId: exam.subjectId,
    title: safeName,
    category: 'exam-attachment',
    fileType,
    fileSize,
    pageCount: 0,
    author: cleanText(payload.userName, 80) || 'الإدارة',
    publishYear: null,
    isVerifiedCurriculum: false,
    downloadCount: 0,
    description: `مرفق للامتحان ${exam.title}`,
    previewSummary: '[]',
    filePath: blob.url,
    status: 'sample',
  };
  await prisma.resource.upsert({ where: { id }, create: { id, ...data }, update: { ...data } });
}

/**
 * يمرّر Vercel Blob upload bytes مباشرةً من المتصفح إلى التخزين، لا عبر Function.
 * حدث الإكمال يأتي من Vercel بلا جلسة مستخدم؛ التفويض مطلوب فقط لطلب إصدار الرمز.
 */
uploadsRouter.post(examBlobClientRoute, async (req, res) => {
  try {
    const body = req.body as HandleUploadBody;
    if (body?.type === 'blob.generate-client-token') {
      // لا نثق بعنوان callback القادم من المتصفح؛ نوجّهه إلى مشروع API الحالي.
      const vercelHost = process.env.VERCEL_ENV === 'production'
        ? process.env.VERCEL_PROJECT_PRODUCTION_URL
        : process.env.VERCEL_URL;
      const origin = vercelHost ? `https://${vercelHost}` : `${req.protocol}://${req.get('host')}`;
      ;(body.payload as typeof body.payload & { callbackUrl?: string }).callbackUrl = `${origin}${req.originalUrl}`;
    }
    if (body?.type !== 'blob.upload-completed') {
      let authorized = false;
      requireAdmin(req, res, () => { authorized = true; });
      if (!authorized) return;
    }

    // Express يزيل بادئة mount من req.url؛ نعيد استخدام originalUrl حتى يكوّن
    // SDK عنوان callback كاملاً (/api/...) على مشروع Vercel الخاص بالـAPI.
    const blobRequest = Object.create(req) as Request;
    blobRequest.url = req.originalUrl;
    const response = await handleUpload({
      body,
      request: blobRequest,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const actor = currentUser(req);
        if (!actor || actor.role !== 'admin' || actor.app !== 'admin') {
          throw new Error('هذه العملية متاحة للإدارة فقط');
        }
        const examId = cleanText(req.params.examId, 80);
        const exam = await prisma.exam.findUnique({
          where: { id: examId }, select: { id: true },
        });
        if (!exam) throw new Error('الامتحان غير موجود');

        let client: { fileName?: unknown; sizeBytes?: unknown } = {};
        try { client = JSON.parse(clientPayload || '{}') as typeof client; }
        catch { throw new Error('بيانات الملف غير صالحة'); }
        const fileName = cleanText(client.fileName, 150);
        const sizeBytes = Number(client.sizeBytes);
        const extension = path.extname(fileName).slice(1).toLowerCase();
        if (!fileName || !ALLOWED_EXTENSIONS.has(extension)) throw new Error('نوع الملف غير مدعوم');
        if (!Number.isFinite(sizeBytes) || sizeBytes < 1 || sizeBytes > MAX_SIZE) {
          throw new Error('حجم الملف أكبر من ٦٠ ميغابايت');
        }
        const expectedPrefix = `exam-attachments/${exam.id}/`;
        if (!pathname.startsWith(expectedPrefix) || pathname.slice(expectedPrefix.length).includes('/')) {
          throw new Error('مسار مرفق الامتحان غير صالح');
        }
        return {
          allowedContentTypes: allowedBlobTypes,
          maximumSizeInBytes: MAX_SIZE,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            examId: exam.id, fileName, sizeBytes, userName: actor.name,
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        await saveExamBlob(blob, tokenPayload);
      },
    });
    res.status(200).json(response);
  } catch (e) {
    console.error('exam client upload error:', e);
    const message = e instanceof Error ? e.message : 'تعذّر إصدار إذن رفع الملف';
    res.status(400).json({ error: message });
  }
});

/* ============================ رفع مباشر لمرفقات الدروس ============================ */

const lessonBlobClientRoute = '/admin/lessons/:lessonId/attachments/client';

async function saveLessonBlob(
  blob: { url: string; pathname: string; contentType: string },
  tokenPayload: string | null | undefined,
): Promise<void> {
  if (!tokenPayload) throw new Error('بيانات رفع الملف غير مكتملة');
  const payload = JSON.parse(tokenPayload) as {
    lessonId?: string; fileName?: string; sizeBytes?: number;
  };
  const lessonId = cleanText(payload.lessonId, 80);
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { id: true, attachments: true } });
  if (!lesson) throw new Error('الدرس غير موجود');
  const extension = path.extname(blob.pathname).slice(1).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(extension)) throw new Error('نوع الملف غير مدعوم');
  const bytes = Number(payload.sizeBytes);
  if (!Number.isFinite(bytes) || bytes < 1 || bytes > MAX_SIZE) throw new Error('حجم الملف غير صالح');
  const id = `lessonfile-${lesson.id}-${createHash('sha256').update(blob.pathname).digest('hex').slice(0, 24)}`;
  let existing: Array<Record<string, unknown>> = [];
  try {
    const parsed: unknown = JSON.parse(lesson.attachments);
    if (Array.isArray(parsed)) existing = parsed as Array<Record<string, unknown>>;
  } catch { /* أصلح قيمة مرفقات قديمة غير صالحة */ }
  if (existing.some((item) => item.id === id)) return;
  const attachment = {
    id,
    title: cleanText(payload.fileName, 150) || path.basename(blob.pathname),
    filePath: blob.url,
    fileType: extension.toUpperCase(),
    fileSize: humanSize(bytes),
  };
  await prisma.lesson.update({
    where: { id: lesson.id },
    data: { attachments: JSON.stringify([...existing, attachment]) },
  });
}

uploadsRouter.post(lessonBlobClientRoute, async (req, res) => {
  try {
    const body = req.body as HandleUploadBody;
    if (body?.type === 'blob.generate-client-token') {
      const vercelHost = process.env.VERCEL_ENV === 'production'
        ? process.env.VERCEL_PROJECT_PRODUCTION_URL
        : process.env.VERCEL_URL;
      const origin = vercelHost ? `https://${vercelHost}` : `${req.protocol}://${req.get('host')}`;
      ;(body.payload as typeof body.payload & { callbackUrl?: string }).callbackUrl = `${origin}${req.originalUrl}`;
    }
    if (body?.type !== 'blob.upload-completed') {
      let authorized = false;
      requireAdmin(req, res, () => { authorized = true; });
      if (!authorized) return;
    }
    const blobRequest = Object.create(req) as Request;
    blobRequest.url = req.originalUrl;
    const response = await handleUpload({
      body,
      request: blobRequest,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const actor = currentUser(req);
        if (!actor || actor.role !== 'admin' || actor.app !== 'admin') throw new Error('هذه العملية متاحة للإدارة فقط');
        const lessonId = cleanText(req.params.lessonId, 80);
        const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { id: true } });
        if (!lesson) throw new Error('الدرس غير موجود');
        let client: { fileName?: unknown; sizeBytes?: unknown } = {};
        try { client = JSON.parse(clientPayload || '{}') as typeof client; }
        catch { throw new Error('بيانات الملف غير صالحة'); }
        const fileName = cleanText(client.fileName, 150);
        const sizeBytes = Number(client.sizeBytes);
        const extension = path.extname(fileName).slice(1).toLowerCase();
        if (!fileName || !ALLOWED_EXTENSIONS.has(extension)) throw new Error('نوع الملف غير مدعوم');
        if (!Number.isFinite(sizeBytes) || sizeBytes < 1 || sizeBytes > MAX_SIZE) throw new Error('حجم الملف أكبر من ٦٠ ميغابايت');
        const expectedPrefix = `lesson-attachments/${lesson.id}/`;
        if (!pathname.startsWith(expectedPrefix) || pathname.slice(expectedPrefix.length).includes('/')) {
          throw new Error('مسار مرفق الدرس غير صالح');
        }
        return {
          allowedContentTypes: allowedBlobTypes,
          maximumSizeInBytes: MAX_SIZE,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ lessonId: lesson.id, fileName, sizeBytes }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => { await saveLessonBlob(blob, tokenPayload); },
    });
    res.status(200).json(response);
  } catch (e) {
    console.error('lesson client upload error:', e);
    res.status(400).json({ error: e instanceof Error ? e.message : 'تعذّر إصدار إذن رفع الملف' });
  }
});

/* ============================ رفع مباشر لعناصر المكتبة والكتب ============================ */

const resourceCategories = new Set(['notes', 'textbook', 'worksheets', 'past_exams']);
const resourceBlobClientRoute = '/uploads/resource/client';

async function saveResourceBlob(
  blob: { url: string; pathname: string; contentType: string },
  tokenPayload: string | null | undefined,
): Promise<void> {
  if (!tokenPayload) throw new Error('بيانات رفع الملف غير مكتملة');
  const payload = JSON.parse(tokenPayload) as {
    title?: string; category?: string; subjectId?: string; description?: string;
    author?: string; publishYear?: string; pageCount?: number; fileName?: string; sizeBytes?: number;
  };
  const extension = path.extname(blob.pathname).slice(1).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(extension)) throw new Error('نوع الملف غير مدعوم');
  const sizeBytes = Number(payload.sizeBytes);
  if (!Number.isFinite(sizeBytes) || sizeBytes < 1 || sizeBytes > MAX_SIZE) throw new Error('حجم الملف غير صالح');
  const category = cleanText(payload.category, 30);
  if (!resourceCategories.has(category)) throw new Error('تصنيف الملف غير صالح');
  const subjectId = cleanText(payload.subjectId, 40) || null;
  if (subjectId && !(await prisma.subject.findUnique({ where: { id: subjectId }, select: { id: true } }))) {
    throw new Error('المادة المحددة غير موجودة');
  }
  const id = `upl-${createHash('sha256').update(blob.pathname).digest('hex').slice(0, 32)}`;
  const data = {
    subjectId,
    title: cleanText(payload.title, 150) || cleanText(payload.fileName, 150) || path.basename(blob.pathname),
    category,
    fileType: extension.toUpperCase(),
    fileSize: humanSize(sizeBytes),
    pageCount: Math.max(0, Math.min(10000, Math.trunc(Number(payload.pageCount) || 0))),
    author: cleanText(payload.author, 80) || 'الإدارة',
    publishYear: cleanText(payload.publishYear, 9) || null,
    isVerifiedCurriculum: false,
    downloadCount: 0,
    description: cleanText(payload.description, 600),
    previewSummary: '[]',
    filePath: blob.url,
    status: 'sample',
  };
  await prisma.resource.upsert({ where: { id }, create: { id, ...data }, update: { ...data } });
}

uploadsRouter.post(resourceBlobClientRoute, async (req, res) => {
  try {
    const body = req.body as HandleUploadBody;
    if (body?.type === 'blob.generate-client-token') {
      const vercelHost = process.env.VERCEL_ENV === 'production'
        ? process.env.VERCEL_PROJECT_PRODUCTION_URL
        : process.env.VERCEL_URL;
      const origin = vercelHost ? `https://${vercelHost}` : `${req.protocol}://${req.get('host')}`;
      ;(body.payload as typeof body.payload & { callbackUrl?: string }).callbackUrl = `${origin}${req.originalUrl}`;
    }
    if (body?.type !== 'blob.upload-completed') {
      let authorized = false;
      requireAdmin(req, res, () => { authorized = true; });
      if (!authorized) return;
    }
    const blobRequest = Object.create(req) as Request;
    blobRequest.url = req.originalUrl;
    const response = await handleUpload({
      body,
      request: blobRequest,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const actor = currentUser(req);
        if (!actor || actor.role !== 'admin' || actor.app !== 'admin') throw new Error('هذه العملية متاحة للإدارة فقط');
        let client: Record<string, unknown>;
        try { client = JSON.parse(clientPayload || '{}') as Record<string, unknown>; }
        catch { throw new Error('بيانات الملف غير صالحة'); }
        const fileName = cleanText(client.fileName, 150);
        const extension = path.extname(fileName).slice(1).toLowerCase();
        const sizeBytes = Number(client.sizeBytes);
        const category = cleanText(client.category, 30);
        const subjectId = cleanText(client.subjectId, 40);
        if (!fileName || !ALLOWED_EXTENSIONS.has(extension)) throw new Error('نوع الملف غير مدعوم');
        if (!Number.isFinite(sizeBytes) || sizeBytes < 1 || sizeBytes > MAX_SIZE) throw new Error('حجم الملف أكبر من ٦٠ ميغابايت');
        if (!resourceCategories.has(category)) throw new Error('تصنيف الملف غير صالح');
        if (subjectId && !(await prisma.subject.findUnique({ where: { id: subjectId }, select: { id: true } }))) {
          throw new Error('المادة المحددة غير موجودة');
        }
        const prefix = 'library-uploads/';
        if (!pathname.startsWith(prefix) || pathname.slice(prefix.length).includes('/')) throw new Error('مسار ملف المكتبة غير صالح');
        return {
          allowedContentTypes: allowedBlobTypes,
          maximumSizeInBytes: MAX_SIZE,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            title: cleanText(client.title, 150), category, subjectId,
            description: cleanText(client.description, 600), author: cleanText(client.author, 80) || actor.name,
            publishYear: cleanText(client.publishYear, 9), pageCount: Number(client.pageCount) || 0,
            fileName, sizeBytes,
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => { await saveResourceBlob(blob, tokenPayload); },
    });
    res.status(200).json(response);
  } catch (e) {
    console.error('resource client upload error:', e);
    res.status(400).json({ error: e instanceof Error ? e.message : 'تعذّر إصدار إذن رفع الملف' });
  }
});

/* ============================ مرفقات الامتحانات (الإدارة) ============================ */

uploadsRouter.post('/admin/exams/:examId/attachments', requireAdmin, async (req, res) => {
  const exam = await prisma.exam.findUnique({ where: { id: req.params.examId }, select: { id: true, subjectId: true, title: true } });
  if (!exam) { res.status(404).json({ error: 'الامتحان غير موجود' }); return; }
  await runUpload(req, res);
  if (res.headersSent) return;
  if (!req.file) { res.status(400).json({ error: 'اختر ملفاً أولاً' }); return; }
  let filePath = '';
  try {
    const ext = fileExtension(req.file) ?? 'bin';
    filePath = await storeUploadedFile(req.file);
    const attachment = await prisma.resource.create({ data: {
      id: `examfile-${exam.id}-${randomUUID()}`, subjectId: exam.subjectId,
      title: cleanText(req.file.originalname, 150) || 'ملف الامتحان', category: 'exam-attachment',
      fileType: ext.toUpperCase(), fileSize: humanSize(req.file.size), pageCount: 0,
      author: currentUser(req).name, publishYear: null, isVerifiedCurriculum: false,
      downloadCount: 0, description: `مرفق للامتحان ${exam.title}`, previewSummary: '[]',
      filePath, status: 'sample',
    }, select: { id: true, title: true, fileType: true, fileSize: true, filePath: true } });
    res.status(201).json({ attachment });
  } catch (e) {
    if (filePath) await deleteStoredFile(filePath).catch(() => undefined);
    console.error('exam attachment create error:', e);
    res.status(500).json({ error: e instanceof Error ? e.message : 'تعذّر حفظ مرفق الامتحان' });
  }
});

uploadsRouter.delete('/admin/exams/:examId/attachments/:attachmentId', requireAdmin, async (req, res) => {
  const prefix = `examfile-${req.params.examId}-`;
  if (!req.params.attachmentId.startsWith(prefix)) { res.status(400).json({ error: 'المرفق لا يتبع هذا الامتحان' }); return; }
  const attachment = await prisma.resource.findUnique({ where: { id: req.params.attachmentId } });
  if (!attachment || attachment.category !== 'exam-attachment') { res.status(404).json({ error: 'الملف غير موجود' }); return; }
  await prisma.resource.delete({ where: { id: attachment.id } });
  if (attachment.filePath) await deleteStoredFile(attachment.filePath).catch((e) => console.error('exam attachment storage delete error:', e));
  res.json({ ok: true });
});

/* ============================ مرفقات الدروس (الإدارة) ============================ */

uploadsRouter.post('/admin/lessons/:lessonId/attachments', requireAdmin, async (req, res) => {
  const lesson = await prisma.lesson.findUnique({ where: { id: req.params.lessonId }, select: { id: true, attachments: true } });
  if (!lesson) { res.status(404).json({ error: 'الدرس غير موجود' }); return; }
  await runUpload(req, res);
  if (res.headersSent) return;
  if (!req.file) { res.status(400).json({ error: 'اختر ملفاً أولاً' }); return; }
  let filePath = '';
  try {
    filePath = await storeUploadedFile(req.file);
    let existing: Array<Record<string, unknown>> = [];
    try { const parsed: unknown = JSON.parse(lesson.attachments); if (Array.isArray(parsed)) existing = parsed as Array<Record<string, unknown>>; } catch { /* إصلاح قيمة قديمة غير صالحة */ }
    const attachment = {
      id: `lessonfile-${lesson.id}-${randomUUID()}`,
      title: cleanText(req.file.originalname, 150) || 'مرفق الدرس',
      filePath,
      fileType: (fileExtension(req.file) ?? 'file').toUpperCase(),
      fileSize: humanSize(req.file.size),
    };
    await prisma.lesson.update({ where: { id: lesson.id }, data: { attachments: JSON.stringify([...existing, attachment]) } });
    res.status(201).json({ attachment });
  } catch (e) {
    if (filePath) await deleteStoredFile(filePath).catch(() => undefined);
    console.error('lesson attachment create error:', e);
    res.status(500).json({ error: e instanceof Error ? e.message : 'تعذّر حفظ مرفق الدرس' });
  }
});

uploadsRouter.delete('/admin/lessons/:lessonId/attachments/:attachmentId', requireAdmin, async (req, res) => {
  try {
    const lesson = await prisma.lesson.findUnique({ where: { id: req.params.lessonId }, select: { id: true, attachments: true } });
    if (!lesson) { res.status(404).json({ error: 'الدرس غير موجود' }); return; }
    let existing: Array<Record<string, unknown>> = [];
    try { const parsed: unknown = JSON.parse(lesson.attachments); if (Array.isArray(parsed)) existing = parsed as Array<Record<string, unknown>>; } catch { /* قيمة قديمة غير صالحة */ }
    const target = existing.find((item) => item.id === req.params.attachmentId);
    if (!target) { res.status(404).json({ error: 'المرفق غير موجود' }); return; }
    const remaining = existing.filter((item) => item.id !== req.params.attachmentId);
    await prisma.lesson.update({ where: { id: lesson.id }, data: { attachments: JSON.stringify(remaining) } });
    if (typeof target.filePath === 'string') await deleteStoredFile(target.filePath).catch((e) => console.error('lesson attachment storage delete error:', e));
    res.json({ ok: true });
  } catch (e) { console.error('lesson attachment delete error:', e); res.status(500).json({ error: 'تعذّر حذف المرفق' }); }
});

/* ============================ حذف ملف (الإدارة) ============================ */

uploadsRouter.delete('/uploads/resource/:id', requireAdmin, async (req, res) => {
  const resource = await prisma.resource.findUnique({ where: { id: req.params.id } });
  if (!resource) {
    res.status(404).json({ error: 'الملف غير موجود' });
    return;
  }
  await prisma.resource.delete({ where: { id: req.params.id } });
  if (resource.filePath) await deleteStoredFile(resource.filePath).catch((e) => console.error('resource storage delete error:', e));
  res.json({ ok: true });
});
