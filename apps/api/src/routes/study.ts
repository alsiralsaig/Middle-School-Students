import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { cleanText, currentUser, requireAuth } from '../lib/auth.js';
import { answer, contextToText, findCurriculumContext, findLessonIndex, type ChatTurn } from '../lib/aiProviders.js';

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

/**
 * «الأستاذ» — مدرّس المنصة داخل غرف المذاكرة.
 *
 * لماذا: الغرفة كانت تنتظر ردّ زميل حقيقي، ولو ما في حد متصل يكتب الطالب
 * سؤاله ولا أحد يرد. الآن زر «اسأل المدرس» يرسل السؤال إلى النموذج الذكي
 * مع سياق من المنهج الحقيقي (٤٠٥ دروس في القاعدة)، ويرد بالعامية السودانية،
 * والرد يُحفظ في الغرفة كرسالة عادية فيراه باقي الطلاب ويستفيدون منه.
 */
const TEACHER_ID = 'teacher';
const TEACHER_NAME = 'الأستاذ — مدرس المنصة';

/** حدّ ألطف من الذكاء الاصطناعي: ١٢ سؤالاً كل ١٠ دقائق للطالب */
const aiHits = new Map<string, { n: number; reset: number }>();
function allowedAI(uid: string): boolean {
  const now = Date.now();
  const rec = aiHits.get(uid);
  if (!rec || rec.reset < now) {
    aiHits.set(uid, { n: 1, reset: now + 10 * 60_000 });
    return true;
  }
  rec.n += 1;
  return rec.n <= 12;
}

/** مادة الغرفة: تُستخدم لتضييق البحث في المنهج */
const ROOM_SUBJECT: Record<string, string | undefined> = {
  'room-math': 'الرياضيات',
  'room-science': 'العلوم',
  'room-arabic': 'اللغة العربية',
  'room-general': undefined,
};

/**
 * إحالة الدرس: النموذج أحياناً يذكر اسماً غير الذي أعطيناه (اختبار حقيقي:
 * سياق «وحدات الحجم» فكتب «من درس: حجم الهرم»). نحذف الإحالة إن لم تكن
 * من أسماء الدروس التي أعطيناها فعلاً — الطالب يقدر يفتح الدرس المذكور.
 */
