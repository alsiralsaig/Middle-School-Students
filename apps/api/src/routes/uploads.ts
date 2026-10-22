import path from 'node:path';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import { prisma } from '../lib/prisma.js';
import { cleanText, currentUser, requireAdmin, requireAuth } from '../lib/auth.js';
import { UPLOAD_DIR, ensureUploadDir } from '../lib/paths.js';

export const uploadsRouter = Router();

ensureUploadDir();

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

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const safe = path
      .basename(file.originalname)
      .replace(/[^\p{L}\p{N}._-]/gu, '_')
      .slice(0, 80);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED.has(file.mimetype)) cb(null, true);
    else cb(new Error('نوع الملف غير مدعوم — PDF أو Word أو صورة فقط'));
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

    const ext = ALLOWED.get(req.file.mimetype) ?? 'bin';
    const resource = await prisma.resource.create({
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
        filePath: `/uploads/${req.file.filename}`,
        status: 'sample',
      },
    });

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
  try {
    const ext = ALLOWED.get(req.file.mimetype) ?? 'bin';
    const attachment = await prisma.resource.create({ data: {
      id: `examfile-${exam.id}-${randomUUID()}`, subjectId: exam.subjectId,
      title: cleanText(req.file.originalname, 150) || 'ملف الامتحان', category: 'exam-attachment',
      fileType: ext.toUpperCase(), fileSize: humanSize(req.file.size), pageCount: 0,
      author: currentUser(req).name, publishYear: null, isVerifiedCurriculum: false,
      downloadCount: 0, description: `مرفق للامتحان ${exam.title}`, previewSummary: '[]',
      filePath: `/uploads/${req.file.filename}`, status: 'sample',
    }, select: { id: true, title: true, fileType: true, fileSize: true, filePath: true } });
    res.status(201).json({ attachment });
  } catch (e) {
    const full = path.join(UPLOAD_DIR, path.basename(req.file.path));
    if (fs.existsSync(full)) fs.unlinkSync(full);
    console.error('exam attachment create error:', e);
    res.status(500).json({ error: 'تعذّر حفظ مرفق الامتحان' });
  }
});

uploadsRouter.delete('/admin/exams/:examId/attachments/:attachmentId', requireAdmin, async (req, res) => {
  const prefix = `examfile-${req.params.examId}-`;
  if (!req.params.attachmentId.startsWith(prefix)) { res.status(400).json({ error: 'المرفق لا يتبع هذا الامتحان' }); return; }
  const attachment = await prisma.resource.findUnique({ where: { id: req.params.attachmentId } });
  if (!attachment || attachment.category !== 'exam-attachment') { res.status(404).json({ error: 'الملف غير موجود' }); return; }
  if (attachment.filePath) {
    const full = path.join(UPLOAD_DIR, path.basename(attachment.filePath));
    if (fs.existsSync(full)) fs.unlinkSync(full);
  }
  await prisma.resource.delete({ where: { id: attachment.id } });
  res.json({ ok: true });
});

/* ============================ حذف ملف (الإدارة) ============================ */

uploadsRouter.delete('/uploads/resource/:id', requireAdmin, async (req, res) => {
  const resource = await prisma.resource.findUnique({ where: { id: req.params.id } });
  if (!resource) {
    res.status(404).json({ error: 'الملف غير موجود' });
    return;
  }
  if (resource.filePath) {
    const full = path.join(UPLOAD_DIR, path.basename(resource.filePath));
    if (fs.existsSync(full)) fs.unlinkSync(full);
  }
  await prisma.resource.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});
