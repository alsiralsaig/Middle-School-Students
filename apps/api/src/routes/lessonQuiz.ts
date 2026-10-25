import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../lib/auth.js';
import { completeRaw } from '../lib/aiProviders.js';

/**
 * أسئلة الدرس — تُبنى من محتوى الدرس نفسه وتُحفظ في قاعدة البيانات.
 *
 * المشكلة القديمة: الأسئلة كانت تُركّب في المتصفح من قوالب ثابتة (نفس الأسئلة
 * لكل الدروس، ولا تخصّ الدرس فعلاً). الآن:
 *   ١) يُولّد النموذج أسئلة من (عنوان الدرس + الملخص + القواعد + أقسامه).
 *   ٢) تُحفظ في Exam + ExamQuestion مع lessonId، فلا يُعاد التوليد كل مرة
 *      (نفس الأسئلة تُعرض للجميع، وسريعة، وتعمل حتى لو تعطّل المزوّد).
 *   ٣) `renew` يولّد مجموعة جديدة عند طلب الطالب.
 *
 * الإجابات الصحيحة لا تُرسل للمتصفح: التصحيح على الخادم عبر
 * POST /api/exams/:id/submit الموجود أصلاً.
 */

export const lessonQuizRouter = Router();

const QUIZ_STATUS = 'lesson-quiz';

interface RawQuestion {
  question?: unknown;
  options?: unknown;
  answerIndex?: unknown;
  explanation?: unknown;
}

