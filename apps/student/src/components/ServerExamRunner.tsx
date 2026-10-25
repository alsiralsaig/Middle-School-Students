import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, XCircle, ChevronLeft, RotateCcw, Loader2, Award, AlertCircle } from 'lucide-react';
import { api } from '../utils/apiClient';
import { QuestionText } from './QuestionText';

/**
 * لاعب اختبارات بنك الأسئلة.
 *
 * ليه موجود: بنك الأسئلة في قاعدة البيانات فيه ٤٨ اختباراً و٢٣٢ سؤالاً، لكن
 * شاشة الطالب كانت تعرض الاختبارات اللي عندها **مرفقات PDF** فقط — والمرفقات
 * صفر، فكانت الشاشة تظهر فاضية تماماً رغم وجود الأسئلة. المكوّن ده بيقرأ
 * الأسئلة من الخادم ويصححها ويعرض التفسير.
 *
 * ملاحظة أمنية: الخادم لا يرسل الإجابات الصحيحة قبل التسليم (`/exams/:id/questions`)،
 * فالتصحيح بيحصل على الخادم في `/exams/:id/submit`.
 */

interface ServerExamRunnerProps {
  examId: string;
  examTitle: string;
  subjectName?: string;
  onExit: () => void;
}

interface Question {
  id: string;
  question: string;
  options: string[];
}

type Graded = { questionId: string; chosenIndex: number; correct: boolean; explanation: string | null };

export const ServerExamRunner: React.FC<ServerExamRunnerProps> = ({
  examId,
  examTitle,
  subjectName,
  onExit,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; total: number; percent: number; graded: Graded[] } | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    api
      .examQuestions(examId)
      .then(({ exam }) => {
        if (!alive) return;
        setQuestions(exam.questions || []);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : 'تعذّر تحميل الأسئلة');
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [examId]);

  /** التفسير لكل سؤال بعد التصحيح — يُعرض تحت السؤال مباشرة. */
  const gradedById = useMemo(() => {
    const map = new Map<string, Graded>();
    result?.graded.forEach((g) => map.set(g.questionId, g));
    return map;
  }, [result]);

  const answeredCount = Object.keys(answers).length;

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const payload = questions
        .filter((q) => answers[q.id] !== undefined)
        .map((q) => ({ questionId: q.id, chosenIndex: answers[q.id] }));
      const { result: gradedResult } = await api.submitExam(examId, payload);
      setResult(gradedResult);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر تصحيح الاختبار');
    } finally {
      setSubmitting(false);
    }
  };

  const restart = () => {
    setAnswers({});
    setResult(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 p-16 text-sm text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        جاري تحميل الأسئلة…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-right space-y-3">
        <div className="flex items-center gap-2 text-rose-800 dark:text-rose-200 font-bold text-sm">
          <AlertCircle className="w-4 h-4" />
          ما قدرنا نفتح الاختبار
        </div>
        <p className="text-xs text-rose-700 dark:text-rose-300">{error}</p>
        <button onClick={onExit} className="px-4 py-2 rounded-xl bg-white dark:bg-[#0D1F35] border border-rose-200 dark:border-rose-800 text-xs font-bold">
          رجوع لقائمة الاختبارات
        </button>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="p-6 rounded-2xl bg-slate-50 dark:bg-[#122844] border border-slate-200 dark:border-[#1E3A60] text-center space-y-3">
        <p className="text-sm font-bold text-slate-800 dark:text-white">هذا الاختبار لسه بلا أسئلة</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">جرّب اختباراً آخر، أو راجع دروس المادة ثم ارجع.</p>
        <button onClick={onExit} className="px-4 py-2 rounded-xl bg-blue-900 text-white text-xs font-bold">
          رجوع للاختبارات
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 text-right">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#0D1F35] border border-slate-200 dark:border-[#1C3A62] rounded-2xl p-4">
        <button
          onClick={onExit}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
        >
          <ChevronLeft className="w-4 h-4" />
          كل الاختبارات
        </button>
        <div className="text-center">
          <h3 className="text-sm font-black text-slate-900 dark:text-white">{examTitle}</h3>
          {subjectName && <p className="text-[11px] text-slate-500 dark:text-slate-400">{subjectName}</p>}
        </div>
        <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
          أجبت {answeredCount} من {questions.length}
        </div>
      </div>

      {result && (
        <div className="rounded-2xl bg-gradient-to-l from-blue-900 to-indigo-800 text-white p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-blue-100">نتيجتك</p>
            <p className="text-3xl font-black font-mono">
              {result.score} / {result.total}
            </p>
          </div>
          <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
            <Award className="w-5 h-5" />
            {result.percent}%
          </div>
          <button onClick={restart} className="px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-bold flex items-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5" />
            إعادة
          </button>
        </div>
      )}

      <ol className="space-y-4">
        {questions.map((q, idx) => {
          const graded = gradedById.get(q.id);
          const chosen = answers[q.id];
          return (
            <li
              key={q.id}
              className="bg-white dark:bg-[#0D1F35] border border-slate-200 dark:border-[#1C3A62] rounded-2xl p-5 space-y-3"
            >
              <div className="flex items-start gap-2">
                <span className="shrink-0 w-6 h-6 rounded-lg bg-slate-100 dark:bg-[#16304F] text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center">
                  {idx + 1}
                </span>
                <QuestionText text={q.question} className="flex-1 min-w-0" />
              </div>

              <div className="space-y-2">
                {q.options.map((opt, optIdx) => {
                  const isChosen = chosen === optIdx;
                  const isCorrect = graded ? optIdx === graded.chosenIndex && graded.correct : false;
                  const isWrong = graded && isChosen && !graded.correct;
                  return (
                    <button
                      key={optIdx}
                      disabled={!!graded}
                      onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: optIdx }))}
                      className={`w-full text-right px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-colors ${
                        isCorrect
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200'
                          : isWrong
                          ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200'
                          : isChosen
                          ? 'bg-blue-50 dark:bg-[#16304F] border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-100'
                          : 'bg-slate-50 dark:bg-[#122844] border-slate-200 dark:border-[#1E3A60] text-slate-700 dark:text-slate-200'
                      } ${graded ? 'cursor-default' : 'hover:border-blue-300'}`}
                    >
                      <span className="inline-flex items-center gap-2">
                        {isCorrect && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {isWrong && <XCircle className="w-3.5 h-3.5" />}
                        {opt}
                      </span>
                    </button>
                  );
                })}
              </div>

              {graded && graded.explanation && (
                <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-[#122844] border border-slate-100 dark:border-[#1E3A60] rounded-xl p-3">
                  <span className="font-bold">التفسير: </span>
                  {graded.explanation}
                </p>
              )}
            </li>
          );
        })}
      </ol>

      {!result && (
        <button
          onClick={submit}
          disabled={submitting || answeredCount === 0}
          className="w-full py-3 rounded-2xl bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white text-sm font-black flex items-center justify-center gap-2"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {submitting ? 'جاري التصحيح…' : `صحّح الاختبار (${answeredCount}/${questions.length})`}
        </button>
      )}
    </div>
  );
};
