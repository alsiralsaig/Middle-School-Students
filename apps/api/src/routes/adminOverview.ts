import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAdmin } from '../lib/auth.js';

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
      prisma.subject.count(),
      prisma.unit.count(),
      prisma.lesson.count(),
      prisma.lesson.count({ where: { status: 'verified' } }),
      prisma.resource.count(),
      prisma.user.count({ where: { role: 'student' } }),
      prisma.accessCode.count({ where: { status: 'active' } }),
      prisma.exam.count(),
      prisma.examAttempt.count(),
      prisma.subject.findMany({
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
