import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { cleanText, requireAdmin } from '../lib/auth.js';

/**
 * تحرير محتوى المنهج — الإدارة فقط.
 *
 * لماذا موجود: كان المنهج يعيش في ملفات JSON مضمّنة داخل التطبيق، فلا
 * تقدر الإدارة على تعديل درس واحد، والمحتوى متجمّد. الآن قاعدة البيانات
 * هي المصدر، وهذه المسارات هي التي تجعلها **قابلة للتحرير**.
 *
 * كل المسارات وراء `requireAdmin` (دور مدير + رمز صادر عن لوحة الإدارة).
 */
export const adminContentRouter = Router();

/* ============================ قراءة ============================ */

/** GET /api/admin/lessons — قائمة الدروس للتعديل */
adminContentRouter.get('/lessons', requireAdmin, async (req, res) => {
  try {
    const subjectId = typeof req.query.subjectId === 'string' ? req.query.subjectId : '';
    const lessons = await prisma.lesson.findMany({
      where: subjectId ? { subjectId } : {},
      orderBy: [{ subjectId: 'asc' }, { lessonNumber: 'asc' }],
      select: {
        id: true,
        title: true,
        summary: true,
        status: true,
        lessonNumber: true,
        durationMinutes: true,
        subjectId: true,
        unitId: true,
        unit: { select: { title: true, unitNumber: true } },
      },
      take: 500,
    });
    res.json({ lessons });
  } catch (e) {
    console.error('admin lessons list error:', e);
    res.status(500).json({ error: 'تعذّر تحميل الدروس' });
  }
});

/** GET /api/admin/lessons/:id — درس كامل للتعديل */
adminContentRouter.get('/lessons/:id', requireAdmin, async (req, res) => {
  try {
    const lesson = await prisma.lesson.findUnique({ where: { id: req.params.id } });
    if (!lesson) {
      res.status(404).json({ error: 'الدرس غير موجود' });
      return;
    }
    res.json({ lesson: expand(lesson) });
  } catch (e) {
    console.error('admin lesson get error:', e);
    res.status(500).json({ error: 'تعذّر تحميل الدرس' });
  }
});

/* ============================ إدارة الامتحانات ============================ */
adminContentRouter.get('/exams/:id', requireAdmin, async (req, res) => {
  try {
    const exam = await prisma.exam.findUnique({
      where: { id: req.params.id },
      include: { subject: { select: { id: true, name: true } }, questions: true },
    });
    if (!exam) { res.status(404).json({ error: 'الامتحان غير موجود' }); return; }
    const attachments = await prisma.resource.findMany({
      where: { id: { startsWith: `examfile-${exam.id}-` } },
      orderBy: { id: 'asc' },
      select: { id: true, title: true, fileType: true, fileSize: true, filePath: true },
    });
    res.json({ exam: {
      id: exam.id, title: exam.title, subjectId: exam.subjectId, subjectName: exam.subject.name,
      durationMinutes: exam.durationMinutes, status: exam.status,
      attachments,
      questions: exam.questions.map((q) => {
        let options: unknown[] = [];
        try { const value: unknown = JSON.parse(q.options); if (Array.isArray(value)) options = value; } catch { /* بيانات قديمة غير صالحة */ }
        return { id: q.id, question: q.question, options, correctIndex: q.correctIndex, explanation: q.explanation ?? '' };
      }),
    } });
  } catch (e) { console.error('admin exam get error:', e); res.status(500).json({ error: 'تعذّر تحميل الامتحان' }); }
});