function stripBadLessonCite(text: string, allowedTitles: string[]): string {
  const norm = (x: string) => x.replace(/[()«»"']/g, '').replace(/\s+/g, ' ').trim();
  const allowed = allowedTitles.map(norm);
  // اسم الدرس قد يحتوي قوسين: «تعريف التطبيق (الدالة) والمجال والمدى»
  // فالمطابقة بالقوس المتداخل تفشل — نقارن بنص مجرّد ونقصّ الإحالة من مكانها.
  return text.replace(/\(\s*من درس:[\s\S]*?\)(\s*$|\s*\n)/g, (whole, tail: string) => {
    const inner = norm(whole.replace(/^\(\s*من درس:/, '').replace(/\)\s*$/, ''));
    return allowed.includes(inner) ? whole : tail.trim() ? tail : '';
  });
}

/**
 * المطابقة في محرّك المنهج كلماتية وقد ترجّع درساً بعيداً (اختبار حقيقي:
 * «المصفوفات والمحددات» طابق درساً لا علاقة له). قبل أن نعتبر الدرس مصدراً
 * موثوقاً نتأكد أن كلمة معتبرة من السؤال موجودة في عنوان الدرس أو ملخّصه.
 */
function hitIsRelevant(question: string, hits: Array<{ lessonTitle: string; summary: string }>): boolean {
  const norm = (x: string) =>
    x
      .replace(/[\u064B-\u0652\u0670]/g, '')
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/ى/g, 'ي')
      .replace(/ة/g, 'ه')
      .replace(/[^\u0621-\u064Aa-z0-9\s]/g, ' ');
  const stop = new Set([
    'اشرح', 'شرح', 'لي', 'ايش', 'شنو', 'كيف', 'ما', 'هو', 'هي', 'من', 'في', 'على', 'عن',
    'درس', 'الدروس', 'المنهج', 'الوحده', 'بين', 'الفرق', 'مثال', 'امثله', 'اذكر', 'عرف',
    'تعريف', 'ماذا', 'هذا', 'هذه', 'ذلك', 'الي', 'اللي', 'مع', 'ثم', 'او', 'ان', 'هل',
  ]);
  const words = norm(question)
    .split(/\s+/)
    .map((w) => w.replace(/^ال/, ''))
    .filter((w) => w.length >= 4 && !stop.has(w));
  if (!words.length) return false;
  const hay = norm(hits.map((h) => `${h.lessonTitle} ${h.summary}`).join(' '));
  return words.some((w) => hay.includes(w));
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

/**
 * سؤال للمدرّس — يُحفظ سؤال الطالب وردّ الأستاذ في الغرفة نفسها.
 * يرجع الرسالتين ليضيفهما التطبيق بلا انتظار دورة التحديث.
 */
studyRouter.post('/study/rooms/:roomId/teacher', requireAuth, async (req, res) => {
  const roomId = String(req.params.roomId || '');
  if (!STUDY_ROOMS.includes(roomId as (typeof STUDY_ROOMS)[number])) {
    res.status(404).json({ error: 'الغرفة غير موجودة' });
    return;
  }
  const me = currentUser(req);
  if (!me) {
    res.status(401).json({ error: 'سجّل دخول الأول' });
    return;
  }

  const question = sanitizeBody(cleanText(req.body?.question, 400));
  if (question.length < 3) {
    res.status(400).json({ error: 'اكتب سؤالك للمدرس أول' });
    return;
  }
  if (!allowedAI(me.uid)) {
    res.status(429).json({ error: 'أسئلة كثيرة للمدرس — استنى شوية وجرّب تاني' });
    return;
  }

  try {
    const subject = ROOM_SUBJECT[roomId];
    // ١) سياق من المنهج الحقيقي
    const hits = await findCurriculumContext(question, subject, 3);
    const roomHint = subject
      ? `غرفة المذاكرة: ${subject}.`
      : 'غرفة مراجعة شاملة لكل المواد.';
    /**
     * اختبار حقيقي كشف الخطر: سألنا «الممنوع من الصرف» و«قانون نيوتن الثاني»
     * — وليسا في منهج الثالث المتوسط — فأجاب النموذج مرتين بتعريفين مختلفين
     * وكلاهما غلط. الطالب الصغير يثق في «الأستاذ»، فالغلط هنا أخطر من عدم الرد.
     *
     * السياسة الآن: إذا لقينا درساً مطابقاً في المنهج نجيب من محتواه (مصدر
     * موثوق). وإذا ما لقينا: يقول بصراحة إن النقطة دي ما وردت في دروس المنصة
     * ويقترح أقرب درس من الفهرس الحقيقي — بلا تعريفات من معرفته العامة.
     */
    const grounded = hits.length > 0 && hitIsRelevant(question, hits);

    let context: string;
    if (grounded) {
      context = [roomHint, contextToText(hits)].join('\n\n');
    } else {
      const index = subject ? await findLessonIndex(subject, 30) : [];
      const scope = index.length
        ? `دروس هذه المادة في المنصة:\n${index.join(' · ')}`
        : 'فهرس الدروس غير متاح لهذه الغرفة.';
      context = [
        roomHint,
        'ما لقينا في المنهج درساً يشرح هذا السؤال. القاعدة الصارمة هنا:',
        '١) قل للطالب بصراحة وبودّ: «النقطة دي ما وردت في دروس المنصة» — بجملة واحدة.',
        '٢) اقترح له أقرب درس أو موضوع من الفهرس أدناه لو كان قريباً من سؤاله.',
        '٣) ممنوع منعاً باتاً أن تشرح القاعدة أو التعريف من معرفتك العامة، وممنوع تأليف أمثلة.',
        '٤) اختم بسؤال قصير: هل يفتح الدرس المقترح؟ (٣ أسطر كحد أقصى)',
        scope,
      ].join('\n\n');
    }

    // ٢) آخر رسائل الغرفة كسياق محادثة (٦ رسائل)
    const recent = await prisma.studyMessage.findMany({
      where: { roomId },
      orderBy: { createdAt: 'desc' },
      take: 6,
    });
    const turns: ChatTurn[] = recent
      .reverse()
      .map((m) => ({
        role: m.userId === TEACHER_ID ? ('bot' as const) : ('user' as const),
        text: m.userId === TEACHER_ID ? m.body : `${m.name}: ${m.body}`,
      }))
      .slice(-6);

    // ٣) الرد
    const { text, provider } = await answer(turns, question, context);
    if (!text) {
      res.status(503).json({
        error: 'الأستاذ مشغول شوية — جرّب تسأل تاني بعد دقيقة',
        hint: 'لو المشكلة بتتكرر كلّم الدعم من زر واتساب',
      });
      return;
    }

    // ٤) الحفظ: سؤال الطالب ثم ردّ الأستاذ
    const asker = await prisma.user.findUnique({
      where: { id: me.uid },
      select: { name: true, avatar: true, state: true },
    });
    const asked = await prisma.studyMessage.create({
      data: {
        roomId,
        userId: me.uid,
        name: asker?.name || me.name || 'طالب',
        avatar: asker?.avatar ?? null,
        state: asker?.state ?? null,
        body: question,
      },
    });
    const safeText = stripBadLessonCite(text, grounded ? hits.map((h) => h.lessonTitle) : []).trim();
    /* الإفصاح عن المصدر جزء من الرد ولا يعتمد على انتباه النموذج */
    // لا نكرّر التنبيه لو النموذج صرّح بنفسه أن النقطة خارج المنهج
    const alreadyHonest = /ما (وردت|لقينا)|خارج (دروس|المنهج)/.test(safeText);
    const body = grounded || alreadyHonest
      ? safeText
      : `ملاحظة: الحتة دي ما لقينا ليها شرح في دروس المنصة — ده شرح عام، راجعه مع أستاذك.\n\n${safeText}`;
    const reply = await prisma.studyMessage.create({
      data: {
        roomId,
        userId: TEACHER_ID,
        name: TEACHER_NAME,
        avatar: null,
        state: null,
        body: body.slice(0, 4000),
      },
    });

    res.status(201).json({
      messages: [dto(asked), dto(reply)],
      provider,
      usedCurriculum: grounded,
      lesson: hits[0]?.lessonTitle ?? null,
    });
  } catch (e) {
    console.error('study teacher error:', e);
    res.status(500).json({ error: 'تعذّر الوصول للمدرس — جرّب تاني' });
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
