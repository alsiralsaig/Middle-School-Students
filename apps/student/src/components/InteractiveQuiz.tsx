import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  ArrowLeft,
  Lightbulb,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { Lesson } from '../types';
import { api } from '../utils/apiClient';

interface GeneratedQuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  conceptTag: string;
}

/** سؤال جاي من الخادم — الإجابة الصحيحة ما تنزل للمتصفح */
interface ServerQuestion {
  id: string;
  question: string;
  options: string[];
}

interface InteractiveQuizProps {
  lesson: Lesson;
  subjectName?: string;
  onQuizComplete?: (score: number, total: number) => void;
}

/**
 * تدريب الدرس.
 *
 * قبل: كانت الأسئلة تُركّب في المتصفح من قوالب، فكل الدروس تقريباً بتعطي نفس
 * الأسئلة ولا تخصّ الدرس فعلاً.
 * الآن: الأسئلة تُطلب من الخادم (مولّدة من محتوى الدرس نفسه: الملخص، القواعد،
 * الأقسام، الأمثلة) وتُحفظ، والتصحيح على الخادم مع تفسير لكل سؤال.
 * لو النت أو الخادم ما متاح، نرجع للأسئلة المحلية حتى لا يبقى التدريب فاضي.
 */
export const InteractiveQuiz: React.FC<InteractiveQuizProps> = ({
  lesson,
  subjectName,
  onQuizComplete,
}) => {
  /* ------------------------- ١) الأسئلة المحلية (احتياطي) ------------------------- */
  const localQuestions: GeneratedQuizQuestion[] = useMemo(() => {
    const list: GeneratedQuizQuestion[] = [];
    let qId = 1;

    const uniq = (arr: (string | null | undefined)[]) => {
      const seen = new Set<string>();
      const out: string[] = [];
      for (const raw of arr) {
        const v = (raw || '').trim();
        if (!v || seen.has(v)) continue;
        seen.add(v);
        out.push(v);
      }
      return out;
    };

    // خيارات خاطئة تُؤخذ من محتوى الدرس نفسه (قواعد/أهداف/أقسام أخرى)
    const distractors = (correct: string): string[] => {
      const pool = uniq([
        ...(lesson.keyRules || []),
        ...(lesson.learningObjectives || []),
        ...(lesson.sections || []).map((s) => s.title),
        ...(lesson.sections || []).map((s) => s.formulaOrRule || ''),
      ]).filter((t) => t && t !== correct && Math.abs(t.length - correct.length) < 220);
      return pool.slice(0, 3);
    };

    (lesson.learningObjectives || []).forEach((obj) => {
      const correct = (obj || '').trim();
      if (!correct) return;
      const others = distractors(correct);
      if (others.length < 2) return;
      list.push({
        id: qId++,
        question: `ما الهدف الأساسي من درس «${lesson.title}»؟`,
        options: [correct, ...others],
        correctIndex: 0,
        explanation: `وفق إرشادات الدرس: ${correct}`,
        conceptTag: 'مفاهيم أساسية',
      });
    });

    (lesson.keyRules || []).forEach((rule) => {
      const correct = (rule || '').trim();
      if (!correct) return;
      const others = distractors(correct);
      if (others.length < 2) return;
      list.push({
        id: qId++,
        question: `أي القواعد التالية هي المقررة في درس «${lesson.title}»؟`,
        options: [correct, ...others],
        correctIndex: 0,
        explanation: `القاعدة المعتمدة هي: ${correct}`,
        conceptTag: 'القواعد الذهبية',
      });
    });

    (lesson.sections || []).forEach((sec) => {
      const formula = (sec.formulaOrRule || '').trim();
      if (formula) {
        const others = distractors(formula);
        if (others.length >= 2) {
          list.push({
            id: qId++,
            question: `في قسم «${sec.title}»: أي العبارات التالية هي الصيغة أو القاعدة المعتمدة؟`,
            options: [formula, ...others],
            correctIndex: 0,
            explanation: `المعتمد في هذا القسم: ${formula}`,
            conceptTag: sec.title,
          });
        }
      }

      const solution = (sec.example?.solution || '').trim();
      if (solution) {
        const others = distractors(solution);
        if (others.length >= 2) {
          list.push({
            id: qId++,
            question: `المسألة التطبيقية: ${sec.example?.question || ''} — ما الحل النموذجي؟`,
            options: [solution, ...others],
            correctIndex: 0,
            explanation: `خطوات الحل المعتمدة: ${solution}`,
            conceptTag: 'أمثلة محلولة',
          });
        }
      }
    });

    if (list.length === 0) {
      const correct = (lesson.summary || '').trim() || `استيعاب محتوى درس «${lesson.title}»`;
      const others = distractors(correct);
      list.push({
        id: qId++,
        question: `ما هو المحور الأساسي لدرس «${lesson.title}»؟`,
        options: [correct, ...others],
        correctIndex: 0,
        explanation: correct,
        conceptTag: 'ملخص الدرس',
      });
    }

    return list.slice(0, 5).map((q) => {
      const newOptions = [...q.options];
      const correctText = newOptions[q.correctIndex];
      const targetIndex = (q.id * 3) % newOptions.length;
      const displaced = newOptions[targetIndex];
      newOptions[targetIndex] = correctText;
      newOptions[q.correctIndex] = displaced;
      return { ...q, options: newOptions, correctIndex: targetIndex };
    });
  }, [lesson]);

  /* ------------------------- ٢) الأسئلة من الخادم ------------------------- */
  const [serverQuestions, setServerQuestions] = useState<ServerQuestion[] | null>(null);
  const [examId, setExamId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [renewing, setRenewing] = useState(false);
  const [note, setNote] = useState('');

  const loadFromServer = useCallback(
    async (renew: boolean) => {
      if (renew) setRenewing(true);
      else setLoading(true);
      try {
        const res = await api.lessonQuiz(lesson.id, renew);
        if (res?.questions?.length) {
          setServerQuestions(res.questions);
          setExamId(res.examId);
          setNote(renew ? 'جهّزنا ليك مجموعة أسئلة جديدة على نفس الدرس.' : '');
          // نبدأ من سؤال جديد
          setCurrentIndex(0);
          setSelectedOption(null);
          setAnswerResult(null);
          setIsFinished(false);
          setScore(0);
        } else {
          setServerQuestions(null);
        }
      } catch {
        // بلا إنترنت أو الخادم مشغول ⟹ الأسئلة المحلية
        setServerQuestions(null);
      } finally {
        setLoading(false);
        setRenewing(false);
      }
    },
    [lesson.id],
  );

  useEffect(() => {
    void loadFromServer(false);
  }, [loadFromServer]);

  /** الأسئلة المعروضة فعلاً */
  const usingServer = !!serverQuestions?.length;
  const questions: Array<{ key: string; question: string; options: string[] }> = usingServer
    ? serverQuestions!.map((q) => ({ key: q.id, question: q.question, options: q.options }))
    : localQuestions.map((q) => ({ key: `L${q.id}`, question: q.question, options: q.options }));

  /* ------------------------- ٣) حالة الاختبار ------------------------- */
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answerResult, setAnswerResult] = useState<{ correctIndex: number; explanation: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const currentQ = questions[currentIndex];
  const localCorrectIndex = usingServer ? -1 : localQuestions[currentIndex]?.correctIndex ?? -1;

  const handleSelect = (idx: number) => {
    if (answerResult || checking) return;
    setSelectedOption(idx);
  };

  /** تأكيد الإجابة: على الخادم إن أمكن، وإلا محلياً */
  const handleSubmitAnswer = async () => {
    if (selectedOption === null || answerResult) return;
    const chosen = selectedOption;

    if (!usingServer) {
      const idx = localCorrectIndex;
      setAnswerResult({
        correctIndex: idx,
        explanation: localQuestions[currentIndex]?.explanation || '',
      });
      if (chosen === idx) setScore((s) => s + 1);
      return;
    }

    setChecking(true);
    try {
      const res = await api.checkQuizAnswer(examId, currentQ.key, chosen);
      setAnswerResult({
        correctIndex: res.correctIndex,
        explanation: res.explanation || 'راجع شرح الدرس لهذا الجزء.',
      });
      if (res.correct) setScore((s) => s + 1);
    } catch {
      // لو التصحيح على الخادم فشل: نكشف النتيجة من النسخة المحلية إن وُجدت
      setAnswerResult({ correctIndex: -1, explanation: 'تعذّر التصحيح الآن — تحقّق من الإنترنت.' });
    } finally {
      setChecking(false);
    }
  };

  const handleNext = () => {
    const isLast = currentIndex >= questions.length - 1;
    const nextScore = score;
    setSelectedOption(null);
    setAnswerResult(null);
    if (isLast) {
      setIsFinished(true);
      onQuizComplete?.(nextScore, questions.length);
    } else {
      setCurrentIndex((i) => i + 1);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setAnswerResult(null);
    setIsFinished(false);
    setScore(0);
  };

  const percentage = questions.length ? Math.round((score / questions.length) * 100) : 0;

  return (
    <div className="bg-white dark:bg-[#0D1F35] rounded-3xl border border-slate-200 dark:border-[#1C3A62] p-6 sm:p-8 text-right shadow-sm space-y-6">
      {/* Quiz Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-[#1E3A60]">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/10 dark:bg-amber-400/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold shrink-0 border border-amber-500/20">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                تدريب درس: {lesson.title}
              </h3>
              <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 px-2 py-0.5 rounded-full font-bold">
                {usingServer ? `${questions.length} أسئلة على الدرس` : 'أسئلة سريعة'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {usingServer
                ? 'أسئلة مبنية على شرح هذا الدرس — التصحيح فوري مع تفسير لكل إجابة'
                : 'أسئلة مستخلصة من قواعد وشروحات هذا الدرس'}
            </p>
          </div>
        </div>

        {!isFinished && (
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-[#142A46] px-3 py-1.5 rounded-xl self-start sm:self-auto">
            <span>السؤال</span>
            <span className="text-blue-600 dark:text-amber-400">{currentIndex + 1}</span>
            <span>من</span>
            <span>{questions.length}</span>
          </div>
        )}
      </div>

      {/* تحميل الأسئلة من الخادم */}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-10 text-xs font-bold text-slate-500 dark:text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          بنجهّز ليك أسئلة على هذا الدرس…
        </div>
      )}

      {/* Progress Bar */}
      {!loading && !isFinished && questions.length > 0 && (
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      )}

      {/* Active Question View */}
      {!loading && !isFinished && currentQ && (
        <div className="space-y-6">
          <div className="space-y-2">
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 block">
              {usingServer ? subjectName || 'من الدرس' : localQuestions[currentIndex]?.conceptTag}
            </span>
            <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed">
              {currentQ.question}
            </h4>
          </div>

          {/* Options Grid */}
          <div className="grid grid-cols-1 gap-3">
            {currentQ.options.map((option, idx) => {
              const isSelected = selectedOption === idx;
              const isCorrect = answerResult ? idx === answerResult.correctIndex : false;
              const showResult = !!answerResult;

              let optionStyle = 'bg-slate-50 dark:bg-[#0E2036] border-slate-200 dark:border-[#1C3A62] text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#142A46]';

              if (showResult) {
                if (isCorrect) {
                  optionStyle = 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-950 dark:text-emerald-100 font-bold ring-2 ring-emerald-500/30';
                } else if (isSelected) {
                  optionStyle = 'bg-red-50 dark:bg-red-950/40 border-red-500 text-red-950 dark:text-red-100 font-bold';
                }
              } else if (isSelected) {
                optionStyle = 'bg-blue-50 dark:bg-[#163358] border-blue-600 dark:border-amber-400 text-blue-950 dark:text-white font-bold ring-2 ring-blue-500/20';
              }

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelect(idx)}
                  disabled={showResult || checking}
                  className={`w-full p-4 rounded-2xl border text-right text-xs sm:text-sm font-medium transition-all cursor-pointer flex items-center justify-between gap-3 ${optionStyle}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center shrink-0">
                      {String.fromCharCode(1571 + idx)}
                    </span>
                    <span>{option}</span>
                  </div>

                  {showResult && (
                    <div>
                      {isCorrect ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                      ) : isSelected ? (
                        <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                      ) : null}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Explanation Box on submit */}
          {answerResult && (
            <div className="p-4 rounded-2xl bg-blue-50 dark:bg-[#122844] border border-blue-200 dark:border-[#1E3A60] space-y-2 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-amber-400">
                <Lightbulb className="w-4 h-4" />
                <span>{answerResult.correctIndex >= 0 && answerResult.correctIndex === selectedOption ? 'إجابة صحيحة' : 'التوضيح'}</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                {answerResult.explanation}
              </p>
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
            <span className="text-xs text-slate-400">
              {answerResult ? 'اقرأ التفسير قبل ما تكمل' : 'اختر الإجابة ثم اضغط «تأكيد الإجابة»'}
            </span>

            {!answerResult ? (
              <button
                type="button"
                onClick={() => void handleSubmitAnswer()}
                disabled={selectedOption === null || checking}
                className="px-6 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer disabled:cursor-not-allowed flex items-center gap-2"
              >
                {checking && <Loader2 className="w-4 h-4 animate-spin" />}
                تأكيد الإجابة
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer flex items-center gap-2"
              >
                <span>{currentIndex < questions.length - 1 ? 'السؤال التالي' : 'عرض النتيجة'}</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Quiz Completed Screen */}
      {!loading && isFinished && (
        <div className="text-center py-6 space-y-6 animate-in zoom-in-95 duration-200">
          <div className="w-20 h-20 rounded-full bg-amber-400/20 text-amber-500 border border-amber-400/40 flex items-center justify-center text-4xl mx-auto shadow-lg">
            {percentage >= 80 ? '🏆' : percentage >= 50 ? '🌟' : '📚'}
          </div>

          <div className="space-y-2">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {percentage >= 80
                ? 'إتقان تام للدرس! أحسنت يا بطل'
                : percentage >= 50
                ? 'مستوى جيد، واستيعاب طيب للمفاهيم'
                : 'محاولة طيبة، يُنصح بإعادة قراءة الدرس والمحاولة'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">
              أجبت بشكل صحيح على <strong className="text-blue-600 dark:text-amber-400">{score}</strong> من أصل <strong className="text-slate-900 dark:text-white">{questions.length}</strong> أسئلة ({percentage}%).
            </p>
          </div>

          {note && (
            <p className="text-xs text-emerald-700 dark:text-emerald-300 font-bold">{note}</p>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleRestart}
              className="px-6 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold flex items-center gap-2 shadow-md cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>أعد نفس الأسئلة</span>
            </button>
            <button
              type="button"
              onClick={() => void loadFromServer(true)}
              disabled={renewing}
              className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white text-xs font-bold flex items-center gap-2 shadow-md cursor-pointer"
            >
              {renewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              <span>أسئلة جديدة على نفس الدرس</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InteractiveQuiz;
