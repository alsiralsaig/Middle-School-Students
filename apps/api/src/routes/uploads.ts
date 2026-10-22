import path from 'node:path';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import { put, del } from '@vercel/blob';
import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import { prisma } from '../lib/prisma.js';
import { cleanText, currentUser, requireAdmin, requireAuth } from '../lib/auth.js';
import { UPLOAD_DIR, ensureUploadDir } from '../lib/paths.js';

export const uploadsRouter = Router();

if (!process.env.VERCEL) ensureUploadDir();

const MAX_SIZE = 20 * 1024 * 1024; // 20 ميغابايت
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
