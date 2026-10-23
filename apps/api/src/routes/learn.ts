import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { cleanText, currentUser, requireAuth } from '../lib/auth.js';
import { deleteMediaForOwner, mediaAssetDto } from './media.js';

export const learnRouter = Router();

/* ============================ المنهج (للجميع) ============================ */

/**
 * المنهج يتغيّر فقط عندما تحفظ الإدارة درساً، ومع ذلك كان كل فتح للتطبيق
 * يعيد تنزيل ١٠٨٠ كيلوبايت (١٦٠ مضغوطة) وينتظر ~١.٢ ثانية.
 * الآن يُخزَّن على حافة Vercel ويُقدَّم من الذاكرة، مع إعادة تحقق في الخلفية.
 */
const CURRICULUM_CACHE = 'public, max-age=60, s-maxage=600, stale-while-revalidate=86400';

/**
 * `?view=index` يرجّع **الفهرس فقط**: عناوين الدروس وبياناتها القصيرة،
 * بلا شرح ولا أسئلة ولا نصائح — ١٠٨٠ كيلوبايت تصير ~٢٤٠.
 * التطبيق يطلب الدرس الكامل من `/api/lessons/:id` عند فتحه.
 */
learnRouter.get('/subjects', async (req, res) => {
  const indexOnly = String(req.query.view || '') === 'index';
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
    const subjectIds=subjects.map(s=>s.id), unitIds=subjects.flatMap(s=>s.units.map(u=>u.id));
    const media=await prisma.mediaAsset.findMany({where:{access:'public',OR:[{ownerType:'subject',ownerId:{in:subjectIds}},{ownerType:'unit',ownerId:{in:unitIds}}]},orderBy:{createdAt:'asc'}});
    const bySubject=new Map<string,unknown[]>(),byUnit=new Map<string,unknown[]>();
    media.forEach(a=>{const target=a.ownerType==='subject'?bySubject:byUnit;target.set(a.ownerId,[...(target.get(a.ownerId)||[]),mediaAssetDto(a)]);});
    res.setHeader('Cache-Control', CURRICULUM_CACHE);
    res.setHeader('Vary', 'Accept-Encoding');
    res.json({
      subjects: subjects.map((s) => ({
        mediaAssets:bySubject.get(s.id)||[],
        ...s,
        official: indexOnly ? null : s.official ? JSON.parse(s.official) : null,
        // الهيكل الرسمي من الكتاب (ليس بالضرورة مساوياً لـ `units` المؤلَّفة)
        syllabus: indexOnly ? null : s.syllabus ? JSON.parse(s.syllabus) : null,
        units: s.units.map((u) => ({
          ...u,
          mediaAssets:byUnit.get(u.id)||[],
          lessons: u.lessons.map((l) =>
            indexOnly
              ? {
                  // بيانات كافية للعرض والقوائم — بلا الشرح
                  id: l.id,
                  subjectId: l.subjectId,
                  unitId: l.unitId,
                  lessonNumber: l.lessonNumber,
                  title: l.title,
                  durationMinutes: l.durationMinutes,
                  summary: l.summary,
                  status: l.status,
                  learningObjectives: [],
                  sections: [],
                  keyRules: [],
                  attachments: [],
                  faq: [],
                  examTips: [],
                }
              : {
                  ...l,
                  learningObjectives: JSON.parse(l.learningObjectives),
                  sections: JSON.parse(l.sections),
                  keyRules: JSON.parse(l.keyRules),
                  attachments: JSON.parse(l.attachments),
                  faq: JSON.parse(l.faq),
                  examTips: JSON.parse(l.examTips),
                }
          ),
        })),
      })),
    });
  } catch (e) {
    console.error('subjects error:', e);
    res.status(500).json({ error: 'تعذّر تحميل المنهج' });
  }
});

learnRouter.get('/lessons/:id', async (req, res) => {
  /* أي خطأ في قاعدة البيانات هنا كان يُسقِط العملية بالكامل (unhandled rejection
     في Express 4 + Node 20)، ويصير الخطر أكبر مع كل استعلام جديد.
     لذلك نمسك الخطأ ونرجّع 500 بدل موت الخادم. */
  try {
    const lesson = await prisma.lesson.findUnique({
      where: { id: req.params.id },
      include: { unit: true, subject: true },
    });
    if (!lesson) {
      res.status(404).json({ error: 'الدرس غير موجود' });
      return;
    }
    const media = await prisma.mediaAsset.findMany({
      where: { ownerType: 'lesson', ownerId: lesson.id, access: 'public' },
      orderBy: { createdAt: 'asc' },
    });
    // الدرس نفسه لا يتغيّر إلا بحفظ من الإدارة — يُكاش على الحافة مثل المنهج.
    res.setHeader('Cache-Control', CURRICULUM_CACHE);
    res.json({
      lesson: {
        ...(lesson as Record<string, unknown>),
        learningObjectives: JSON.parse(lesson.learningObjectives),
        sections: JSON.parse(lesson.sections),
        keyRules: JSON.parse(lesson.keyRules),
        attachments: [...JSON.parse(lesson.attachments), ...media.map(mediaAssetDto)],
        faq: JSON.parse(lesson.faq),
        examTips: JSON.parse(lesson.examTips),
      },
    });
  } catch (e) {
    console.error('lesson error:', e);
    res.status(500).json({ error: 'تعذّر تحميل الدرس' });
  }
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
  const assets=events.length?await prisma.mediaAsset.findMany({where:{ownerType:'planner-event',ownerId:{in:events.map(e=>e.id)},userId:uid,access:'private'},orderBy:{createdAt:'asc'}}):[];
  const byEvent=new Map<string,unknown[]>();assets.forEach(a=>byEvent.set(a.ownerId,[...(byEvent.get(a.ownerId)||[]),{id:a.id,title:a.title,kind:a.kind,mimeType:a.mimeType,sizeBytes:a.sizeBytes,url:`/api/media/${a.id}/content`}]));
  res.setHeader('Cache-Control','private, no-store');
  res.json({ events:events.map(e=>({...e,attachments:byEvent.get(e.id)||[]})) });
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
  const uid=currentUser(req).uid;
  const event=await prisma.plannerEvent.findFirst({where:{id:req.params.id,userId:uid},select:{id:true}});
  if(event){await deleteMediaForOwner('planner-event',[event.id],uid);await prisma.plannerEvent.delete({where:{id:event.id}});}
  res.json({ok:true});
});

learnRouter.delete('/planner/group/:groupId', requireAuth, async (req, res) => {
  const uid=currentUser(req).uid;
  const events=await prisma.plannerEvent.findMany({where:{groupId:req.params.groupId,userId:uid},select:{id:true}});
  if(events.length){const ids=events.map(e=>e.id);await deleteMediaForOwner('planner-event',ids,uid);await prisma.plannerEvent.deleteMany({where:{id:{in:ids},userId:uid}});}
  res.json({ok:true});
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
