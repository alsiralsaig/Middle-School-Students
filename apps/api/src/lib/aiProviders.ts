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
      // الموديل الافتراضي متاح في الحسابات المجانية الحالية
      model: (process.env.GROQ_MODEL || 'openai/gpt-oss-120b').trim(),
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

export const SYSTEM_PROMPT = `أنت «المساعد السوداني الذكي» لطلاب الصف الثالث المتوسط (الشهادة المتوسطة) في السودان.

أسلوبك:
- عامية سودانية بسيطة وودّية (يا بطل، خلاص، دي، بقول ليك، شديد، تمام؟)، والمصطلحات العلمية والقواعد بالعربية الفصحى المبسطة.
- ردود قصيرة تناسب شاشة الهاتف: من ٣ إلى ٨ أسطر، ونقاط قصيرة عند الحاجة.
- ابدأ بالإجابة مباشرة، بلا مقدمات طويلة وبلا اعتذار.

قواعد صارمة:
١) ممنوع استخدام رموز الماركداون: لا ** ولا ## ولا شرطة (-) في بداية السطر. اكتب نصاً عادياً، والنقاط بشرطة «•».
٢) اكتب المعادلات بحروف عربية أو لاتينية عادية: مساحة المثلث = (القاعدة × الارتفاع) ÷ ٢. ممنوع $ و\\frac و\\times.
٣) «السياق من المنهج» أدقّ مصادرك. اعتمد عليه فقط إذا كان فعلاً يشرح نفس موضوع السؤال، وساعتها اذكر اسم الدرس مرة واحدة في آخر الرد بصيغة (من درس: ...). إذا كان السياق لا يخص السؤال مباشرة فتجاهله ولا تذكر أي اسم درس — الإحالة إلى درس غير مطابق خطأ.
٤) إذا لم يغطِّ السياق السؤال فلا تعتذر ولا تقل «غير موجود في المنهج»: أجب من معرفتك بمنهج السودان للصف الثالث المتوسط بثقة ودقّة. وما لم تكن متأكداً منه قل إنك غير متأكد بدل أن تخترع.
٥) في الرياضيات والعلوم: اذكر القانون أولاً، ثم عوّض بالأرقام، ثم النتيجة، خطوة بخطوة.
٦) لا تخترع أرقام صفحات ولا مراجع ولا أسماء مؤلفين.
٧) رد بلغة السؤال: عربي أو إنجليزي.`;

export interface CurriculumHit {
  subjectName: string;
  lessonTitle: string;
  lessonId: string;
  summary: string;
  keyRules: string[];
  sections: Array<{ title: string; content: string; formulaOrRule?: string }>;
  faq: Array<{ question: string; answer: string }>;
}

/* ======================= البحث في المنهج ======================= */

/** كلمات لا تفيد البحث: أسئلة وأوامر صفية شائعة */
const STOP_WORDS = new Set(
  'اشرح شرح لخص ماذا ماهي ماهو هي هو كيف ايه شنو ليه الفرق بين حل مساله مسائل امثله مع عن في من علي الي اللي التي الذي اهم اسباب اذكر عرف علل قارن وضح اكتب اعرب اعراب نموذج سوال اسئله مراجعه درس الوحده الصف الثالث المتوسط منهج مقرره مقرر بس كده ولا هل ثم او ان هذا هذه ذلك كل بعض غير عند لدي لكن حيث كما جدا اكثر اقل ايضا دايما حلل بين لي'.split(' '),
);

