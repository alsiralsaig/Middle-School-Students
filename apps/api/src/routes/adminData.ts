import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAdmin } from '../lib/auth.js';

/**
 * بقية شاشات اللوحة — الإدارة فقط.
 *
 * لماذا موجود: ثلاث صفحات (المكتبة · التقييمات · الأنشطة) كانت تقرأ
 * مصفوفات ثابتة مضمّنة في الكود. كل الجداول التي تحتاجها موجودة أصلاً
 * ومعبّأة بالبيانات — لم يكن ينقصها إلا مسار يقرأها.
 *
 * كل رقم هنا **مقروء أو محسوب من جدول فعلي** — لا قيم مقدَّرة.
 */
export const adminDataRouter = Router();

/* ============================ المكتبة ============================ */

/** GET /api/admin/library — عناصر المكتبة من جدول Resource */
adminDataRouter.get('/library', requireAdmin, async (_req, res) => {
  try {
    const resources = await prisma.resource.findMany({
      where: { category: { not: 'exam-attachment' } },
      orderBy: [{ category: 'asc' }, { title: 'asc' }],
      include: { subject: { select: { id: true, name: true } } },
    });

    res.json({
      resources: resources.map((r) => ({
        id: r.id,
        title: r.title,
        category: r.category,
        fileType: r.fileType,
        fileSize: r.fileSize,
        pageCount: r.pageCount,
        author: r.author,
        publishYear: r.publishYear,
        description: r.description,
        status: r.status,
        downloadCount: r.downloadCount,
        isVerifiedCurriculum: r.isVerifiedCurriculum,
        subjectId: r.subjectId,
        subjectName: r.subject?.name ?? '—',
      })),
      summary: {
        total: resources.length,
        verified: resources.filter((r) => r.isVerifiedCurriculum).length,
        downloads: resources.reduce((a, r) => a + r.downloadCount, 0),
      },
    });
  } catch (e) {
    console.error('admin library error:', e);
    res.status(500).json({ error: 'تعذّر تحميل المكتبة' });
  }
});

/* ============================ التقييمات ============================ */

/** وجه تعبيري يلخّص المتوسط — نفس ما يعرضه تطبيق الطالب */
function faceFor(average: number): string {
  if (average >= 4.5) return '😍';
  if (average >= 4) return '😊';
  if (average >= 3) return '🙂';
  if (average >= 2) return '😐';
  if (average > 0) return '😕';
  return '—';
}

/** GET /api/admin/ratings — متوسط تقييمات كل درس */
adminDataRouter.get('/ratings', requireAdmin, async (_req, res) => {
  try {
    const grouped = await prisma.lessonRating.groupBy({
      by: ['lessonId'],
      _avg: { rating: true },
      _count: { rating: true },
    });

    if (grouped.length === 0) {
      res.json({ ratings: [], summary: { total: 0, average: 0 } });
      return;
    }

    const lessons = await prisma.lesson.findMany({
      where: { id: { in: grouped.map((g) => g.lessonId) } },
      select: {
        id: true,
        title: true,
        subject: { select: { id: true, name: true } },
      },
    });
    const lessonMap = new Map(lessons.map((l) => [l.id, l]));

    const ratings = grouped
      .map((g) => {
        const lesson = lessonMap.get(g.lessonId);
        const average = Number((g._avg.rating ?? 0).toFixed(1));
        return {
          id: g.lessonId,
          title: lesson?.title ?? g.lessonId,
          subjectId: lesson?.subject?.id ?? '',
          subjectName: lesson?.subject?.name ?? '—',
          average,
          total: g._count.rating,
          emoji: faceFor(g._avg.rating ?? 0),
        };
      })
      .sort((a, b) => b.average - a.average || b.total - a.total);

    const allAvg =
      ratings.reduce((a, r) => a + r.average * r.total, 0) /
        ratings.reduce((a, r) => a + r.total, 0) || 0;

    res.json({
      ratings,
      summary: {
        total: ratings.reduce((a, r) => a + r.total, 0),
        average: Number(allAvg.toFixed(2)),
        lessonsRated: ratings.length,
      },
    });
  } catch (e) {
    console.error('admin ratings error:', e);
    res.status(500).json({ error: 'تعذّر تحميل التقييمات' });
  }
});

/* ============================ الأنشطة ============================ */

/** GET /api/admin/activity — جلسات الدراسة ومحاولات الاختبارات */
adminDataRouter.get('/activity', requireAdmin, async (_req, res) => {
  try {
    const [sessions, attempts, progress, users] = await Promise.all([
      prisma.studySession.findMany({
        orderBy: { createdAt: 'desc' },
        take: 200,
        include: { user: { select: { id: true, name: true } } },
      }),
      prisma.examAttempt.findMany({
        orderBy: { startedAt: 'desc' },
        take: 100,
        include: {
          user: { select: { name: true } },
          exam: { select: { title: true } },
        },
      }),
      prisma.lessonProgress.count({ where: { completed: true } }),
      prisma.user.count({ where: { role: 'student' } }),
    ]);

    // تجميع الدقائق حسب اليوم (حقل `day` نصّي بصيغة تاريخ)
    const byDay = new Map<string, { minutes: number; sessions: number }>();
    for (const s of sessions) {
      const cur = byDay.get(s.day) ?? { minutes: 0, sessions: 0 };
      cur.minutes += s.minutes;
      cur.sessions += 1;
      byDay.set(s.day, cur);
    }
    const days = [...byDay.entries()]
      .map(([day, v]) => ({ day, ...v }))
      .sort((a, b) => (a.day < b.day ? 1 : -1))
      .slice(0, 30);

    const totalMinutes = sessions.reduce((a, s) => a + s.minutes, 0);

    res.json({
      days,
      recentSessions: sessions.slice(0, 20).map((s) => ({
        id: s.id,
        student: s.user.name,
        day: s.day,
        minutes: s.minutes,
        at: s.createdAt.toISOString(),
      })),
      recentAttempts: attempts.slice(0, 20).map((a) => ({
        id: a.id,
        student: a.user?.name ?? '—',
        exam: a.exam?.title ?? '—',
        score: a.score,
        total: a.total,
        percent: a.total > 0 ? Math.round((a.score / a.total) * 100) : 0,
        finished: a.finishedAt !== null,
        at: a.startedAt.toISOString(),
      })),
      summary: {
        totalMinutes,
        totalSessions: sessions.length,
        completedLessons: progress,
        students: users,
        examAttempts: attempts.length,
        averageScore:
          attempts.length > 0
            ? Math.round(
                (attempts.reduce(
                  (a, x) => a + (x.total > 0 ? (x.score / x.total) * 100 : 0),
                  0,
                ) /
                  attempts.length) as number,
              )
            : 0,
        averageMinutesPerStudent:
          users > 0 ? Math.round(totalMinutes / users) : 0,
      },
    });
  } catch (e) {
    console.error('admin activity error:', e);
    res.status(500).json({ error: 'تعذّر تحميل الأنشطة' });
  }
});