/** يقرأ JSON من رد النموذج حتى لو حاطّه داخل ``` */
function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : text;
  const start = body.search(/[[{]/);
  if (start < 0) return null;
  const candidate = body.slice(start);
  try {
    return JSON.parse(candidate);
  } catch {
    // نحاول أخذ أول كائن مغلق متوازن
    for (let end = candidate.length; end > 2; end--) {
      try {
        return JSON.parse(candidate.slice(0, end));
      } catch {
        /* جرّب أقصر */
      }
    }
    return null;
  }
}

function shuffleSeeded<T>(arr: T[], seed: number): T[] {
  const out = [...arr];
  let s = seed || 7;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** يحوّل رد النموذج إلى أسئلة صالحة فقط (٤ خيارات، فهرس صحيح داخل المدى) */
function normalize(raw: unknown): Array<{ question: string; options: string[]; correctIndex: number; explanation: string }> {
  const list = Array.isArray(raw)
    ? raw
    : (raw && typeof raw === 'object' && Array.isArray((raw as { questions?: unknown }).questions)
        ? (raw as { questions: unknown[] }).questions
        : []);
  const out: Array<{ question: string; options: string[]; correctIndex: number; explanation: string }> = [];
  const seen = new Set<string>();

  (list as RawQuestion[]).forEach((q) => {
    const question = String(q?.question ?? '').trim();
    const options = Array.isArray(q?.options)
      ? (q.options as unknown[]).map((o) => String(o ?? '').trim()).filter(Boolean)
      : [];
    const correctIndex = Number(q?.answerIndex);
    if (question.length < 8 || options.length < 3 || options.length > 5) return;
    if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length) return;
    const key = question.replace(/\s+/g, ' ').slice(0, 60);
    if (seen.has(key)) return;
    seen.add(key);
    out.push({
      question,
      options,
      correctIndex,
      explanation: String(q?.explanation ?? '').trim().slice(0, 500),
    });
  });
  return out;
}

function lessonContext(lesson: {
  title: string;
  summary: string;
  learningObjectives: string;
  keyRules: string;
  sections: string;
  faq: string;
  examTips: string;
}, subjectName: string, unitName: string): string {
  const parse = (s: string): unknown => {
    try {
      return JSON.parse(s || '[]');
    } catch {
      return [];
    }
  };
  const asText = (v: unknown): string =>
    typeof v === 'string' ? v : JSON.stringify(v);
  const lines: string[] = [];
  lines.push(`المادة: ${subjectName}`);
  if (unitName) lines.push(`الوحدة: ${unitName}`);
  lines.push(`الدرس: ${lesson.title}`);
  if (lesson.summary) lines.push(`الملخص: ${lesson.summary}`);
  const obj = parse(lesson.learningObjectives);
  if (Array.isArray(obj) && obj.length) lines.push(`الأهداف: ${obj.map(asText).join(' | ')}`);
  const rules = parse(lesson.keyRules);
  if (Array.isArray(rules) && rules.length) lines.push(`القواعد الذهبية: ${rules.map(asText).join(' | ')}`);
  const sections = parse(lesson.sections);
  if (Array.isArray(sections)) {
    sections.slice(0, 6).forEach((sec) => {
      const s = sec as { title?: string; content?: string; formulaOrRule?: string; example?: { question?: string; solution?: string } };
      const bits = [s?.title, s?.content, s?.formulaOrRule, s?.example?.question, s?.example?.solution]
        .filter(Boolean)
        .map((x) => String(x));
      if (bits.length) lines.push(`قسم: ${bits.join(' — ')}`);
    });
  }
  const faq = parse(lesson.faq);
  if (Array.isArray(faq) && faq.length) {
    lines.push(
      `أسئلة شائعة: ${faq
        .slice(0, 4)
        .map((f) => {
          const o = f as { question?: string; answer?: string };
          return `${o?.question ?? ''} ← ${o?.answer ?? ''}`;
        })
        .join(' | ')}`,
    );
  }
  const tips = parse(lesson.examTips);
  if (Array.isArray(tips) && tips.length) lines.push(`نقاط الامتحان: ${tips.map(asText).join(' | ')}`);
  // حدّ أعلى حتى لا تتضخّم التكلفة/الرد
  return lines.join('\n').slice(0, 4500);
}

const SYSTEM = `أنت معلم سوداني خبير في منهج مرحلة الأساس/المتوسط، تكتب أسئلة اختيار من متعدد لطلاب الصف الثالث المتوسط.
ترجع JSON فقط، بلا أي شرح خارجي، بالشكل:
{"questions":[{"question":"نص السؤال","options":["أ","ب","ج","د"],"answerIndex":0,"explanation":"سطر أو سطران يشرحان ليه الإجابة صحيحة"}]}

قواعد:
١) الأسئلة من محتوى الدرس المرفق فقط — لا تخترع موضوعاً خارج الدرس.
٢) ٤ خيارات لكل سؤال، خيار واحد صحيح فقط، والباقي أخطاء شائعة واقعية (مش خيارات سخيفة).
٣) نوّع المستويات: تعريف، تطبيق/حساب، استنتاج، وخطأ شائع.
٤) في الحساب اجعل الأرقام بسيطة والنتيجة خيار واحد صحيح مضبوط.
٥) عربية فصحى مبسطة، جمل قصيرة، بلا رموز ماركداون.
٦) لا تكرر نفس السؤال بصيغتين.`;

async function generateForLesson(lessonId: string): Promise<{ examId: string; provider: string | null } | { error: string }> {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { subject: true, unit: true },
  });
  if (!lesson) return { error: 'الدرس غير موجود' };

  const context = lessonContext(lesson, lesson.subject?.name || '', lesson.unit?.title || '');
  const res = await completeRaw(
    SYSTEM,
    `${context}\n\nاكتب ٥ أسئلة اختيار من متعدد على هذا الدرس بالضبط، بصيغة JSON المطلوبة.`,
    { json: true, maxTokens: 1800 },
  );
  if (!res.text) return { error: 'خدمة توليد الأسئلة غير متاحة الآن' };

  const parsed = normalize(extractJson(res.text));
  if (parsed.length < 3) return { error: 'تعذّر توليد أسئلة كافية لهذا الدرس' };

  const questions = parsed.slice(0, 6).map((q, i) => {
    // نخلط موضع الإجابة الصحيحة حتى لا تصير دائماً الأولى
    const order = shuffleSeeded(q.options.map((_, idx) => idx), lessonId.length + i * 13 + 5);
    const options = order.map((idx) => q.options[idx]);
    return {
      question: q.question,
      options,
      correctIndex: order.indexOf(q.correctIndex),
      explanation: q.explanation,
    };
  });

  const existing = await prisma.exam.findFirst({
    where: { status: QUIZ_STATUS, questions: { some: { lessonId } } },
    orderBy: { createdAt: 'desc' },
  });

  const exam = existing
    ? await prisma.exam.update({
        where: { id: existing.id },
        data: { title: `تدريب: ${lesson.title}` },
      })
    : await prisma.exam.create({
        data: {
          subjectId: lesson.subjectId,
          title: `تدريب: ${lesson.title}`,
          durationMinutes: 10,
          status: QUIZ_STATUS,
        },
      });

  if (existing) {
    await prisma.examQuestion.deleteMany({ where: { examId: exam.id } });
  }
  await prisma.examQuestion.createMany({
    data: questions.map((q) => ({
      examId: exam.id,
      lessonId,
      question: q.question,
      options: JSON.stringify(q.options),
      correctIndex: q.correctIndex,
      explanation: q.explanation || null,
    })),
  });

  return { examId: exam.id, provider: res.provider };
}

