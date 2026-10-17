import { Router } from 'express';
import { GoogleGenAI } from '@google/genai';
import { cleanText, currentUser, requireAuth } from '../lib/auth.js';

export const aiRouter = Router();

/**
 * المفتاح يعيش على الخادم فقط (GEMINI_API_KEY) — لا يُرسل للمتصفح أبداً.
 * تحديد: 20 طلب / 10 دقائق لكل مستخدم، وسقف يومي عام.
 */
const AI_RATE_WINDOW_MS = 10 * 60_000;
const AI_RATE_MAX = Number(process.env.AI_RATE_MAX || 20);
const AI_DAILY_CAP = Number(process.env.AI_DAILY_CAP || 2000);

const hits = new Map<string, { count: number; resetAt: number }>();
let dayKey = new Date().toISOString().slice(0, 10);
let dayCount = 0;

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of hits) if (now > v.resetAt) hits.delete(k);
}, 10 * 60_000).unref?.();

function guard(key: string): { ok: boolean; retryMinutes?: number; daily?: boolean } {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== dayKey) {
    dayKey = today;
    dayCount = 0;
  }
  if (dayCount >= AI_DAILY_CAP) return { ok: false, daily: true };

  const now = Date.now();
  const rec = hits.get(key);
  if (!rec || now > rec.resetAt) {
    hits.set(key, { count: 1, resetAt: now + AI_RATE_WINDOW_MS });
    return { ok: true };
  }
  rec.count += 1;
  return rec.count <= AI_RATE_MAX
    ? { ok: true }
    : { ok: false, retryMinutes: Math.ceil((rec.resetAt - now) / 60_000) };
}

const SYSTEM_PROMPT =
  'أنت معلم سوداني خبير ومحبوب للصف الثالث المتوسط (الشهادة المتوسطة — جمهورية السودان). ' +
  'اتكلم بالعامية السودانية البسيطة والودية (كلام الناس اليومي في السودان: يا بطل، خلاص، دي، بقول لك، ' +
  'أوشة، شديد، تمام؟) عشان الطالب يحس إنك أخوه الأكبر، بس خلّي المصطلحات العلمية والقواعد ' +
  'بالعربية الفصحى المبسطة عشان المنهج. ' +
  'اربط الشرح بالمنهج السوداني، وحل المسائل والقواعد خطوة بخطوة، وشجّع الطالب دايماً. ' +
  'استخدم تنسيقاً واضحاً بالعناوين والنقاط يناسب شاشة الهاتف، وخلّي الرد قصير ومباشر قدر الإمكان. ' +
  'لا تتجاوز حدود المنهج، ولا تخترع معلومات خارج المقرر، وإن لم تعرف قل ذلك بصراحة.';

function getClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  return new GoogleGenAI({ apiKey: key });
}

type Role = 'user' | 'assistant';

async function ask(history: Array<{ sender: Role; text: string }>, question: string): Promise<string | null> {
  const ai = getClient();
  if (!ai) return null;

  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
  history.slice(-4).forEach((m) => {
    const txt = cleanText(m.text, 800);
    if (!txt) return;
    contents.push({ role: m.sender === 'user' ? 'user' : 'model', parts: [{ text: txt }] });
  });
  contents.push({ role: 'user', parts: [{ text: question }] });

  for (const model of ['gemini-flash-latest', 'gemini-flash-lite-latest']) {
    try {
      const res = await ai.models.generateContent({
        model,
        contents,
        config: { systemInstruction: SYSTEM_PROMPT },
      });
      const text = (res as { text?: string }).text;
      if (text) return text;
    } catch (e) {
      console.warn(`[ai] ${model} فشل:`, (e as Error).message);
    }
  }
  return null;
}


/* ============================ السؤال الصوتي ============================ */

/**
 * POST /api/ai/voice — الطالب يتكلم، Gemini يفهم العامية السودانية ويجاوب بها.
 * الجسم: { audio: base64 (بدون أو مع بادئة data:)، mimeType?: string }
 */
aiRouter.post('/ai/voice', requireAuth, async (req, res) => {
  const uid = currentUser(req).uid;
  const rawAudio = typeof req.body?.audio === 'string' ? req.body.audio : '';
  const audioB64 = rawAudio.replace(/^data:[^,]+,/, '');
  const mimeTypeRaw = cleanText(req.body?.mimeType, 60) || 'audio/webm';
  // غلاف webm مع كودك أوبس — نبقيه كما هو إن كان مدعوماً
  const mimeType = mimeTypeRaw.startsWith('audio/') ? mimeTypeRaw.split(';')[0] : 'audio/webm';

  if (!audioB64) {
    res.status(400).json({ error: 'التسجيل الصوتي مطلوب' });
    return;
  }
  // حد أقصى معقول (~650KB بعد فك base64 — دقائق بالأوبس)
  if (audioB64.length > 900_000) {
    res.status(413).json({ error: 'التسجيل طويل — اذكر سؤالك في أقل من دقيقة يا بطل' });
    return;
  }

  const limit = guard(uid);
  if (!limit.ok) {
    res.status(limit.daily ? 503 : 429).json({
      reply: limit.daily
        ? 'وصلنا الحد الأقصى لطلبات اليوم، جرّب غداً يا بطل 🌙'
        : `استخدمت كل الأسئلة المتاحة حالياً 😊 جرّب بعد ${limit.retryMinutes} دقيقة.`,
    });
    return;
  }
  dayCount += 1;

  const ai = getClient();
  if (!ai) {
    res.json({ reply: null, unconfigured: true });
    return;
  }

  const instruction =
    'هذا تسجيل صوتي لطالب سوداني بيتكلم بالعامية السودانية (ممكن تتداخل معاها فصحى). ' +
    'افهم سؤاله من الصوت مباشرة (انتبه للمفردات اللهجية: إش/شنو = ماذا، ليش = لماذا، ' +
    'داير/عاوز = يريد، زول = شخص، لفّة = مرة، شديد = كثير...). ' +
    'لا تكتب نص التحويل ولا تشرح إنك فهمت — جاوب سؤاله مباشرة وفق أسلوبك التربوي.';

  const parts: Array<Record<string, unknown>> = [{ text: instruction }];
  parts.push({ inlineData: { mimeType, data: audioB64 } });

  for (const model of ['gemini-flash-latest', 'gemini-flash-lite-latest']) {
    for (const mime of [mimeType, mimeType === 'audio/webm' ? 'audio/ogg' : mimeType]) {
      try {
        parts[1] = { inlineData: { mimeType: mime, data: audioB64 } };
        const res2 = await ai.models.generateContent({
          model,
          contents: [{ role: 'user', parts }],
          config: { systemInstruction: SYSTEM_PROMPT },
        });
        const text = (res2 as { text?: string }).text;
        if (text) {
          res.json({ reply: text });
          return;
        }
      } catch (e) {
        console.warn(`[ai-voice] ${model}/${mime} فشل:`, (e as Error).message);
      }
    }
  }
  res.json({ reply: null, unconfigured: true });
});

