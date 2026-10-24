import { readFile } from 'node:fs/promises';
import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { hashPassword, requireAdmin } from '../lib/auth.js';

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

/** GET /api/admin/library/subjects — خيارات المادة لرفع عناصر المكتبة */
adminDataRouter.get('/library/subjects', requireAdmin, async (_req, res) => {
  try {
    const subjects = await prisma.subject.findMany({
      orderBy: { code: 'asc' },
      select: { id: true, name: true },
    });
    res.json({ subjects });
  } catch (e) {
    console.error('admin library subjects error:', e);
    res.status(500).json({ error: 'تعذّر تحميل المواد' });
  }
});

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
        filePath: r.filePath,
        externalUrl: r.externalUrl,
        sourceUrl: r.sourceUrl,
        hasBody: Boolean(r.body),
        bodyChars: r.body ? r.body.length : 0,
        isPublished: r.isPublished,
        publishedAt: r.publishedAt,
        grade: r.grade,
      })),
      summary: {
        total: resources.length,
        verified: resources.filter((r) => r.isVerifiedCurriculum).length,
        downloads: resources.reduce((a, r) => a + r.downloadCount, 0),
        published: resources.filter((r) => r.isPublished).length,
        hidden: resources.filter((r) => !r.isPublished).length,
        interactive: resources.filter((r) => r.category === 'interactive_exams').length,
      },
    });
  } catch (e) {
    console.error('admin library error:', e);
    res.status(500).json({ error: 'تعذّر تحميل المكتبة' });
  }
});

/** GET /api/admin/library/:id — النص الكامل لعنصر واحد (معاينة الإدارة) */
adminDataRouter.get('/library/:id', requireAdmin, async (req, res) => {
  try {
    const item = await prisma.resource.findUnique({
      where: { id: req.params.id },
      select: { id: true, title: true, category: true, description: true, body: true,
        externalUrl: true, sourceUrl: true, filePath: true, isPublished: true },
    });
    if (!item) {
      res.status(404).json({ error: 'العنصر غير موجود' });
      return;
    }
    res.json({ resource: item });
  } catch (e) {
    console.error('admin library item error:', e);
    res.status(500).json({ error: 'تعذّر تحميل العنصر' });
  }
});

/**
 * PATCH /api/admin/library/:id — قرار الإدارة: نشر للطلاب أو سحب، وتعديل حقول أساسية.
 * `isPublished=false` يُخفي العنصر من تطبيق الطالب فوراً دون حذف المحتوى.
 */
adminDataRouter.patch('/library/:id', requireAdmin, async (req, res) => {
  try {
    const body = req.body as { isPublished?: unknown; title?: unknown; description?: unknown; sortOrder?: unknown };
    const data: { isPublished?: boolean; publishedAt?: Date | null; title?: string; description?: string; sortOrder?: number } = {};
    if (typeof body.isPublished === 'boolean') {
      data.isPublished = body.isPublished;
      data.publishedAt = body.isPublished ? new Date() : null;
    }
    if (typeof body.title === 'string' && body.title.trim()) data.title = body.title.trim().slice(0, 200);
    if (typeof body.description === 'string') data.description = body.description.slice(0, 600);
    if (typeof body.sortOrder === 'number' && Number.isFinite(body.sortOrder)) data.sortOrder = body.sortOrder;
    if (!Object.keys(data).length) {
      res.status(400).json({ error: 'لا حقول قابلة للتعديل في الطلب' });
      return;
    }
    const updated = await prisma.resource.update({ where: { id: req.params.id }, data });
    res.json({ ok: true, resource: { id: updated.id, isPublished: updated.isPublished } });
  } catch (e) {
    console.error('admin library patch error:', e);
    res.status(500).json({ error: 'تعذّر تحديث العنصر' });
  }
});

