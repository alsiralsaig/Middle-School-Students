import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { cleanText, currentUser, requireAuth } from '../lib/auth.js';

export const learnRouter = Router();

/* ============================ المنهج (للجميع) ============================ */

/**
 * المنهج يتغيّر فقط عندما تحفظ الإدارة درساً، ومع ذلك كان كل فتح للتطبيق
 * يعيد تنزيل ١٠٨٠ كيلوبايت (١٦٠ مضغوطة) وينتظر ~١.٢ ثانية.
 * الآن يُخزَّن على حافة Vercel ويُقدَّم من الذاكرة، مع إعادة تحقق في الخلفية.
 */
const CURRICULUM_CACHE = 'public, max-age=60, s-maxage=600, stale-while-revalidate=86400';

learnRouter.get('/subjects', async (_req, res) => {
  try {
    const subjects = await prisma.subject.findMany({
      orderBy: { code: 'asc' },
      include: {
        units: {
          orderBy: { unitNumber: 'asc' },
          include: { lessons: { orderBy: { lessonNumber: 'asc' } } },
        },
      },
    });
    res.setHeader('Cache-Control', CURRICULUM_CACHE);
    res.setHeader('Vary', 'Accept-Encoding');
    res.json({
      subjects: subjects.map((s) => ({
        ...s,
        official: s.official ? JSON.parse(s.official) : null,
        // الهيكل الرسمي من الكتاب (ليس بالضرورة مساوياً لـ `units` المؤلَّفة)
        syllabus: s.syllabus ? JSON.parse(s.syllabus) : null,
        units: s.units.map((u) => ({
          ...u,
          lessons: u.lessons.map((l) => ({
            ...l,
            learningObjectives: JSON.parse(l.learningObjectives),
            sections: JSON.parse(l.sections),
            keyRules: JSON.parse(l.keyRules),
            attachments: JSON.parse(l.attachments),
            faq: JSON.parse(l.faq),
            examTips: JSON.parse(l.examTips),
          })),
        })),
      })),
    });
  } catch (e) {
    console.error('subjects error:', e);
    res.status(500).json({ error: 'تعذّر تحميل المنهج' });
  }
});

learnRouter.get('/lessons/:id', async (req, res) => {
  const lesson = await prisma.lesson.findUnique({
    where: { id: req.params.id },
    include: { unit: true, subject: true },
  });
  if (!lesson) {
    res.status(404).json({ error: 'الدرس غير موجود' });
    return;
  }
  // الدرس نفسه لا يتغيّر إلا بحفظ من الإدارة — يُكاش على الحافة مثل المنهج.
  res.setHeader('Cache-Control', CURRICULUM_CACHE);
  res.json({
    lesson: {
      ...(lesson as Record<string, unknown>),
      learningObjectives: JSON.parse(lesson.learningObjectives),
      sections: JSON.parse(lesson.sections),
      keyRules: JSON.parse(lesson.keyRules),
      attachments: JSON.parse(lesson.attachments),
      faq: JSON.parse(lesson.faq),
      examTips: JSON.parse(lesson.examTips),
    },
  });
});

/* ============================ التقدّم ============================ */

learnRouter.get('/progress', requireAuth, async (req, res) => {
  const uid = currentUser(req).uid;
  const rows = await prisma.lessonProgress.findMany({ where: { userId: uid } });
  res.json({
    progress: rows.map((r) => ({
      lessonId: r.lessonId,
      completed: r.completed,
      bookmarked: r.bookmarked,
      secondsSpent: r.secondsSpent,
      updatedAt: r.updatedAt,
    })),
  });
});

learnRouter.post('/progress', requireAuth, async (req, res) => {
  const uid = currentUser(req).uid;
  const lessonId = cleanText(req.body?.lessonId, 60);
  if (!lessonId) {
    res.status(400).json({ error: 'معرّف الدرس مطلوب' });
    return;
  }
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson) {
    res.status(404).json({ error: 'الدرس غير موجود' });
    return;
  }

  const data: { completed?: boolean; bookmarked?: boolean; secondsSpent?: number } = {};
  if (typeof req.body?.completed === 'boolean') data.completed = req.body.completed;
  if (typeof req.body?.bookmarked === 'boolean') data.bookmarked = req.body.bookmarked;
  if (typeof req.body?.secondsSpent === 'number') {
    data.secondsSpent = Math.max(0, Math.min(86400, Math.round(req.body.secondsSpent)));
  }
  if (Object.keys(data).length === 0) {
    res.status(400).json({ error: 'لا توجد بيانات للتحديث' });
    return;
  }

  const row = await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId: uid, lessonId } },
    create: { userId: uid, lessonId, ...data },
    update: data,
  });
  res.json({ progress: row });
});

/* ============================ التقييمات ============================ */