adminContentRouter.post('/exams', requireAdmin, async (req, res) => {
  try {
    const title = cleanText(req.body?.title, 200);
    const subjectId = cleanText(req.body?.subjectId, 60);
    const durationMinutes = Math.max(5, Math.min(180, Number(req.body?.durationMinutes) || 30));
    const drafts = Array.isArray(req.body?.questions) ? req.body.questions : [];
    const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subject) { res.status(400).json({ error: 'اختر مادة صحيحة' }); return; }
    if (title.length < 3) { res.status(400).json({ error: 'عنوان الامتحان يجب أن يكون ٣ أحرف على الأقل' }); return; }
    if (!drafts.length) { res.status(400).json({ error: 'أضف سؤالاً واحداً على الأقل' }); return; }
    const questions = drafts.map((raw: unknown) => {
      const q = (raw ?? {}) as Record<string, unknown>;
      const options = Array.isArray(q.options) ? q.options.map((x) => cleanText(x, 500)) : [];
      const correctIndex = Number(q.correctIndex);
      if (cleanText(q.question, 2000).length < 2 || options.length < 2 || options.some((x) => !x) || !Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length) {
        throw new Error('تحقق من نص السؤال والخيارات والإجابة الصحيحة');
      }
      return { question: cleanText(q.question, 2000), options: JSON.stringify(options), correctIndex, explanation: cleanText(q.explanation, 2000) || null };
    });
    const exam = await prisma.exam.create({ data: {
      subjectId, title, durationMinutes, status: 'sample',
      questions: { create: questions },
    }, select: { id: true, title: true } });
    res.status(201).json({ exam });
  } catch (e) {
    console.error('admin exam create error:', e);
    const message = e instanceof Error && e.message.startsWith('تحقق') ? e.message : 'تعذّر إنشاء الامتحان';
    res.status(400).json({ error: message });
  }
});

/* ============================ إدارة المواد والوحدات وإنشاء الدروس ============================ */
adminContentRouter.post('/subjects', requireAdmin, async (req, res) => {
  try {
    const id = cleanText(req.body?.id, 60).toLowerCase();
    const name = cleanText(req.body?.name, 160);
    const code = cleanText(req.body?.code, 30).toUpperCase();
    if (!/^[a-z0-9_-]{2,60}$/.test(id) || name.length < 2 || code.length < 2) {
      res.status(400).json({ error: 'المعرّف والاسم والرمز مطلوبة؛ استخدم معرّفاً إنجليزياً قصيراً' }); return;
    }
    const subject = await prisma.subject.create({ data: {
      id, name, nameEn: cleanText(req.body?.nameEn, 160), code,
      category: cleanText(req.body?.category, 40) || 'core',
      description: cleanText(req.body?.description, 1000),
      unitsCount: 0, lessonsCount: 0, status: 'sample',
    } });
    res.status(201).json({ subject });
  } catch (e) {
    res.status(400).json({ error: (e as { code?: string }).code === 'P2002' ? 'معرّف المادة أو رمزها مستخدم مسبقاً' : 'تعذّر إضافة المادة' });
  }
});

adminContentRouter.put('/subjects/:id', requireAdmin, async (req, res) => {
  try {
    const current = await prisma.subject.findUnique({ where: { id: req.params.id } });
    if (!current) { res.status(404).json({ error: 'المادة غير موجودة' }); return; }
    const name = cleanText(req.body?.name, 160);
    const code = cleanText(req.body?.code, 30).toUpperCase();
    if (name.length < 2 || code.length < 2) { res.status(400).json({ error: 'الاسم والرمز مطلوبان' }); return; }
    const subject = await prisma.subject.update({ where: { id: current.id }, data: {
      name, nameEn: cleanText(req.body?.nameEn, 160), code,
      category: cleanText(req.body?.category, 40) || current.category,
      description: cleanText(req.body?.description, 1000),
    } });
    res.json({ subject });
  } catch (e) {
    const duplicate = (e as { code?: string }).code === 'P2002';
    res.status(duplicate ? 400 : 500).json({ error: duplicate ? 'رمز المادة مستخدم مسبقاً' : 'تعذّر تعديل المادة' });
  }
});