/** PATCH /api/admin/library — نشر أو سحب دفعة كاملة: { ids:[...], isPublished:boolean } */
adminDataRouter.patch('/library', requireAdmin, async (req, res) => {
  try {
    const body = req.body as { ids?: unknown; isPublished?: unknown };
    const ids = Array.isArray(body.ids) ? body.ids.filter((x): x is string => typeof x === 'string') : [];
    if (!ids.length || typeof body.isPublished !== 'boolean') {
      res.status(400).json({ error: 'حدّد عناصر وقرار النشر' });
      return;
    }
    const result = await prisma.resource.updateMany({
      where: { id: { in: ids.slice(0, 2000) } },
      data: { isPublished: body.isPublished, publishedAt: body.isPublished ? new Date() : null },
    });
    res.json({ ok: true, updated: result.count });
  } catch (e) {
    console.error('admin library bulk error:', e);
    res.status(500).json({ error: 'تعذّر تحديث العناصر' });
  }
});

interface LibrarySeedItem {
  id: string;
  title: string;
  category: string;
  subject?: string;
  description?: string;
  body?: string;
  externalUrl?: string;
  sourceUrl?: string;
  fileSize?: string;
  pageCount?: number;
  sortOrder?: number;
  isPublished?: boolean;
}

/**
 * POST /api/admin/library/import — استيراد المكتبة النصية.
 * يقبل `{ source: 'bundled' }` لقراءة الملف المرفق مع الخادم، أو `{ items: [...] }`.
 * العناصر تُنشأ **غير منشورة** افتراضياً: الإدارة تراجعها ثم تنشرها للطلاب.
 */
adminDataRouter.post('/library/import', requireAdmin, async (req, res) => {
  try {
    const body = req.body as { source?: string; items?: unknown; publish?: unknown };
    let items: LibrarySeedItem[] = [];
    if (body.source === 'bundled') {
      const file = new URL('../../prisma/data/library.json', import.meta.url);
      const raw = await readFile(file, 'utf8');
      const parsed = JSON.parse(raw) as { items?: LibrarySeedItem[] };
      items = Array.isArray(parsed.items) ? parsed.items : [];
    } else if (Array.isArray(body.items)) {
      items = body.items as LibrarySeedItem[];
    }
    if (!items.length) {
      res.status(400).json({ error: 'لا عناصر للاستيراد' });
      return;
    }
    const publish = body.publish === true;
    const subjects = await prisma.subject.findMany({ select: { id: true, name: true } });
    const subjectIdFor = (name?: string): string | null => {
      if (!name) return null;
      const norm = (v: string) => v.replace(/[إأآ]/g, 'ا').replace(/\s+/g, ' ').trim();
      const target = norm(name);
      const exact = subjects.find((s) => norm(s.name) === target);
      if (exact) return exact.id;
      const loose = subjects.find((s) => norm(s.name).includes(target) || target.includes(norm(s.name)));
      return loose ? loose.id : null;
    };

    let created = 0;
    let updated = 0;
    for (const item of items.slice(0, 1000)) {
      if (!item?.id || !item?.title) continue;
      const data = {
        title: item.title.slice(0, 200),
        category: item.category || 'notes',
        description: (item.description || '').slice(0, 600),
        subjectId: subjectIdFor(item.subject),
        body: item.body ?? null,
        externalUrl: item.externalUrl ?? null,
        sourceUrl: item.sourceUrl ?? null,
        fileType: item.externalUrl ? 'LINK' : 'TXT',
        fileSize: item.fileSize || (item.body ? `${Math.round(item.body.length / 1024)} ك.ب` : '—'),
        pageCount: item.pageCount ?? 0,
        sortOrder: item.sortOrder ?? 0,
        isPublished: item.isPublished ?? publish,
        publishedAt: (item.isPublished ?? publish) ? new Date() : null,
        status: 'imported',
      };
      const exists = await prisma.resource.findUnique({ where: { id: item.id }, select: { id: true } });
      if (exists) {
        // إعادة الاستيراد لا تلمس قرار النشر: المنشور يبقى منشوراً، والمسحوب يبقى مسحوباً
        const { isPublished: _ignored, publishedAt: _ignoredAt, ...rest } = data;
        void _ignored; void _ignoredAt;
        await prisma.resource.update({ where: { id: item.id }, data: rest });
        updated += 1;
      } else {
        await prisma.resource.create({ data: { id: item.id, ...data } });
        created += 1;
      }
    }
    res.json({ ok: true, created, updated, total: created + updated, published: publish });
  } catch (e) {
    console.error('admin library import error:', e);
    res.status(500).json({ error: 'تعذّر استيراد المكتبة' });
  }
});