/** أسئلة الدرس (موجودة؟ رجّعها — وإلا ولّدها مرة واحدة واحفظها) */
lessonQuizRouter.post('/lessons/:id/quiz', requireAuth, async (req, res) => {
  const lessonId = req.params.id;
  const renew = req.body?.renew === true;
  try {
    const existing = renew
      ? null
      : await prisma.exam.findFirst({
          where: { status: QUIZ_STATUS, questions: { some: { lessonId } } },
          orderBy: { createdAt: 'desc' },
          include: { questions: { where: { lessonId }, orderBy: { id: 'asc' } } },
        });

    if (existing && existing.questions.length) {
      res.json({
        examId: existing.id,
        cached: true,
        questions: existing.questions.map((q) => ({
          id: q.id,
          question: q.question,
          options: JSON.parse(q.options),
        })),
      });
      return;
    }

    const made = await generateForLesson(lessonId);
    if ('error' in made) {
      res.status(503).json({ error: made.error });
      return;
    }
    const questions = await prisma.examQuestion.findMany({
      where: { examId: made.examId, lessonId },
      orderBy: { id: 'asc' },
    });
    res.json({
      examId: made.examId,
      cached: false,
      provider: made.provider,
      questions: questions.map((q) => ({
        id: q.id,
        question: q.question,
        options: JSON.parse(q.options),
      })),
    });
  } catch (e) {
    console.error('[lesson-quiz]', (e as Error).message);
    res.status(500).json({ error: 'تعذّر تحضير أسئلة الدرس' });
  }
});

/**
 * تحقّق من إجابة سؤال واحد — يعطي التلميح والتفسير فوراً بعد الاختيار
 * بلا كشف بقية الإجابات للمتصفح.
 */
lessonQuizRouter.post('/quiz/check', requireAuth, async (req, res) => {
  const examId = String(req.body?.examId || '');
  const questionId = String(req.body?.questionId || '');
  const chosenIndex = Number(req.body?.chosenIndex);
  if (!examId || !questionId || !Number.isInteger(chosenIndex)) {
    res.status(400).json({ error: 'بيانات ناقصة' });
    return;
  }
  try {
    const q = await prisma.examQuestion.findFirst({ where: { id: questionId, examId } });
    if (!q) {
      res.status(404).json({ error: 'السؤال غير موجود' });
      return;
    }
    res.json({
      correct: chosenIndex === q.correctIndex,
      correctIndex: q.correctIndex,
      explanation: q.explanation,
    });
  } catch (e) {
    console.error('[quiz/check]', (e as Error).message);
    res.status(500).json({ error: 'تعذّر التحقق من الإجابة' });
  }
});

/** حالة سريعة — كم درس عنده أسئلة فعلاً (بلا أسرار) */
lessonQuizRouter.get('/lessons-quiz/coverage', async (_req, res) => {
  try {
    const [lessons, withQuiz] = await Promise.all([
      prisma.lesson.count(),
      prisma.examQuestion.groupBy({ by: ['lessonId'], where: { lessonId: { not: null } } }).then((r) => r.length),
    ]);
    res.json({ lessons, withQuiz });
  } catch {
    res.status(500).json({ error: 'تعذّر قراءة الحالة' });
  }
});