adminContentRouter.post('/subjects/:subjectId/units', requireAdmin, async (req, res) => {
  try {
    const subject = await prisma.subject.findUnique({ where: { id: req.params.subjectId } });
    if (!subject) { res.status(404).json({ error: 'المادة غير موجودة' }); return; }
    const title = cleanText(req.body?.title, 200);
    if (title.length < 2) { res.status(400).json({ error: 'عنوان الوحدة مطلوب' }); return; }
    const last = await prisma.unit.findFirst({ where: { subjectId: subject.id }, orderBy: { unitNumber: 'desc' } });
    const unit = await prisma.unit.create({ data: {
      id: `unit-${randomUUID()}`, subjectId: subject.id,
      unitNumber: Math.max(1, Number(req.body?.unitNumber) || (last?.unitNumber ?? 0) + 1),
      title, description: cleanText(req.body?.description, 1000),
    } });
    res.status(201).json({ unit });
  } catch (e) { console.error('admin unit create error:', e); res.status(500).json({ error: 'تعذّر إضافة الوحدة' }); }
});

adminContentRouter.put('/units/:id', requireAdmin, async (req, res) => {
  try {
    const current = await prisma.unit.findUnique({ where: { id: req.params.id } });
    if (!current) { res.status(404).json({ error: 'الوحدة غير موجودة' }); return; }
    const title = cleanText(req.body?.title, 200);
    if (title.length < 2) { res.status(400).json({ error: 'عنوان الوحدة مطلوب' }); return; }
    const unit = await prisma.unit.update({ where: { id: current.id }, data: {
      title, description: cleanText(req.body?.description, 1000),
      unitNumber: Math.max(1, Number(req.body?.unitNumber) || current.unitNumber),
    } });
    res.json({ unit });
  } catch (e) { console.error('admin unit update error:', e); res.status(500).json({ error: 'تعذّر تعديل الوحدة' }); }
});

adminContentRouter.post('/lessons', requireAdmin, async (req, res) => {
  try {
    const subjectId = cleanText(req.body?.subjectId, 60);
    const unitId = cleanText(req.body?.unitId, 100);
    const title = cleanText(req.body?.title, 200);
    const unit = await prisma.unit.findFirst({ where: { id: unitId, subjectId } });
    if (!unit) { res.status(400).json({ error: 'اختر وحدة صحيحة تابعة للمادة' }); return; }
    if (title.length < 2) { res.status(400).json({ error: 'عنوان الدرس مطلوب' }); return; }
    const last = await prisma.lesson.findFirst({ where: { unitId }, orderBy: { lessonNumber: 'desc' } });
    const lesson = await prisma.lesson.create({ data: {
      id: `lesson-${randomUUID()}`, subjectId, unitId,
      lessonNumber: Math.max(1, Number(req.body?.lessonNumber) || (last?.lessonNumber ?? 0) + 1),
      title, summary: cleanText(req.body?.summary, 4000),
      durationMinutes: Math.min(180, Math.max(5, Number(req.body?.durationMinutes) || 30)),
      learningObjectives: '[]', sections: '[]', keyRules: '[]', attachments: '[]', faq: '[]', examTips: '[]', status: 'sample',
    } });
    res.status(201).json({ lesson: expand(lesson) });
  } catch (e) { console.error('admin lesson create error:', e); res.status(500).json({ error: 'تعذّر إنشاء الدرس' }); }
});

/* ============================ كتابة ============================ */

/** PUT /api/admin/lessons/:id — حفظ تعديلات درس */
adminContentRouter.put('/lessons/:id', requireAdmin, async (req, res) => {
  try {
    const lesson = await prisma.lesson.findUnique({ where: { id: req.params.id } });
    if (!lesson) {
      res.status(404).json({ error: 'الدرس غير موجود' });
      return;
    }

    const title = cleanText(req.body?.title, 200);
    if (title.length < 3) {
      res.status(400).json({ error: 'عنوان الدرس يجب أن يكون ٣ أحرف على الأقل' });
      return;
    }

    const status = req.body?.status === 'verified' ? 'verified' : 'sample';

    const updated = await prisma.lesson.update({
      where: { id: lesson.id },
      data: {
        title,
        summary: cleanText(req.body?.summary, 4000),
        durationMinutes: Number(req.body?.durationMinutes) || lesson.durationMinutes,
        learningObjectives: JSON.stringify(toStrings(req.body?.learningObjectives)),
        sections: JSON.stringify(toSections(req.body?.sections)),
        keyRules: JSON.stringify(toStrings(req.body?.keyRules)),
        examTips: JSON.stringify(toStrings(req.body?.examTips)),
        faq: JSON.stringify(toFaq(req.body?.faq)),
        status,
      },
    });

    res.json({ lesson: expand(updated) });
  } catch (e) {
    console.error('admin lesson update error:', e);
    res.status(500).json({ error: 'تعذّر حفظ الدرس' });
  }
});

