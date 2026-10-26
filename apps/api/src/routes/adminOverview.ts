import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { currentUser, requireAdmin } from '../lib/auth.js';
import { notifyAdmin } from '../lib/notify.js';

/**
 * نظرة عامة للوحة الإدارة — الإدارة فقط.
 *
 * لماذا موجود: صفحة «نظرة عامة» كانت تقرأ `curriculumStats()` من ملفات
 * JSON المضمّنة، وتقول للمدير حرفياً إن «حفظ المحتوى غير مُفعّل» وإن
 * مصدر البيانات هو `shared/content/*.json`. وكلتا الجملتين صارت **غير
 * صحيحة** بعد أن صارت قاعدة البيانات هي المصدر.
 *
 * هذه المسارات تعيد أرقاماً حقيقية من الجداول، مع حالة الجاهزية لكل
 * ميزة — فلا تصف الصفحة شيئاً بغير واقعه.
 */
export const adminOverviewRouter = Router();

/** GET /api/admin/overview — أرقام حقيقية وملخّص الجاهزية */
adminOverviewRouter.get('/overview', requireAdmin, async (_req, res) => {
  try {
    const [
      subjectsCount,
      unitsCount,
      lessonsCount,
      verifiedLessons,
      resourcesCount,
      studentsCount,
      activeCodes,
      examsCount,
      attemptsCount,
      subjects,
    ] = await Promise.all([
      /*
       * الأرقام كلها للمواد **غير المؤرشفة** فقط.
       * ليه: كانت اللوحة تقول «١٢ مادة» و«٦٦ وحدة» و«٤٠٥ درس» بينما تطبيق
       * الطالب يعرض ١٠ مواد و٣٩٢ درساً، لأن المواد المؤرشفة (التربية الوطنية
       * والدراسات الاجتماعية) تُحسب هنا وتُخفى هناك. الفرق كان يربك المدير.
       */
      prisma.subject.count({ where: { status: { not: 'archived' } } }),
      prisma.unit.count({ where: { subject: { status: { not: 'archived' } } } }),
      prisma.lesson.count({ where: { subject: { status: { not: 'archived' } } } }),
      prisma.lesson.count({ where: { status: 'verified', subject: { status: { not: 'archived' } } } }),
      prisma.resource.count({ where: { category: { not: 'exam-attachment' } } }),
      prisma.user.count({ where: { role: 'student' } }),
      prisma.accessCode.count({ where: { status: 'active' } }),
      prisma.exam.count({ where: { subject: { status: { not: 'archived' } } } }),
      prisma.examAttempt.count(),
      prisma.subject.findMany({
        where: { status: { not: 'archived' } },
        orderBy: { code: 'asc' },
        select: {
          id: true,
          name: true,
          code: true,
          unitsCount: true,
          lessonsCount: true,
          status: true,
          gradeWarning: true,
          _count: { select: { units: true, lessons: true } },
        },
      }),
    ]);

    const archivedSubjects = await prisma.subject.findMany({
      where: { status: 'archived' },
      orderBy: { code: 'asc' },
      select: { id: true, name: true },
    });

    const plannedLessons = subjects.reduce((a, s) => a + s.lessonsCount, 0);
    const plannedUnits = subjects.reduce((a, s) => a + s.unitsCount, 0);

    const perSubject = subjects.map((s) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      status: s.status,
      units: s._count.units,
      plannedUnits: s.unitsCount,
      lessons: s._count.lessons,
      plannedLessons: s.lessonsCount,
      coverage:
        s.lessonsCount > 0
          ? Math.round((s._count.lessons / s.lessonsCount) * 100)
          : 0,
      gradeWarning: s.gradeWarning,
    }));

    res.json({
      stats: {
        subjects: subjectsCount,
        units: unitsCount,
        plannedUnits,
        lessons: lessonsCount,
        plannedLessons,
        verifiedLessons,
        sampleLessons: lessonsCount - verifiedLessons,
        /* المواد المؤرشفة تبقى في قاعدة البيانات (ومحتواها في المكتبة) لكنها
           لا تُحسب في المنهج ولا تظهر للطالب — نُظهر عددها فقط للتوضيح. */
        archivedSubjects: archivedSubjects.map((s) => s.name),
        resources: resourcesCount,
        students: studentsCount,
        activeCodes,
        exams: examsCount,
        examAttempts: attemptsCount,
        coverage:
          plannedLessons > 0
            ? Math.round((lessonsCount / plannedLessons) * 100)
            : 0,
      },
      subjects: perSubject,
      /**
       * حالة كل ميزة — تُقرأ من الواقع لا من تقدير:
       *   ready  = يعمل الآن ومدعوم بقاعدة البيانات
       *   partial= يعمل لكن يعتمد على خدمة خارجية
       *   off    = لم يُربط بعد
       */
      readiness: [
        {
          label: 'عرض المنهج للطلاب',
          state: 'ready' as const,
          note: 'من قاعدة البيانات، مع نسخة محلية تعمل دون اتصال',
        },
        {
          label: 'تحرير المحتوى وحفظه',
          state: 'ready' as const,
          note: 'محرّر الدرس يكتب في قاعدة البيانات مباشرة',
        },
        {
          label: 'حسابات الطلاب وتتبّع التقدّم',
          state: 'ready' as const,
          note: `${studentsCount} طالب مسجّل`,
        },
        {
          label: 'رموز الدخول',
          state: 'ready' as const,
          note: `${activeCodes} رمز نشط`,
        },
        {
          label: 'تصحيح الامتحانات آلياً',
          state: attemptsCount > 0 ? ('ready' as const) : ('partial' as const),
          note:
            attemptsCount > 0
              ? `${attemptsCount} محاولة مصحَّحة`
              : 'الامتحانات معرَّفة لكن لا محاولات بعد',
        },
        {
          label: 'رفع ملفات المكتبة',
          state: 'partial' as const,
          note: 'الرفع يعمل على خادم بقرص دائم — لا على Vercel (قرص للقراءة فقط)',
        },
      ],
    });
  } catch (e) {
    console.error('admin overview error:', e);
    res.status(500).json({ error: 'تعذّر تحميل النظرة العامة' });
  }
});

/**
 * POST /api/admin/notify-test — زر «جرّب التنبيه».
 *
 * ليه: لا سبيل للمدير أن يعرف أن القناة تعمل إلا بأن يصل تنبيه فعلي على
 * جواله. هذا المسار يرسل واحداً وينتظر النتيجة ليخبره بالصدق.
 */
adminOverviewRouter.post('/notify-test', requireAdmin, async (req, res) => {
  try {
    const name = currentUser(req)?.name ?? '';
    await notifyAdmin(
      'تجربة تنبيه',
      `هذه رسالة تجريبية من لوحة الإدارة${name ? ` — ${name}` : ''}.\nلو وصلتك، فالتنبيهات تعمل.`,
      'info',
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(502).json({ error: e instanceof Error ? e.message : 'تعذّر إرسال التنبيه' });
  }
});
