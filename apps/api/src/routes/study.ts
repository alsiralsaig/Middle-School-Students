import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { cleanText, currentUser, requireAuth } from '../lib/auth.js';

/**
 * غرف المذاكرة الجماعية.
 *
 * لماذا: الصفحة كانت تُظهر رسائل مكتوبة مسبقاً في المتصفح و«57 طالباً متصلين»
 * وردوداً وهمية — أي طالب يفتحها يظنّ أنه يراسل زملاءه وهو يراسل نفسه.
 * الآن الرسائل تُحفظ في قاعدة البيانات، ويراها كل من يفتح الغرفة، وعدّاد
 * المتصلين محسوب من آخر ٣٠ دقيقة نشاط حقيقي.
 */
export const studyRouter = Router();

/** الغرف المتاحة — ثابتة في الخادم ليتطابق العدّاد مع ما يراه الطالب */
export const STUDY_ROOMS = ['room-math', 'room-science', 'room-arabic', 'room-general'] as const;

const ONLINE_WINDOW_MIN = 30;
const MAX_BODY = 600;

/** حدّ بسيط: ١٢ رسالة في الدقيقة للطالب الواحد — يمنع الإغراق */
const postHits = new Map<string, { n: number; reset: number }>();
function allowedToPost(uid: string): boolean {
  const now = Date.now();
  const rec = postHits.get(uid);
  if (!rec || rec.reset < now) {
    postHits.set(uid, { n: 1, reset: now + 60_000 });
    return true;
  }
  rec.n += 1;
  return rec.n <= 12;
}

/** لا روابط ولا أرقام هواتف في غرفة يشترك فيها أطفال */
function sanitizeBody(text: string): string {
  return text
    .replace(/https?:\/\/\S+/gi, '[رابط محذوف]')
    .replace(/\b0\d{8,10}\b/g, '[رقم محذوف]')
    .slice(0, MAX_BODY)
    .trim();
}

const dto = (m: {
  id: string;
  roomId: string;
  userId: string;
  name: string;
  avatar: string | null;
  state: string | null;
  body: string;
  createdAt: Date;
}) => ({
  id: m.id,
  roomId: m.roomId,
  userId: m.userId,
  name: m.name,
  avatar: m.avatar,
  state: m.state,
  body: m.body,
  createdAt: m.createdAt.toISOString(),
});

/* ============================ إحصاءات الغرف ============================ */

studyRouter.get('/study/rooms', async (_req, res) => {
  try {
    const since = new Date(Date.now() - ONLINE_WINDOW_MIN * 60_000);
    const [recent, totals] = await Promise.all([
      prisma.studyMessage.findMany({
        where: { createdAt: { gte: since } },
        select: { roomId: true, userId: true, createdAt: true },
      }),
      prisma.studyMessage.groupBy({
        by: ['roomId'],
        _count: { _all: true },
        _max: { createdAt: true },
      }),
    ]);

    const online = new Map<string, Set<string>>();
    for (const r of recent) {
      const set = online.get(r.roomId) || new Set<string>();
      set.add(r.userId);
      online.set(r.roomId, set);
    }

    res.setHeader('Cache-Control', 'no-store');
    res.json({
      windowMinutes: ONLINE_WINDOW_MIN,
      rooms: STUDY_ROOMS.map((roomId) => {
        const t = totals.find((x) => x.roomId === roomId);
        return {
          roomId,
          online: online.get(roomId)?.size ?? 0,
          messages: t?._count._all ?? 0,
          lastMessageAt: t?._max.createdAt?.toISOString() ?? null,
        };
      }),
    });
  } catch (e) {
    console.error('study rooms error:', e);
    res.status(500).json({ error: 'تعذّر تحميل الغرف' });
  }
});

/* ============================ رسائل الغرفة ============================ */

studyRouter.get('/study/rooms/:roomId/messages', async (req, res) => {
  const roomId = String(req.params.roomId || '');
  if (!STUDY_ROOMS.includes(roomId as (typeof STUDY_ROOMS)[number])) {
    res.status(404).json({ error: 'الغرفة غير موجودة' });
    return;
  }
  try {
    const rows = await prisma.studyMessage.findMany({
      where: { roomId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.setHeader('Cache-Control', 'no-store');
    res.json({ messages: rows.reverse().map(dto) });
  } catch (e) {
    console.error('study messages error:', e);
    res.status(500).json({ error: 'تعذّر تحميل الرسائل' });
  }
});

studyRouter.post('/study/rooms/:roomId/messages', requireAuth, async (req, res) => {
  const roomId = String(req.params.roomId || '');
  if (!STUDY_ROOMS.includes(roomId as (typeof STUDY_ROOMS)[number])) {
    res.status(404).json({ error: 'الغرفة غير موجودة' });
    return;
  }
  const me = currentUser(req);
  if (!me) {
    res.status(401).json({ error: 'لازم تسجّل دخول عشان تشارك في المذاكرة' });
    return;
  }
  if (!allowedToPost(me.uid)) {
    res.status(429).json({ error: 'رسائل كثيرة بسرعة — استنى دقيقة وجرّب تاني' });
    return;
  }

  const body = sanitizeBody(cleanText(req.body?.text, MAX_BODY));
  if (body.length < 2) {
    res.status(400).json({ error: 'اكتب رسالة أطول شوية' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: me.uid },
      select: { name: true, avatar: true, state: true },
    });
    const msg = await prisma.studyMessage.create({
      data: {
        roomId,
        userId: me.uid,
        name: user?.name || me.name || 'طالب',
        avatar: user?.avatar ?? null,
        state: user?.state ?? null,
        body,
      },
    });
    res.status(201).json({ message: dto(msg) });
  } catch (e) {
    console.error('study post error:', e);
    res.status(500).json({ error: 'تعذّر إرسال الرسالة' });
  }
});
