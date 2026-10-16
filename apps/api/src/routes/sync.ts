import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { cleanText, currentUser, requireAuth } from '../lib/auth.js';

export const syncRouter = Router();

/**
 * مزامنة البيانات المحلية (localStorage) مع قاعدة البيانات.
 * القاعدة: **آخر كتابة تنتصر** (Last-Write-Wins) مقارنةً بـ updatedAt.
 * - التقدّم والتقييمات: يُطبّق العميل إن كان أحدث من الخادم، وإلا يُعاد ما عند الخادم.
 * - جلسات التركيز: الدمج بأكبر قيمة لكل يوم (تراكمي، لا يُحذف).
 * - التقويم: يُزامَن بمعرّف العميل (upsert).
 */
syncRouter.post('/sync', requireAuth, async (req, res) => {
  const uid = currentUser(req).uid;
  const body = (req.body ?? {}) as Record<string, unknown>;

  /* ---------------- التقدّم ---------------- */
  const clientProgress = Array.isArray(body.progress) ? body.progress : [];
  for (const raw of clientProgress) {
    const p = raw as {
      lessonId?: string;
      completed?: boolean;
      bookmarked?: boolean;
      secondsSpent?: number;
      updatedAt?: string | number;
    };
    const lessonId = cleanText(p.lessonId, 60);
    if (!lessonId) continue;
    const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) continue;

    const clientTime = Number(new Date(p.updatedAt ?? 0).getTime()) || 0;
    const server = await prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId: uid, lessonId } },
    });
    const serverTime = server ? server.updatedAt.getTime() : 0;
    if (server && serverTime > clientTime) continue; // الخادم أحدث

    await prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId: uid, lessonId } },
      create: {
        userId: uid,
        lessonId,
        completed: Boolean(p.completed),
        bookmarked: Boolean(p.bookmarked),
        secondsSpent: Math.max(0, Math.min(86400, Number(p.secondsSpent) || 0)),
      },
      update: {
        completed: Boolean(p.completed),
        bookmarked: Boolean(p.bookmarked),
        secondsSpent: Math.max(0, Math.min(86400, Number(p.secondsSpent) || 0)),
      },
    });
  }

  /* ---------------- التقييمات ---------------- */
  const clientRatings = Array.isArray(body.ratings) ? body.ratings : [];
  for (const raw of clientRatings) {
    const r = raw as { lessonId?: string; rating?: number; comment?: string; createdAt?: string | number };
    const lessonId = cleanText(r.lessonId, 60);
    const rating = Number(r.rating);
    if (!lessonId || !Number.isInteger(rating) || rating < 1 || rating > 5) continue;
    const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) continue;

    const clientTime = Number(new Date(r.createdAt ?? 0).getTime()) || 0;
    const server = await prisma.lessonRating.findUnique({
      where: { userId_lessonId: { userId: uid, lessonId } },
    });
    if (server && server.createdAt.getTime() > clientTime) continue;

    await prisma.lessonRating.upsert({
      where: { userId_lessonId: { userId: uid, lessonId } },
      create: { userId: uid, lessonId, rating, comment: cleanText(r.comment, 600) || null },
      update: { rating, comment: cleanText(r.comment, 600) || null },
    });
  }

  /* ---------------- جلسات التركيز (دمج بأكبر قيمة) ---------------- */
  const clientFocus = (body.focus as { log?: Record<string, number> })?.log ?? {};
  if (typeof clientFocus === 'object' && clientFocus) {
    const serverRows = await prisma.studySession.findMany({ where: { userId: uid } });
    const serverLog: Record<string, number> = {};
    serverRows.forEach((s) => {
      serverLog[s.day] = (serverLog[s.day] ?? 0) + 1;
    });

    for (const [day, sessions] of Object.entries(clientFocus)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
      const want = Math.max(0, Math.min(50, Number(sessions) || 0));
      const have = serverLog[day] ?? 0;
      const diff = want - have;
      if (diff <= 0) continue;
      await prisma.studySession.createMany({
        data: Array.from({ length: diff }, () => ({ userId: uid, day, minutes: 25 })),
      });
    }
  }

  /* ---------------- التقويم ---------------- */
  const clientEvents = Array.isArray(body.planner) ? body.planner : [];
  for (const raw of clientEvents) {
    const e = raw as Record<string, unknown>;
    const id = cleanText(e.id, 60);
    const title = cleanText(e.title, 120);
    const date = cleanText(e.date, 10);
    if (!id || !title || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;

    const data = {
      userId: uid,
      title,
      date,
      time: cleanText(e.time, 5) || '19:00',
      type: cleanText(e.type, 20) || 'review',
      subjectName: cleanText(e.subjectName, 60) || 'عام',
      description: cleanText(e.description, 400) || null,
      groupId: cleanText(e.groupId, 60) || null,
      weekday: typeof e.weekday === 'number' ? e.weekday : null,
    };
    await prisma.plannerEvent.upsert({
      where: { id },
      create: { id, ...data },
      update: data,
    });
  }

  /* ---------------- إرجاع الحالة النهائية من الخادم ---------------- */
  const [progress, ratings, sessions, events] = await Promise.all([
    prisma.lessonProgress.findMany({ where: { userId: uid } }),
    prisma.lessonRating.findMany({ where: { userId: uid } }),
    prisma.studySession.findMany({ where: { userId: uid } }),
    prisma.plannerEvent.findMany({ where: { userId: uid }, orderBy: [{ date: 'asc' }, { time: 'asc' }] }),
  ]);

  const focusLog: Record<string, number> = {};
  sessions.forEach((s) => {
    focusLog[s.day] = (focusLog[s.day] ?? 0) + 1;
  });

  res.json({
    syncedAt: new Date().toISOString(),
    progress: progress.map((p) => ({
      lessonId: p.lessonId,
      completed: p.completed,
      bookmarked: p.bookmarked,
      secondsSpent: p.secondsSpent,
      updatedAt: p.updatedAt,
    })),
    ratings: ratings.map((r) => ({
      lessonId: r.lessonId,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
    })),
    focus: { log: focusLog },
    planner: events,
  });
});
