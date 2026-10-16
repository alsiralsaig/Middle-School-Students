import path from 'node:path';
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
