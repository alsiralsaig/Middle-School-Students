import { Router } from 'express';
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
    sections: parse(l.sections),
    keyRules: parse(l.keyRules),
    attachments: parse(l.attachments),
    faq: parse(l.faq),
    examTips: parse(l.examTips),
  };
};
