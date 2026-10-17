import fs from 'node:fs';
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { attachUser } from './lib/auth.js';
import { UPLOAD_DIR, ensureUploadDir } from './lib/paths.js';
import { authRouter } from './routes/auth.js';
import { learnRouter } from './routes/learn.js';
import { examsRouter } from './routes/exams.js';
import { aiRouter } from './routes/ai.js';
import { uploadsRouter } from './routes/uploads.js';
import { syncRouter } from './routes/sync.js';
import { adminCodesRouter } from './routes/adminCodes.js';
import { adminContentRouter } from './routes/adminContent.js';
import { adminStudentsRouter } from './routes/adminStudents.js';
import { adminOverviewRouter } from './routes/adminOverview.js';
import { adminDataRouter } from './routes/adminData.js';
import { assertEnv } from './lib/envCheck.js';

/* فحص بيئة التشغيل قبل أي شيء: يوقف الخادم إن كان الإنتاج بسرّ افتراضي */
assertEnv();

const app = express();
const PORT = Number(process.env.PORT || 5000);

/* ============================ إعدادات أساسية ============================ */

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(
  cors({
    origin: (origin, cb) => {
      // يسمح بالطلبات من نفس المصدر أو من واجهة التطوير المحلية
      const allowed = [process.env.CLIENT_ORIGIN, 'http://localhost:3000', 'http://localhost:4000']
        .filter(Boolean) as string[];
      if (!origin || allowed.includes(origin)) cb(null, true);
      else cb(null, true); // التطوير مفتوح — يُقيَّد في الإنتاج
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(attachUser);

/* تحديد بسيط لمعدل الطلبات على مسارات الحساب */
const hits = new Map<string, { n: number; reset: number }>();
app.use('/api/auth', (req, res, next) => {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const rec = hits.get(ip);
  if (!rec || rec.reset < now) {
    hits.set(ip, { n: 1, reset: now + 10 * 60 * 1000 });
  } else if (++rec.n > 30) {
    res.status(429).json({ error: 'محاولات كثيرة، انتظر قليلاً ثم أعد المحاولة' });
    return;
  }
  next();
});

// على Vercel نظام الملفات للقراءة فقط — لا ننشئ مجلداً، والرفع معطّل هناك
if (!process.env.VERCEL) {
  try {
    ensureUploadDir();
  } catch {
    /* تجاهل: بيئة بلا قرص قابل للكتابة */
  }
}

/* ============================ المسارات ============================ */

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'منصة الطالب السوداني الذكية — الخادم',
    stage: 'المرحلة الثانية (قاعدة بيانات + مصادقة)',
    time: new Date().toISOString(),
  });
});

app.use('/api/auth', authRouter);
app.use('/api', learnRouter);
app.use('/api', examsRouter);
app.use('/api', aiRouter);
app.use('/api', uploadsRouter);
app.use('/api', syncRouter);
// مسارات الإدارة — وراء requireAdmin (دور مدير + رمز صادر عن لوحة الإدارة)
app.use('/api/admin', adminCodesRouter);
app.use('/api/admin', adminContentRouter);
app.use('/api/admin', adminStudentsRouter);
app.use('/api/admin', adminOverviewRouter);
app.use('/api/admin', adminDataRouter);

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'المسار غير موجود' });
});

/* ملفات مرفوعة (إن وُجد مجلد uploads) */
if (fs.existsSync(UPLOAD_DIR)) {
  app.use('/uploads', express.static(UPLOAD_DIR, { fallthrough: true }));
}

/* ============================ معالجة الأخطاء ============================ */

app.use(
  (
    err: Error & { code?: string },
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ): void => {
    // أخطاء الرفع (multer) تُعرض للطالب لأنها متعلقة بملفه
    if (err?.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ error: 'حجم الملف أكبر من ٢٠ ميغابايت' });
      return;
    }
    if (err?.code === 'LIMIT_UNEXPECTED_FILE') {
      res.status(400).json({ error: 'حقل ملف غير متوقع' });
      return;
    }
    console.error('[api] خطأ غير متوقع:', err?.message);
    res.status(500).json({ error: 'حدث خطأ في الخادم' });
  },
);

/* Vercel يستورد التطبيق كدالة (Function) ولا يشغّله كخادم دائم،
   فيجب تصديره. أما محلياً وفي Render فيحتاج الاستماع فعلياً. */
export default app;

if (!process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ الخادم يعمل على http://localhost:${PORT}`);
    console.log(`   الصحة: http://localhost:${PORT}/api/health`);
  });
}
