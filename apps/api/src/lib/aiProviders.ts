import { prisma } from './prisma.js';

/**
 * مزوّدو الذكاء الاصطناعي — بنفس ترتيب تطبيق «مساعد الشهادة السودانية»:
 *   groq → gemini → openai
 * الفكرة: Groq أسرع بكثير (رد شبه لحظي)، وGemini احتياطي، وOpenAI آخر حل.
 * أي مزوّد بلا مفتاح يُتخطّى تلقائياً، فالنظام يعمل بنفس الكود في كل البيئات.
 */

export type ProviderName = 'groq' | 'gemini' | 'openai';
export const PROVIDER_ORDER: ProviderName[] = ['groq', 'gemini', 'openai'];

export interface ProviderConfig {
  apiKey: string;
  model: string;
}

export function getProviderConfig(): Record<ProviderName, ProviderConfig> {
  return {
    groq: {
      apiKey: (process.env.GROQ_API_KEY || '').trim(),
      model: (process.env.GROQ_MODEL || 'llama-3.3-70b-versatile').trim(),
    },
    gemini: {
      apiKey: (process.env.GEMINI_API_KEY || '').trim(),
      model: (process.env.GEMINI_MODEL || 'gemini-flash-lite-latest').replace(/^models\//, ''),
    },
    openai: {
      apiKey: (process.env.OPENAI_API_KEY || '').trim(),
      model: (process.env.OPENAI_MODEL || 'gpt-4o-mini').trim(),
    },
  };
}

/** مزوّدون جاهزون فعلاً (بمفتاح) بترتيب الأولوية */
export function availableProviders(): ProviderName[] {
  const cfg = getProviderConfig();
  return PROVIDER_ORDER.filter((name) => !!cfg[name].apiKey);
}

/** حالة عامة بلا أي أسرار — تُستخدم للتشخيص من الموقع */
export function aiStatus() {
  const cfg = getProviderConfig();
  const ready = availableProviders();
  return {
    configured: ready.length > 0,
    preferred: ready[0] || null,
    providers: PROVIDER_ORDER.map((name) => ({
      name,
      configured: !!cfg[name].apiKey,
      model: cfg[name].model,
    })),
  };
}

export const SYSTEM_PROMPT =
  'أنت "المساعد السوداني الذكي" لطلاب الصف الثالث المتوسط (الشهادة المتوسطة) في السودان. ' +
  'اتكلم بالعامية السودانية البسيطة والودية (يا بطل، خلاص، دي، بقول ليك، شديد، تمام؟) ' +
  'مع الحفاظ على المصطلحات العلمية والقواعد بالعربية الفصحى المبسطة. ' +
  'اعتمد أولاً وأخيراً على «السياق من المنهج» المرفق: أسماء الدروس والقواعد وأسئلة المنهج. ' +
  'اذكر اسم الدرس أو المادة اللي أخذت منها المعلومة. حل المسائل خطوة بخطوة، وخلّي الرد قصير ' +
  'ومباشر يناسب شاشة الهاتف. لو المعلومة مش موجودة في السياق قول كده بصراحة وانصح الطالب ' +
  'يراجع الدرس الفلاني، وما تخترع معلومة ولا مرجع. ' +
  'عند كتابة معادلة استخدم $...$ للمعادلة داخل السطر و$$...$$ لسطر منفصل.';

export interface CurriculumHit {
  subjectName: string;
  lessonTitle: string;
  lessonId: string;
  summary: string;
  keyRules: string[];
  sections: Array<{ title: string; content: string; formulaOrRule?: string }>;
  faq: Array<{ question: string; answer: string }>;
}

/**
 * بحث نصي داخل المنهج المخزَّن في قاعدة البيانات (بدون خدمة بحث خارجية).
 * الهدف: الإجابة تكون **من مقرر الطالب** لا من معرفة عامة، والإجابة كمان
 * أسرع لأن السياق يقلّل تخمين النموذج.
 */
export async function findCurriculumContext(question: string, subjectName?: string, limit = 3): Promise<CurriculumHit[]> {
  const words = question
    .replace(/[؟?،,.:;!«»"'()\[\]]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3)
    .slice(0, 8);

  if (!words.length) return [];

  try {
    const lessons = await prisma.lesson.findMany({
      where: {
        OR: words.flatMap((w) => [
          { title: { contains: w, mode: 'insensitive' as const } },
          { summary: { contains: w, mode: 'insensitive' as const } },
        ]),
        ...(subjectName ? { subject: { name: { contains: subjectName, mode: 'insensitive' as const } } } : {}),
      },
      orderBy: { lessonNumber: 'asc' },
      take: 6,
      include: { subject: { select: { name: true } } },
    });

    return lessons.slice(0, limit).map((lesson) => {
      const parse = <T,>(raw: string | null, fallback: T): T => {
        if (!raw) return fallback;
        try {
          return JSON.parse(raw) as T;
        } catch {
          return fallback;
        }
      };
      return {
        subjectName: lesson.subject?.name || subjectName || 'المقرر',
        lessonTitle: lesson.title,
        lessonId: lesson.id,
        summary: lesson.summary || '',
        keyRules: parse<string[]>(lesson.keyRules, []).slice(0, 6),
        sections: parse<Array<{ title: string; content: string; formulaOrRule?: string }>>(lesson.sections, [])
          .slice(0, 3)
          .map((s) => ({ title: s.title, content: (s.content || '').slice(0, 400), formulaOrRule: s.formulaOrRule })),
        faq: parse<Array<{ question: string; answer: string }>>(lesson.faq, []).slice(0, 3),
      };
    });
  } catch (e) {
    console.warn('[ai] سياق المنهج فشل:', (e as Error).message);
    return [];
  }
}

export function contextToText(hits: CurriculumHit[]): string {
  if (!hits.length) return '';
  return hits
    .map((h, i) => {
      const rules = h.keyRules.length ? `\n  - القواعد: ${h.keyRules.join(' | ')}` : '';
      const sections = h.sections.length
        ? `\n  - المحاور: ${h.sections.map((s) => `${s.title}${s.formulaOrRule ? ` (${s.formulaOrRule})` : ''}`).join(' | ')}`
        : '';
      const faq = h.faq.length ? `\n  - أسئلة شائعة: ${h.faq.map((f) => `${f.question} ← ${f.answer}`).join(' | ')}` : '';
      return `${i + 1}) مادة ${h.subjectName} — درس «${h.lessonTitle}»\n  - الملخص: ${(h.summary || '').slice(0, 400)}${rules}${sections}${faq}`;
    })
    .join('\n\n');
}

export type ChatTurn = { role: 'user' | 'bot'; text: string };

const TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || 12_000);

function abortable(): { signal: AbortSignal; done: () => void } {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  return { signal: ctrl.signal, done: () => clearTimeout(t) };
}

function toMessages(turns: ChatTurn[], question: string, context: string) {
  const sys = context ? `${SYSTEM_PROMPT}\n\nالسياق من المنهج:\n${context}` : SYSTEM_PROMPT;
  return [
    { role: 'system', content: sys },
    ...turns.slice(-6).map((t) => ({
      role: t.role === 'bot' ? 'assistant' : 'user',
      content: t.text.slice(0, 800),
    })),
    { role: 'user', content: question },
  ];
}

/* ============================ غير متدفّق ============================ */

async function openAiCompatible(name: 'groq' | 'openai', cfg: ProviderConfig, turns: ChatTurn[], question: string, context: string) {
  const { signal, done } = abortable();
  try {
    const res = await fetch(
      name === 'groq' ? 'https://api.groq.com/openai/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.apiKey}` },
        body: JSON.stringify({
          model: cfg.model,
          messages: toMessages(turns, question, context),
          temperature: 0.5,
          max_tokens: 700,
        }),
      },
    );
    if (!res.ok) {
      console.warn(`[ai] ${name} HTTP ${res.status}`);
      return null;
    }
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch (e) {
    console.warn(`[ai] ${name} فشل:`, (e as Error).message);
    return null;
  } finally {
    done();
  }
}

async function callGemini(cfg: ProviderConfig, turns: ChatTurn[], question: string, context: string) {
  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey: cfg.apiKey });
  const sys = context ? `${SYSTEM_PROMPT}\n\nالسياق من المنهج:\n${context}` : SYSTEM_PROMPT;
  const contents = [
    ...turns.slice(-6).map((t) => ({ role: t.role === 'bot' ? 'model' : 'user', parts: [{ text: t.text.slice(0, 800) }] })),
    { role: 'user', parts: [{ text: question }] },
  ];
  // flash-lite أولاً (أسرع)، ثم flash كاحتياط
  for (const model of Array.from(new Set([cfg.model, 'gemini-flash-lite-latest', 'gemini-flash-latest']))) {
    try {
      const res = await ai.models.generateContent({ model, contents, config: { systemInstruction: sys, maxOutputTokens: 800 } });
      const text = (res as { text?: string }).text;
      if (text) return text;
    } catch (e) {
      console.warn(`[ai] gemini/${model} فشل:`, (e as Error).message);
    }
  }
  return null;
}