/* ============================ المحادثة العامة ============================ */

aiRouter.post('/ai/chat', requireAuth, async (req, res) => {
  const uid = currentUser(req).uid;
  const prompt = cleanText(req.body?.prompt, 1200);
  const subject = cleanText(req.body?.subject, 100);
  if (!prompt) {
    res.status(400).json({ error: 'السؤال مطلوب' });
    return;
  }

  const limit = guard(uid);
  if (!limit.ok) {
    res.status(limit.daily ? 503 : 429).json({
      reply: limit.daily
        ? 'وصلنا الحد الأقصى لطلبات اليوم، جرّب غداً يا بطل 🌙'
        : `استخدمت كل الأسئلة المتاحة حالياً 😊 جرّب بعد ${limit.retryMinutes} دقيقة.`,
    });
    return;
  }
  dayCount += 1;

  const history = Array.isArray(req.body?.history)
    ? (req.body.history as Array<{ sender?: string; text?: string }>).map((m) => ({
        sender: (m.sender === 'user' ? 'user' : 'assistant') as Role,
        text: cleanText(m.text, 800),
      }))
    : [];

  const reply = await ask(history, subject ? `المادة: ${subject}\n\nسؤال الطالب: ${prompt}` : prompt);

  if (!reply) {
    res.json({
      reply:
        'أهلاً بك يا بطل! 🇸🇩 سؤالك وصل، لكن خادم الذكاء الاصطناعي غير مضبوط حالياً ' +
        '(مفتاح GEMINI_API_KEY غير مفعّل أو به ضغط مؤقت).\n\n' +
        '• راجع الشرح التفصيلي للدرس والقواعد الأساسية في المذكرة.\n' +
        '• أعد طرح السؤال بعد قليل لتحصل على إجابة لحظية كاملة.',
      offline: true,
    });
    return;
  }
  res.json({ reply });
});

/* ============================ أسئلة داخل الدرس ============================ */

aiRouter.post('/ai/lesson-chat', requireAuth, async (req, res) => {
  const uid = currentUser(req).uid;
  const question = cleanText(req.body?.question, 1200);
  const lessonTitle = cleanText(req.body?.lessonTitle, 200) || 'الدرس الحالي';
  const subjectName = cleanText(req.body?.subjectName, 100) || 'المقرر';
  const lessonContext = cleanText(req.body?.lessonContext, 4000);
  if (!question) {
    res.status(400).json({ error: 'السؤال مطلوب' });
    return;
  }

  const limit = guard(uid);
  if (!limit.ok) {
    res.status(limit.daily ? 503 : 429).json({
      reply: limit.daily
        ? 'وصلنا الحد الأقصى لطلبات اليوم، جرّب غداً يا بطل 🌙'
        : `استخدمت كل الأسئلة المتاحة حالياً 😊 جرّب بعد ${limit.retryMinutes} دقيقة.`,
    });
    return;
  }
  dayCount += 1;

  const history = Array.isArray(req.body?.history)
    ? (req.body.history as Array<{ sender?: string; text?: string }>).map((m) => ({
        sender: (m.sender === 'user' ? 'user' : 'assistant') as Role,
        text: cleanText(m.text, 800),
      }))
    : [];

  const prompt = [
    `المادة: ${subjectName}`,
    `الدرس: ${lessonTitle}`,
    lessonContext ? `سياق الدرس:\n"""\n${lessonContext}\n"""` : '',
    `سؤال الطالب: ${question}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  const reply = await ask(history, prompt);

  if (!reply) {
    res.json({
      reply:
        `أهلاً بك يا بطل! 🇸🇩 بخصوص سؤالك عن درس «${lessonTitle}» في مادة ${subjectName}:\n\n` +
        '• راجع الشرح التفصيلي للدرس والقواعد الأساسية في المذكرة.\n' +
        '• خادم الذكاء الاصطناعي غير مفعّل حالياً — أعد طرح السؤال بعد قليل.',
      offline: true,
    });
    return;
  }
  res.json({ reply });
});