/* ============================ طلبات استعادة كلمة المرور ============================ */

/** GET /api/admin/password-requests — الطلبات المعلّقة وآخر ما أُصدر */
adminDataRouter.get('/password-requests', requireAdmin, async (_req, res) => {
  try {
    const rows = await prisma.passwordResetRequest.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { user: { select: { name: true, phone: true, email: true, role: true } } },
    });
    res.json({
      requests: rows.map((r) => ({
        id: r.id,
        identifier: r.identifier,
        status: r.status,
        createdAt: r.createdAt,
        resolvedAt: r.resolvedAt,
        userName: r.user.name,
        userPhone: r.user.phone,
        userEmail: r.user.email,
        userRole: r.user.role,
      })),
      pending: rows.filter((r) => r.status === 'pending').length,
    });
  } catch (e) {
    console.error('password requests error:', e);
    res.status(500).json({ error: 'تعذّر تحميل الطلبات' });
  }
});

/** يحوّل كلمة مرور عشوائية سهلة القراءة والكتابة */
function makeTempPassword(): string {
  const letters = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  let out = '';
  for (let i = 0; i < 3; i++) out += letters[Math.floor(Math.random() * letters.length)];
  for (let i = 0; i < 4; i++) out += digits[Math.floor(Math.random() * digits.length)];
  return out;
}

/**
 * POST /api/admin/password-requests/:id/issue — تصدر الإدارة كلمة مرور مؤقتة.
 * تُعاد مرة واحدة في الرد ليبلغها المدير للطالب، ثم لا تُخزَّن نصّاً.
 */
adminDataRouter.post('/password-requests/:id/issue', requireAdmin, async (req, res) => {
  try {
    const row = await prisma.passwordResetRequest.findUnique({
      where: { id: req.params.id },
      include: { user: { select: { id: true, name: true, phone: true, email: true } } },
    });
    if (!row) {
      res.status(404).json({ error: 'الطلب غير موجود' });
      return;
    }
    const tempPassword = makeTempPassword();
    await prisma.user.update({ where: { id: row.userId }, data: { passwordHash: await hashPassword(tempPassword) } });
    await prisma.passwordResetRequest.update({
      where: { id: row.id },
      data: { status: 'issued', resolvedAt: new Date(), tempPasswordHint: 'أُصدرت كلمة مؤقتة' },
    });
    res.json({ ok: true, tempPassword, user: row.user, identifier: row.identifier });
  } catch (e) {
    console.error('issue temp password error:', e);
    res.status(500).json({ error: 'تعذّر إصدار كلمة المرور' });
  }
});

/** POST /api/admin/password-requests/:id/dismiss — إغلاق الطلب بلا تغيير كلمة المرور */
adminDataRouter.post('/password-requests/:id/dismiss', requireAdmin, async (req, res) => {
  try {
    await prisma.passwordResetRequest.update({
      where: { id: req.params.id },
      data: { status: 'dismissed', resolvedAt: new Date() },
    });
    res.json({ ok: true });
  } catch (e) {
    console.error('dismiss password request error:', e);
    res.status(500).json({ error: 'تعذّر إغلاق الطلب' });
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