/** يجرب المزوّدين بالترتيب حتى ينجح واحد */
export async function answer(turns: ChatTurn[], question: string, context: string): Promise<{ text: string | null; provider: ProviderName | null }> {
  const cfg = getProviderConfig();
  for (const name of availableProviders()) {
    const text =
      name === 'gemini'
        ? await callGemini(cfg.gemini, turns, question, context)
        : await openAiCompatible(name, cfg[name], turns, question, context);
    if (text) return { text, provider: name };
  }
  return { text: null, provider: null };
}

/* ============================ متدفّق (SSE) ============================ */

/**
 * نفس الفكرة لكن الكلمات تصل للطالب وهي تُولَّد — الإحساس بالسرعة أهم من
 * السرعة الفعلية، خصوصاً على نت ضعيف.
 */
export async function answerStream(
  turns: ChatTurn[],
  question: string,
  context: string,
  onChunk: (text: string) => void,
): Promise<{ provider: ProviderName | null; text: string }> {
  const cfg = getProviderConfig();
  const messages = toMessages(turns, question, context);

  for (const name of availableProviders()) {
    let acc = '';
    const { signal, done } = abortable();
    try {
      if (name === 'gemini') {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey: cfg.gemini.apiKey });
        const sys = context ? `${SYSTEM_PROMPT}\n\nالسياق من المنهج:\n${context}` : SYSTEM_PROMPT;
        const contents = turns
          .slice(-6)
          .map((t) => ({ role: t.role === 'bot' ? 'model' : 'user', parts: [{ text: t.text.slice(0, 800) }] }))
          .concat([{ role: 'user' as const, parts: [{ text: question }] }]);
        const stream = await ai.models.generateContentStream({
          model: cfg.gemini.model,
          contents,
          config: { systemInstruction: sys, maxOutputTokens: 800 },
        });
        for await (const chunk of stream) {
          const piece = (chunk as { text?: string }).text;
          if (piece) {
            acc += piece;
            onChunk(piece);
          }
        }
      } else {
        const res = await fetch(
          name === 'groq' ? 'https://api.groq.com/openai/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions',
          {
            method: 'POST',
            signal,
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg[name].apiKey}` },
            body: JSON.stringify({ model: cfg[name].model, messages, temperature: 0.5, max_tokens: 700, stream: true }),
          },
        );
        if (!res.ok || !res.body) {
          console.warn(`[ai-stream] ${name} HTTP ${res.status}`);
          done();
          continue;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        for (;;) {
          const { done: finished, value } = await reader.read();
          if (finished) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const payload = trimmed.slice(5).trim();
            if (payload === '[DONE]') continue;
            try {
              const json = JSON.parse(payload) as { choices?: Array<{ delta?: { content?: string } }> };
              const piece = json.choices?.[0]?.delta?.content;
              if (piece) {
                acc += piece;
                onChunk(piece);
              }
            } catch {
              /* سطر غير مكتمل — نتجاهله */
            }
          }
        }
      }
      done();
      if (acc.trim()) return { provider: name, text: acc };
    } catch (e) {
      done();
      console.warn(`[ai-stream] ${name} فشل:`, (e as Error).message);
      if (acc.trim()) return { provider: name, text: acc };
    }
  }
  return { provider: null, text: '' };
}
