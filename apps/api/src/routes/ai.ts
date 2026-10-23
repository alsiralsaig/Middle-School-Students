import { Router } from 'express';
import { GoogleGenAI } from '@google/genai';
import { cleanText, currentUser, requireAuth } from '../lib/auth.js';
import {
  aiStatus,
  answer,
  answerStream,
  contextToText,
  findCurriculumContext,
  type ChatTurn,
} from '../lib/aiProviders.js';

export const aiRouter = Router();

/**
 * المفتاح يعيش على الخادم فقط — لا يُرسل للمتصفح أبداً.
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
  return rec.count <= AI_RATE_MAX ? { ok: true } : { ok: false, retryMinutes: Math.ceil((rec.resetAt - now) / 60_000) };
}

function parseTurns(raw: unknown): ChatTurn[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((m) => {
      const item = m as { sender?: string; role?: string; text?: string };
      const role: 'user' | 'bot' = (item.sender === 'user' || item.role === 'user') ? 'user' : 'bot';
      return { role, text: cleanText(item.text, 800) };
    })
    .filter((t) => !!t.text);
}

/* ============================ الحالة (تشخيص) ============================ */

/** يعرض أي مزوّد ذكاء اصطناعي مفعّل فعلاً — بلا أي مفاتيح */
aiRouter.get('/ai/status', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(aiStatus());
});

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
  const mimeType = mimeTypeRaw.startsWith('audio/') ? mimeTypeRaw.split(';')[0] : 'audio/webm';

  if (!audioB64) {
    res.status(400).json({ error: 'التسجيل الصوتي مطلوب' });
    return;
  }
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

  const key = (process.env.GEMINI_API_KEY || '').trim();
  if (!key) {
    res.json({ reply: null, unconfigured: true });
    return;
  }
  const ai = new GoogleGenAI({ apiKey: key });

  const instruction =
    'هذا تسجيل صوتي لطالب سوداني بيتكلم بالعامية السودانية (ممكن تتداخل معاها فصحى). ' +
    'افهم سؤاله من الصوت مباشرة (انتبه للمفردات اللهجية: إش/شنو = ماذا، ليش = لماذا، ' +
    'داير/عاوز = يريد، زول = شخص، لفّة = مرة، شديد = كثير...). ' +
    'لا تكتب نص التحويل ولا تشرح إنك فهمت — جاوب سؤاله مباشرة وفق أسلوبك التربوي.';

  const parts: Array<Record<string, unknown>> = [{ text: instruction }];
  parts.push({ inlineData: { mimeType, data: audioB64 } });

  for (const model of ['gemini-flash-lite-latest', 'gemini-flash-latest']) {
    for (const mime of [mimeType, mimeType === 'audio/webm' ? 'audio/ogg' : mimeType]) {
      try {
        parts[1] = { inlineData: { mimeType: mime, data: audioB64 } };
        const out = await ai.models.generateContent({
          model,
          contents: [{ role: 'user', parts }],
          config: {
            systemInstruction:
              'أنت معلم سوداني خبير ومحبوب للصف الثالث المتوسط. اتكلم بالعامية السودانية البسيطة، ' +
              'وحل المسائل خطوة بخطوة، وخلّي الرد قصير ومباشر.',
          },
        });
        const text = (out as { text?: string }).text;
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

/**
 * POST /api/ai/chat
 * الجسم: { prompt, subject?, history?, stream? }
 *
 * `stream: true` يرجّع نصاً متدفّقاً (text/plain) فيظهر الجواب كلمة بكلمة
 * بدل ما الطالب ينتظر الرد كامل — أسرع إحساساً على نت ضعيف.
 */
aiRouter.post('/ai/chat', requireAuth, async (req, res) => {
  const uid = currentUser(req).uid;
  const prompt = cleanText(req.body?.prompt, 1200);
  const subject = cleanText(req.body?.subject, 100);
  const wantsStream = req.body?.stream === true;
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

  const history = parseTurns(req.body?.history);
  const question = subject ? `المادة: ${subject}\n\nسؤال الطالب: ${prompt}` : prompt;

  // ١) سياق من المنهج — يجعل الإجابة من مقرر الطالب وأسرع
  const hits = await findCurriculumContext(prompt, subject || undefined);
  const context = contextToText(hits);

  // ٢) الرد
  if (wantsStream) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Accel-Buffering', 'no');
    // نرسل المصادر كسطر أول مخفي يفهمه التطبيق
    if (hits.length) {
      res.write(`[[sources:${hits.map((h) => `${h.subjectName} — ${h.lessonTitle}`).join(' | ')}]]\n`);
    }
    const { text, provider } = await answerStream(history, question, context, (chunk) => {
      res.write(chunk);
    });
    if (!text) {
      res.write(
        'أهلاً بك يا بطل! 🇸🇩 سؤالك وصل، لكن خدمة الذكاء الاصطناعي ما ردّت حالياً.\n' +
          '• راجع الشرح التفصيلي للدرس والقواعد في تبويب «الدروس».\n' +
          '• جرّب تسأل تاني بعد شوية.',
      );
    } else if (provider) {
      res.setHeader('X-AI-Provider', provider);
    }
    res.end();
    return;
  }

  const result = await answer(history, question, context);
  if (!result.text) {
    res.json({
      reply:
        'أهلاً بك يا بطل! 🇸🇩 سؤالك وصل، لكن خدمة الذكاء الاصطناعي ما ردّت حالياً.\n\n' +
        '• راجع الشرح التفصيلي للدرس والقواعد الأساسية في تبويب «الدروس».\n' +
        '• أعد طرح السؤال بعد قليل.',
      offline: true,
    });
    return;
  }
  res.json({ reply: result.text, provider: result.provider, sources: hits.map((h) => `${h.subjectName} — ${h.lessonTitle}`) });
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

  const history = parseTurns(req.body?.history);

  // سياق الدرس المفتوح + سياق من باقي المنهج
  const hits = await findCurriculumContext(question, subjectName);
  const combined = [
    lessonContext ? `الدرس المفتوح الآن: ${lessonTitle} (${subjectName})\n"""\n${lessonContext}\n"""` : '',
    contextToText(hits),
  ]
    .filter(Boolean)
    .join('\n\n');

  const result = await answer(history, question, combined);
  if (!result.text) {
    res.json({
      reply:
        `أهلاً بك يا بطل! 🇸🇩 بخصوص سؤالك عن درس «${lessonTitle}» في مادة ${subjectName}:\n\n` +
        '• راجع الشرح التفصيلي للدرس والقواعد الأساسية في المذكرة.\n' +
        '• خدمة الذكاء الاصطناعي ما ردّت حالياً — أعد طرح السؤال بعد قليل.',
      offline: true,
    });
    return;
  }
  res.json({ reply: result.text, provider: result.provider });
});