/** DELETE /api/admin/lessons/:id — حذف الدرس مع حماية تقدّم وتقييمات الطلاب */
adminContentRouter.delete('/lessons/:id', requireAdmin, async (req, res) => {
  try {
    const lesson = await prisma.lesson.findUnique({ where: { id: req.params.id } });
    if (!lesson) { res.status(404).json({ error: 'الدرس غير موجود' }); return; }
    const [progressCount, ratingCount] = await Promise.all([
      prisma.lessonProgress.count({ where: { lessonId: lesson.id } }),
      prisma.lessonRating.count({ where: { lessonId: lesson.id } }),
    ]);
    if (progressCount || ratingCount) {
      res.status(409).json({ error: 'لا يمكن حذف الدرس لأنه مرتبط بتقدّم أو تقييمات طلاب. حُفظت سجلات الطلاب كما هي.' });
      return;
    }
    await prisma.lesson.delete({ where: { id: lesson.id } });
    res.json({ ok: true });
  } catch (e) { console.error('admin lesson delete error:', e); res.status(500).json({ error: 'تعذّر حذف الدرس' }); }
});

/* ============================ مساعدات ============================ */

type Json = Record<string, unknown>;

const toStrings = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => cleanText(String(x), 1000)).filter(Boolean) : [];

const toSections = (v: unknown): Json[] =>
  Array.isArray(v)
    ? v.map((s) => {
        const o = (s ?? {}) as Json;
        return {
          heading: cleanText(String(o.heading ?? ''), 300),
          body: cleanText(String(o.body ?? ''), 8000),
        };
      })
    : [];

const toFaq = (v: unknown): Json[] =>
  Array.isArray(v)
    ? v.map((f) => {
        const o = (f ?? {}) as Json;
        return {
          q: cleanText(String(o.q ?? ''), 500),
          a: cleanText(String(o.a ?? ''), 2000),
        };
      })
    : [];

/** يفكّ حقول JSON المخزّنة كنصوص إلى مصفوفات */
const expand = (l: {
  id: string;
  title: string;
  summary: string;
  status: string;
  lessonNumber: number;
  durationMinutes: number;
  subjectId: string;
  unitId: string;
  learningObjectives: string;
  sections: string;
  keyRules: string;
  attachments: string;
  faq: string;
  examTips: string;
}) => {
  const parse = (s: string): unknown[] => {
    try {
      const v: unknown = JSON.parse(s);
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  };
  return {
    id: l.id,
    title: l.title,
    summary: l.summary,
    status: l.status,
    lessonNumber: l.lessonNumber,
    durationMinutes: l.durationMinutes,
    subjectId: l.subjectId,
    unitId: l.unitId,
    learningObjectives: parse(l.learningObjectives),
    sections: parse(l.sections).map((x) => {
      const o = (x ?? {}) as Record<string, unknown>;
      return { heading: String(o.heading ?? o.title ?? ''), body: String(o.body ?? o.content ?? '') };
    }),
    keyRules: parse(l.keyRules),
    attachments: parse(l.attachments),
    faq: parse(l.faq).map((x) => {
      const o = (x ?? {}) as Record<string, unknown>;
      return { q: String(o.q ?? o.question ?? ''), a: String(o.a ?? o.answer ?? '') };
    }),
    examTips: parse(l.examTips),
  };
};
