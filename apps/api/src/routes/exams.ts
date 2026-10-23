import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { currentUser, requireAuth } from '../lib/auth.js';
import { mediaAssetDto } from './media.js';

export const examsRouter = Router();

/* ============================ قائمة الاختبارات ============================ */

examsRouter.get('/exams', async (_req, res) => {
  const exams = await prisma.exam.findMany({
    include: { subject: true, _count: { select: { questions: true } } },
    orderBy: { createdAt: 'desc' },
  });
  const files=exams.length?await prisma.mediaAsset.findMany({where:{ownerType:'exam',ownerId:{in:exams.map(e=>e.id)},access:'public'},orderBy:{createdAt:'asc'}}):[];
  const byExam=new Map<string,unknown[]>();files.forEach(a=>byExam.set(a.ownerId,[...(byExam.get(a.ownerId)||[]),mediaAssetDto(a)]));
  res.json({
    exams: exams.map((e) => ({
      attachments:byExam.get(e.id)||[],
      id: e.id,
      title: e.title,
      subjectId: e.subjectId,
      subjectName: e.subject.name,
      durationMinutes: e.durationMinutes,
      questionsCount: e._count.questions,
      status: e.status,
    })),
  });
});

/* ============================ أسئلة اختبار (بدون الحل) ============================ */

examsRouter.get('/exams/:id/questions', async (req, res) => {
  const exam = await prisma.exam.findUnique({
    where: { id: req.params.id },
    include: { questions: true },
  });
  if (!exam) {
    res.status(404).json({ error: 'الاختبار غير موجود' });
    return;
  }
  const attachments=await prisma.mediaAsset.findMany({where:{ownerType:'exam',ownerId:exam.id,access:'public'},orderBy:{createdAt:'asc'}});
  res.json({
    exam: {
      id: exam.id,
      title: exam.title,
      attachments:attachments.map(mediaAssetDto),
      durationMinutes: exam.durationMinutes,
      status: exam.status,
      questions: exam.questions.map((q) => ({
        id: q.id,
        question: q.question,
        options: JSON.parse(q.options),
      })),
    },
  });
});

/* ============================ تسليم الإجابات ============================ */

examsRouter.post('/exams/:id/submit', requireAuth, async (req, res) => {
  const uid = currentUser(req).uid;
  const answers = Array.isArray(req.body?.answers) ? req.body.answers : [];

  const questions = await prisma.examQuestion.findMany({ where: { examId: req.params.id } });
  if (!questions.length) {
    res.status(404).json({ error: 'الاختبار غير موجود' });
    return;
  }

  let score = 0;
  const graded = questions.map((q) => {
    const given = answers.find((a: { questionId: string; chosenIndex: number }) => a?.questionId === q.id);
    const chosenIndex = Number(given?.chosenIndex ?? -1);
    const correct = chosenIndex === q.correctIndex;
    if (correct) score++;
    return { questionId: q.id, chosenIndex, correct, explanation: q.explanation };
  });

  const attempt = await prisma.examAttempt.create({
    data: {
      examId: req.params.id,
      userId: uid,
      score,
      total: questions.length,
      finishedAt: new Date(),
      answers: {
        create: graded.map((g) => ({
          questionId: g.questionId,
          chosenIndex: g.chosenIndex,
          correct: g.correct,
        })),
      },
    },
  });

  res.json({
    result: {
      attemptId: attempt.id,
      score,
      total: questions.length,
      percent: Math.round((score / questions.length) * 100),
      graded,
    },
  });
});

/* ============================ محاولاتي ============================ */

examsRouter.get('/attempts', requireAuth, async (req, res) => {
  const uid = currentUser(req).uid;
  const attempts = await prisma.examAttempt.findMany({
    where: { userId: uid },
    include: { exam: { include: { subject: true } } },
    orderBy: { startedAt: 'desc' },
    take: 50,
  });
  res.json({
    attempts: attempts.map((a) => ({
      id: a.id,
      examTitle: a.exam.title,
      subjectName: a.exam.subject.name,
      score: a.score,
      total: a.total,
      percent: a.total ? Math.round((a.score / a.total) * 100) : 0,
      finishedAt: a.finishedAt,
    })),
  });
});