learnRouter.get('/ratings', async (req, res) => {
  const lessonId = typeof req.query.lessonId === 'string' ? req.query.lessonId : undefined;
  const rows = await prisma.lessonRating.findMany({ where: lessonId ? { lessonId } : {} });
  const uid = (req as unknown as { user?: { uid: string } }).user?.uid;
  res.json({
    ratings: rows.map((r) => ({
      lessonId: r.lessonId,
      rating: r.rating,
      comment: r.comment,
      mine: uid ? r.userId === uid : false,
      createdAt: r.createdAt,
    })),
  });
});

learnRouter.post('/ratings', requireAuth, async (req, res) => {
  const uid = currentUser(req).uid;
  const lessonId = cleanText(req.body?.lessonId, 60);
  const rating = Number(req.body?.rating);
  const comment = cleanText(req.body?.comment, 600) || null;

  if (!lessonId || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    res.status(400).json({ error: 'التقييم يجب أن يكون من ١ إلى ٥ نجوم' });
    return;
  }
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson) {
    res.status(404).json({ error: 'الدرس غير موجود' });
    return;
  }

  const row = await prisma.lessonRating.upsert({
    where: { userId_lessonId: { userId: uid, lessonId } },
    create: { userId: uid, lessonId, rating, comment },
    update: { rating, comment },
  });
  res.json({ rating: row });
});

learnRouter.delete('/ratings/:lessonId', requireAuth, async (req, res) => {
  const uid = currentUser(req).uid;
  await prisma.lessonRating.deleteMany({ where: { userId: uid, lessonId: req.params.lessonId } });
  res.json({ ok: true });
});

/* ============================ جلسات التركيز ============================ */

learnRouter.get('/focus', requireAuth, async (req, res) => {
  const uid = currentUser(req).uid;
  const sessions = await prisma.studySession.findMany({
    where: { userId: uid },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  const log: Record<string, number> = {};
  sessions.forEach((s) => {
    log[s.day] = (log[s.day] ?? 0) + 1;
  });
  res.json({ log, minutes: sessions.reduce((a, s) => a + s.minutes, 0) });
});

learnRouter.post('/focus', requireAuth, async (req, res) => {
  const uid = currentUser(req).uid;
  const minutes = Number(req.body?.minutes);
  if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 240) {
    res.status(400).json({ error: 'عدد الدقائق غير صحيح' });
    return;
  }
  const day = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const key = `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;

  await prisma.studySession.create({
    data: { userId: uid, day: key, minutes: Math.round(minutes) },
  });
  const sessions = await prisma.studySession.findMany({ where: { userId: uid } });
  const log: Record<string, number> = {};
  sessions.forEach((s) => {
    log[s.day] = (log[s.day] ?? 0) + 1;
  });
  res.json({ log, minutes: sessions.reduce((a, s) => a + s.minutes, 0) });
});

/* ============================ مواعيد التقويم ============================ */

learnRouter.get('/planner', requireAuth, async (req, res) => {
  const uid = currentUser(req).uid;
  const events = await prisma.plannerEvent.findMany({
    where: { userId: uid },
    orderBy: [{ date: 'asc' }, { time: 'asc' }],
  });
  res.json({ events });
});

learnRouter.post('/planner', requireAuth, async (req, res) => {
  const uid = currentUser(req).uid;
  const title = cleanText(req.body?.title, 120);
  const date = cleanText(req.body?.date, 10);
  const time = cleanText(req.body?.time, 5) || '19:00';
  const type = cleanText(req.body?.type, 20) || 'review';

  if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: 'العنوان والتاريخ (YYYY-MM-DD) مطلوبان' });
    return;
  }

  const event = await prisma.plannerEvent.create({
    data: {
      userId: uid,
      title,
      date,
      time,
      type,
      subjectName: cleanText(req.body?.subjectName, 60) || 'عام',
      description: cleanText(req.body?.description, 400) || null,
      groupId: cleanText(req.body?.groupId, 60) || null,
      weekday: typeof req.body?.weekday === 'number' ? req.body.weekday : null,
    },
  });
  res.status(201).json({ event });
});

learnRouter.delete('/planner/:id', requireAuth, async (req, res) => {
  const uid = currentUser(req).uid;
  await prisma.plannerEvent.deleteMany({ where: { id: req.params.id, userId: uid } });
  res.json({ ok: true });
});

learnRouter.delete('/planner/group/:groupId', requireAuth, async (req, res) => {
  const uid = currentUser(req).uid;
  await prisma.plannerEvent.deleteMany({ where: { groupId: req.params.groupId, userId: uid } });
  res.json({ ok: true });
});

/* ============================ المكتبة ============================ */

learnRouter.get('/resources', async (_req, res) => {
  const resources = await prisma.resource.findMany({ where: { category: { not: 'exam-attachment' } }, orderBy: { id: 'asc' } });
  res.json({
    resources: resources.map((r) => ({
      ...r,
      previewSummary: JSON.parse(r.previewSummary || '[]'),
    })),
  });
});
