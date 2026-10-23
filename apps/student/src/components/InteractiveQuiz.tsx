import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  HelpCircle, 
  Sparkles, 
  Award, 
  ArrowLeft, 
  Check, 
  BookOpen, 
  AlertCircle,
  Lightbulb
} from 'lucide-react';
import { Lesson } from '../types';

interface GeneratedQuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  conceptTag: string;
}

interface InteractiveQuizProps {
  lesson: Lesson;
  subjectName?: string;
  onQuizComplete?: (score: number, total: number) => void;
}

export const InteractiveQuiz: React.FC<InteractiveQuizProps> = ({
  lesson,
  subjectName,
  onQuizComplete,
}) => {
  // Dynamically generate instant multiple-choice questions from the lesson data
  const questions: GeneratedQuizQuestion[] = useMemo(() => {
    /**
     * ⚠️ إصلاح مهم: كان مولّد الأسئلة يضع خيارات **رياضية جاهزة**
     * («س + ص = ج²» …) في كل درس، فتظهر مسألة تاريخ أو لغة عربية بخيارات
     * رياضية لا معنى لها. الآن الخيارات الخاطئة تُؤخذ من محتوى الدرس نفسه
     * (قواعد أخرى، حلول أخرى، أهداف أخرى)، وإن لم يتوفر محتوى كافٍ
     * يُعرض السؤال بخيارات أقل بدل تلفيق خيارات غريبة.
     */
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

    /** كل محتوى الدرس الصالح لأن يكون خياراً — من نفس المادة والموضوع */
    const pool = uniq([
      ...(lesson.keyRules || []),
      ...(lesson.sections || []).map((s) => s.formulaOrRule),
      ...(lesson.sections || []).map((s) => s.example?.solution),
      ...(lesson.learningObjectives || []),
    ]);

    const distractors = (correct: string, n = 3) => pool.filter((x) => x !== correct).slice(0, n);

    // 1) أسئلة من الأسئلة الشائعة — الإجابة الصحيحة حقيقية والخيارات من الدرس
    (lesson.faq || []).forEach((faqItem) => {
      const correct = (faqItem.answer || '').trim();
      if (!correct) return;
      list.push({
        id: qId++,
        question: faqItem.question,
        options: [correct, ...distractors(correct)],
        correctIndex: 0,
        explanation: `وفق إرشادات الدرس: ${correct}`,
        conceptTag: 'مفاهيم أساسية',
      });
    });

    // 2) سؤال لكل قاعدة ذهبية — بلا خيارات ملفّقة
    (lesson.keyRules || []).forEach((rule) => {
      const correct = (rule || '').trim();
      if (!correct) return;
      const others = distractors(correct);
      if (others.length < 2) return; // لا نلفّق خيارات؛ نتخطى السؤال
      list.push({
        id: qId++,
        question: `أي القواعد التالية هي المقررة في درس «${lesson.title}»؟`,
        options: [correct, ...others],
        correctIndex: 0,
        explanation: `القاعدة المعتمدة هي: ${correct}`,
        conceptTag: 'القواعد الذهبية',
      });
    });

    // 3) أسئلة من الصيغ والأمثلة داخل أقسام الدرس
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

    // 4) سؤال احتياطي واحد إن لم يتكوّن أي سؤال من محتوى الدرس
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

    // خلط الخيارات — يعمل مع أي عدد خيارات (كان يفترض 4 دائماً)
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

  // Quiz state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const currentQ = questions[currentIndex];

  const handleSelect = (idx: number) => {
    if (isAnswerSubmitted) return;
    setSelectedOption(idx);
  };

  const handleSubmitAnswer = () => {
    if (selectedOption === null || isAnswerSubmitted) return;
    setIsAnswerSubmitted(true);
    if (selectedOption === currentQ.correctIndex) {
      setScore((s) => s + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setSelectedOption(null);
      setIsAnswerSubmitted(false);
    } else {
      setIsFinished(true);
      if (onQuizComplete) {
        onQuizComplete(score + (selectedOption === currentQ.correctIndex ? 1 : 0), questions.length);
      }
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswerSubmitted(false);
    setScore(0);
    setIsFinished(false);
  };

  const percentage = Math.round((score / questions.length) * 100);

  return (
    <div className="bg-white dark:bg-[#0D1F35] rounded-3xl border border-slate-200 dark:border-[#1C3A62] p-6 sm:p-8 text-right shadow-sm space-y-6">
      
      {/* Quiz Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-[#1E3A60]">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/10 dark:bg-amber-400/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold shrink-0 border border-amber-500/20">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                الاختبار الفوري لدرس: {lesson.title}
              </h3>
              <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 px-2 py-0.5 rounded-full font-bold">
                توليد فوري ⚡
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              أسئلة مقننة مستخلصة مباشرة من قواعد وشروحات وأمثلة هذا الدرس
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

      {/* Progress Bar */}
      {!isFinished && (
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      )}

      {/* Active Question View */}
      {!isFinished && currentQ && (
        <div className="space-y-6">
          <div className="space-y-2">
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 block">
              {currentQ.conceptTag}
            </span>
            <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed">
              {currentQ.question}
            </h4>
          </div>

          {/* Options Grid */}
          <div className="grid grid-cols-1 gap-3">
            {currentQ.options.map((option, idx) => {
              const isSelected = selectedOption === idx;
              const isCorrect = idx === currentQ.correctIndex;
              const showResult = isAnswerSubmitted;

              let optionStyle = 'bg-slate-50 dark:bg-[#0E2036] border-slate-200 dark:border-[#1C3A62] text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#142A46]';

              if (showResult) {
                if (isCorrect) {
                  optionStyle = 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-950 dark:text-emerald-100 font-bold ring-2 ring-emerald-500/30';
                } else if (isSelected && !isCorrect) {
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
                  disabled={isAnswerSubmitted}
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
          {isAnswerSubmitted && (
            <div className="p-4 rounded-2xl bg-blue-50 dark:bg-[#122844] border border-blue-200 dark:border-[#1E3A60] space-y-2 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-amber-400">
                <Lightbulb className="w-4 h-4" />
                <span>التعليق التربوي والتوضيح:</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                {currentQ.explanation}
              </p>
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              اختر الإجابة ثم انقر على "تأكيد الإجابة"
            </span>

            {!isAnswerSubmitted ? (
              <button
                type="button"
                onClick={handleSubmitAnswer}
                disabled={selectedOption === null}
                className="px-6 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer disabled:cursor-not-allowed"
              >
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
      {isFinished && (
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

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#122844] border border-slate-200 dark:border-[#1E3A60] max-w-sm mx-auto text-xs text-slate-600 dark:text-slate-300">
            تم تسجيل هذه النتيجة لتعزيز تقدمك الأكاديمي ولوحة الشرف! 🇸🇩
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleRestart}
              className="px-6 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold flex items-center gap-2 shadow-md cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>إعادة الاختبار الفوري</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default InteractiveQuiz;