/** توحيد الحروف: إزالة التشكيل وتوحيد الألف والياء والتاء المربوطة */
function normalizeArabic(input: string): string {
  return input
    .replace(/[\u064B-\u0652\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي');
}

/**
 * كلمات السؤال المفيدة بعد التنظيف.
 *
 * • «تجذيع خفيف» للعربية: إزالة «ال» و«و» من البداية ولاحقات الجمع والضمير
 *   (ه/ة/ين/ات/ون) من النهاية. بدونه «وانواعه» لا تطابق «أنواع» فيضيع الدرس.
 * • كل كلمة تُصنَّف «دقيقة» (٥ أحرف أو أكثر) أو عامة. لا يُعتبر الدرس مطابقاً
 *   إلا بمطابقة كلمة دقيقة، وإلا فكلمة مثل «نظرية» تُرجع درساً عن الزوايا
 *   المحيطية لسؤال عن فيثاغورس.
 */
function keywords(question: string): Array<{ token: string; weight: number; specific: boolean }> {
  const seen = new Set<string>();
  const out: Array<{ token: string; weight: number; specific: boolean }> = [];
  for (const raw of normalizeArabic(question).split(/\s+/)) {
    let w = raw.replace(/[^\w\u0621-\u064A]/g, '');
    w = w
      .replace(/^وا(?=.{3,})/, '')
      .replace(/^با(?=.{3,})/, '')
      .replace(/^ال/, '')
      .replace(/^و(?=.{3,})/, '')
      .replace(/(ه|ة|ين|ات|ون|كم|هم)$/, '')
      .replace(/(ه|ة)$/, '');
    if (w.length < 3 || STOP_WORDS.has(w) || STOP_WORDS.has(raw) || seen.has(w)) continue;
    seen.add(w);
    out.push({ token: w, weight: Math.min(w.length, 10) / 4, specific: w.length >= 4 });
  }
  return out.slice(0, 10);
}

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * بحث نصي داخل المنهج المخزَّن في قاعدة البيانات (بدون خدمة بحث خارجية).
 *
 * لماذا الترتيب في الكود وليس في SQL: البحث الأول كان يرتّب النتائج حسب رقم
 * الدرس، فتظهر دروس أولى الوحدات لمجرد تطابق كلمة عامة — وهذا سبب إجابة
 * «نظرية فيثاغورس» بدرس «الزوايا المحيطية». هنا نجلب مرشّحين ثم نُقيّم كل درس:
 * تطابق العنوان أثقل من الملخص، والملخص أثقل من بقية النص، والكلمة الطويلة
 * (الاسم العلمي) أثقل من الكلمة القصيرة.
 */
type LessonRow = {
  id: string;
  title: string;
  lessonNumber: number | null;
  summary: string | null;
  keyRules: string | null;
  sections: string | null;
  faq: string | null;
  learningObjectives: string | null;
  examTips: string | null;
  subject: { name: string } | null;
};

/**
 * تحميل الدروس مع تخزين مؤقت قصير.
 *
 * ليه لا نبحث بـSQL مباشرة: الحروف العربية لها صور متعددة (أ/ا، ة/ه، ى/ي)،
 * فكلمة «الأيونية» لا تطابق «الايونيه»، وكان البحث يرجع صفراً دائماً. الحل:
 * نجلب دروس المادة مرة واحدة (٣٥ درساً كحد أقصى) ونوحّد الحروف في الكود ثم
 * نُقيّم — أدقّ وأسرع، والتخزين المؤقت ٦٠ ثانية يُبقي التحديثات فورية.
 */
const lessonCache = new Map<string, { at: number; rows: LessonRow[] }>();
const LESSON_CACHE_MS = 60_000;

async function loadLessons(subjectName?: string): Promise<LessonRow[]> {
  const key = (subjectName || '*').trim();
  const cached = lessonCache.get(key);
  if (cached && Date.now() - cached.at < LESSON_CACHE_MS) return cached.rows;

  try {
    const rows = (await prisma.lesson.findMany({
      where: subjectName
        ? { subject: { name: { contains: subjectName, mode: 'insensitive' as const } } }
        : {},
      take: 300,
      orderBy: { lessonNumber: 'asc' },
      select: {
        id: true,
        title: true,
        lessonNumber: true,
        summary: true,
        keyRules: true,
        sections: true,
        faq: true,
        learningObjectives: true,
        examTips: true,
        subject: { select: { name: true } },
      },
    })) as LessonRow[];
    lessonCache.set(key, { at: Date.now(), rows });
    return rows;
  } catch (e) {
    console.warn('[ai] تحميل دروس المنهج فشل:', (e as Error).message);
    return [];
  }
}

export async function findCurriculumContext(question: string, subjectName?: string, limit = 3): Promise<CurriculumHit[]> {
  const words = keywords(question);
  if (!words.length) return [];

  const lessons = await loadLessons(subjectName);
  if (!lessons.length) return [];

  const scored = lessons
    .map((lesson) => {
      const title = normalizeArabic(lesson.title || '');
      const summary = normalizeArabic(lesson.summary || '');
      const body = normalizeArabic(
        `${lesson.keyRules || ''} ${lesson.sections || ''} ${lesson.faq || ''} ${lesson.learningObjectives || ''} ${lesson.examTips || ''}`,
      );
      let score = 0;
      let specificScore = 0;
      for (const { token, weight, specific } of words) {
        let hit = 0;
        if (title.includes(token)) hit = 6 * weight;
        else if (summary.includes(token)) hit = 3 * weight;
        else if (body.includes(token)) hit = 1.5 * weight;
        if (hit) {
          score += hit;
          if (specific) specificScore += hit;
        }
      }
      return { lesson, score, specificScore };
    })
    // لا مطابقة على كلمات عامة وحدها — تمنع إحالة درس لا علاقة له بالسؤال
    .filter((x) => x.score > 0 && x.specificScore > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map(({ lesson }) => ({
    subjectName: lesson.subject?.name || subjectName || 'المقرر',
    lessonTitle: lesson.title,
    lessonId: lesson.id,
    summary: lesson.summary || '',
    keyRules: parseJson<string[]>(lesson.keyRules, []).slice(0, 8),
    sections: parseJson<Array<{ title: string; content: string; formulaOrRule?: string }>>(lesson.sections, [])
      .slice(0, 3)
      .map((sec) => ({ title: sec.title, content: (sec.content || '').slice(0, 400), formulaOrRule: sec.formulaOrRule })),
    faq: parseJson<Array<{ question: string; answer: string }>>(lesson.faq, []).slice(0, 3),
  }));
}

/**
 * فهرس عناوين دروس المادة.
 *
 * ليه: أغلب أسئلة الطلاب مواضيع داخل المنهج لكن مش في السياق المخزَّن بالتفصيل.
 * الفهرس يعرّف النموذج بحدود المنهج فيذكر الدرس الصحيح ولا يدّعي أن الموضوع
 * «غير موجود في الكتاب».
 */
export async function findLessonIndex(subjectName?: string, max = 60): Promise<string[]> {
  if (!subjectName) return [];
  const rows = await loadLessons(subjectName);
  return rows.slice(0, max).map((r) => r.title);
}

export function contextToText(hits: CurriculumHit[], indexTitles: string[] = []): string {
  const parts = hits.map((h, i) => {
    const rules = h.keyRules.length ? `\n   القواعد: ${h.keyRules.join(' | ')}` : '';
    const sections = h.sections.length
      ? `\n   المحاور: ${h.sections
          .map((sec) => `${sec.title}: ${sec.content}${sec.formulaOrRule ? ` [صيغة: ${sec.formulaOrRule}]` : ''}`)
          .join(' | ')}`
      : '';
    const faq = h.faq.length ? `\n   أسئلة: ${h.faq.map((f) => `${f.question} ← ${f.answer}`).join(' | ')}` : '';
    return `${i + 1}) مادة ${h.subjectName} — درس «${h.lessonTitle}»\n   الملخص: ${h.summary}${rules}${sections}${faq}`;
  });

  if (indexTitles.length) {
    parts.push(`فهرس دروس المادة (للاستشهاد فقط، لا تنسخه في الرد):\n${indexTitles.join(' · ')}`);
  }
  return parts.join('\n\n');
}

/* ======================= تنظيف مخرجات النموذج ======================= */

/**
 * إزالة رموز الماركداون من رد النموذج.
 *
 * ليه في الخادم لا في التطبيق: الرد يصل كلمة كلمة، وتنظيفه في المتصفح يعني
 * ظهور «**» للطالب لحظة وصولها ثم اختفاءها. هنا نحتفظ بذيل صغير (نجمتان أو
 * مسافة) حتى نتأكد أنها ليست بداية علامة، ثم نرسل النص نظيفاً.
 */
export function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*/g, '')
    .replace(/__/g, '')
    .replace(/`/g, '')
    .replace(/^[ \t]*[-*+]\s+/gm, '• ')
    .replace(/^[ \t]+[-–]\s+/gm, '• ')
    .replace(/\$\$?/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/[ \t]+$/gm, '');
}

/** منظّف تدريجي للرد المتدفّق — يعيد دالة تُنادى بكل قطعة */
export function createStreamSanitizer() {
  let held = '';
  const clean = (text: string) => stripMarkdown(text);
  return (chunk: string, final = false): string => {
    held += chunk;
    if (final) {
      const out = clean(held);
      held = '';
      return out;
    }
    // نحتفظ بالذيل الذي قد يكون أول علامة أو مسافة نهاية سطر
    const hold = /[*_`$ \t]+$/.exec(held)?.[0].length ?? 0;
    if (!hold) {
      const out = clean(held);
      held = '';
      return out;
    }
    const ready = held.slice(0, held.length - hold);
    held = held.slice(held.length - hold);
    return clean(ready);
  };
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
          // موديلات gpt-oss تفكّر قبل الرد — نقلّل التفكير للسرعة ونمنع ظهوره
          ...(name === 'groq' && cfg.model.includes('gpt-oss')
            ? { reasoning_effort: 'low', include_reasoning: false }
            : {}),
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
    // تنظيف الماركداون قبل إرجاع الرد (الردود غير المتدفّقة تشمل أسئلة الدرس)
    if (text) return { text: stripMarkdown(text), provider: name };
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
  // الرد يصل للطالب كلمة كلمة، فرموز الماركداون لازم تُزال قبل الإرسال
  const sanitize = createStreamSanitizer();
  const emit = (piece: string) => {
    const out = sanitize(piece);
    if (out) onChunk(out);
  };

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
            emit(piece);
          }
        }
      } else {
        const res = await fetch(
          name === 'groq' ? 'https://api.groq.com/openai/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions',
          {
            method: 'POST',
            signal,
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg[name].apiKey}` },
            body: JSON.stringify({
              model: cfg[name].model,
              messages,
              temperature: 0.5,
              max_tokens: 700,
              stream: true,
              ...(name === 'groq' && cfg[name].model.includes('gpt-oss')
                ? { reasoning_effort: 'low', include_reasoning: false }
                : {}),
            }),
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
                emit(piece);
              }
            } catch {
              /* سطر غير مكتمل — نتجاهله */
            }
          }
        }
      }
      done();
      if (acc.trim()) {
        // نُخرج ما تبقّى محتجزاً (نجمة أو مسافة في الآخر)
        const tail = sanitize('', true);
        if (tail) onChunk(tail);
        return { provider: name, text: stripMarkdown(acc) };
      }
    } catch (e) {
      done();
      console.warn(`[ai-stream] ${name} فشل:`, (e as Error).message);
      if (acc.trim()) return { provider: name, text: acc };
    }
  }
  return { provider: null, text: '' };
}
