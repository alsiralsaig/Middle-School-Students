import React, { useEffect, useState } from 'react';
import { QuizQuestion } from '../types';
import { SAMPLE_QUIZ_QUESTIONS } from '../data/curriculumData';
import { 
  CheckSquare, 
  HelpCircle, 
  Clock, 
  Award, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  Download,
  FileCheck,
  ChevronLeft,
  BookOpen,
  Flame,
  Sparkles,
  Timer
} from 'lucide-react';
import { ExamSimulator } from '../components/ExamSimulator';
import { ServerExamRunner } from '../components/ServerExamRunner';
import { api } from '../utils/apiClient';
import { MediaAssetViewer, type MediaAssetView } from '../components/MediaAssetViewer';
import { LessonAttachments } from '../components/LessonAttachments';

export const ExamsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'exam-bank' | 'simulator' | 'practice-quiz' | 'past-papers'>('exam-bank');
  /**
   * بنك الأسئلة من الخادم.
   *
   * كان الفلتر `e.attachments?.length` — أي «اعرض الاختبار فقط لو عنده ملف PDF
   * مرفق». والمرفقات صفر في القاعدة، فالقائمة كانت تظهر فاضية رغم وجود ٤٨
   * اختباراً و٢٣٢ سؤالاً. الآن نعرض كل اختبار فيه أسئلة، والمرفقات اختيارية.
   */
  const [serverExams, setServerExams] = useState<
    Array<{
      id: string;
      title: string;
      subjectName: string;
      subjectId?: string;
      questionsCount: number;
      durationMinutes?: number;
      status?: string;
      attachments: MediaAssetView[];
    }>
  >([]);
  /**
   * امتحانات سابقة حقيقية من المكتبة (كانت القائمة قبل كده أسماء ولايات
   * وأحجام ملفات مُلفّقة، والزر ما يحمّل أي حاجة).
   */
  const [paperResources, setPaperResources] = useState<
    Array<{ id: string; title: string; subjectName: string; url: string; category: string; kind: 'file' | 'link' }>
  >([]);
  const [openExam, setOpenExam] = useState<{ id: string; title: string; subjectName: string } | null>(null);
  useEffect(() => {
    let alive = true;
    api
      .exams()
      .then(({ exams }) => {
        if (!alive) return;
        setServerExams(
          exams
            // تدريبات الدروس تُفتح من داخل الدرس نفسه — ما نغرق بيها بنك الأسئلة
            .filter((e) => e.status !== 'lesson-quiz')
            .map((e) => ({
              id: e.id,
              title: e.title,
              subjectName: e.subjectName,
              subjectId: e.subjectId,
              questionsCount: Number(e.questionsCount) || 0,
              durationMinutes: e.durationMinutes,
              status: e.status,
              attachments: e.attachments || [],
            }))
            // نستثني: (١) اختبارين محتواهما مجرد كلمة «انجليزي»،
            // (٢) خمسة اختبارات عنوانها «الصف الثاني المتوسط» وهي لصفّ آخر.
            .filter((e) => e.questionsCount >= 3 && !/الثاني المتوسط/.test(e.title))
            .sort((a, b) => b.questionsCount - a.questionsCount),
        );
      })
      .catch(() => undefined);

    api
      .resources()
      .then(({ resources }) => {
        if (!alive) return;
        const isPaper = (c: string) => /past_exams|interactive_exams|exam-attachment|امتحان/i.test(c);
        const rows = (resources || [])
          .filter((r) => isPaper(String(r.category || '')) || /امتحان|اختبار/.test(String(r.title || '')))
          .map((r) => {
            const filePath = typeof r.filePath === 'string' && /^https?:/i.test(r.filePath) ? r.filePath : '';
            const externalUrl = typeof r.externalUrl === 'string' && /^https?:/i.test(r.externalUrl) ? r.externalUrl : '';
            return {
              id: String(r.id),
              title: String(r.title || 'امتحان'),
              subjectName: String(r.subjectId || ''),
              url: filePath || externalUrl,
              category: String(r.category || ''),
              kind: (filePath ? 'file' : 'link') as 'file' | 'link',
            };
          })
          .filter((r) => !!r.url);
        setPaperResources(rows);
      })
      .catch(() => undefined);

    return () => {
      alive = false;
    };
  }, []);
  
  // Interactive Quiz state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);

  const currentQ = SAMPLE_QUIZ_QUESTIONS[currentIndex];

  const handleSelectOption = (idx: number) => {
    if (hasAnswered) return;
    setSelectedOption(idx);
  };

  const handleCheckAnswer = () => {
    if (selectedOption === null) return;
    setHasAnswered(true);
    if (selectedOption === currentQ.correctIndex) {
      setScore((prev) => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex < SAMPLE_QUIZ_QUESTIONS.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setHasAnswered(false);
    } else {
      setQuizCompleted(true);
    }
  };

  const handleResetQuiz = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setHasAnswered(false);
    setScore(0);
    setQuizCompleted(false);
  };

  /**
   * اختبار مفتوح من بنك الأسئلة ⟹ شاشة الاختبار وحدها.
   * (كل الـhooks فوق، فالخروج المبكر آمن هنا.)
   */
  if (openExam) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <ServerExamRunner
          examId={openExam.id}
          examTitle={openExam.title}
          subjectName={openExam.subjectName}
          onExit={() => setOpenExam(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-white dark:bg-[#0D1F35] rounded-3xl border border-slate-200 dark:border-[#1C3A62] p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="text-right space-y-2">
            <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 font-semibold">
              <CheckSquare className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>تقييم واستعداد امتحانات الشهادة المتوسطة</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              بنك الاختبارات ونماذج امتحانات تجريبية
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
              تدرب على أسئلة امتحانات الشهادة المتوسطة في بيئة تفاعلية لاختبار مدى استيعابك للمواد واكتشاف النقاط التي تحتاج لمزيد من المراجعة.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-[#122844] border border-slate-200 dark:border-[#1E3A60] rounded-2xl p-4 flex items-center gap-3 self-start md:self-auto shrink-0">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-amber-400/20 text-blue-900 dark:text-amber-300 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5 text-blue-900 dark:text-amber-300" />
            </div>
            <div className="text-right text-xs">
              <div className="font-bold text-slate-900 dark:text-white">تدريب ذاتي وتصحيح فوري</div>
              <div className="text-slate-500 dark:text-slate-400">مع شرح توضيحي لكل سؤال</div>
            </div>
          </div>
        </div>

        {/* Phase 1 Scope Honest Callout */}
        <div className="mt-6 p-4 rounded-2xl bg-amber-50/80 dark:bg-[#152B4A] border border-amber-200 dark:border-amber-400/30 flex items-start gap-3 text-right">
          <AlertCircle className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 dark:text-amber-200 space-y-1">
            <span className="font-bold">كيف تستفيد من الاختبارات؟</span>
            <p className="text-amber-800 dark:text-slate-300 leading-relaxed">
              ابدأ باختبار قصير من «بنك الأسئلة» عشان تعرف نقاط ضعفك، بعدها ارجع لدرس المادة واقرأ القواعد، وبعدها أعد الاختبار. التصحيح فوري، ومع كل سؤال بيظهر ليك التفسير.
            </p>
          </div>
        </div>

        {/* Tab switch */}
        <div className="mt-6 flex flex-wrap items-center gap-2 p-1.5 bg-slate-100 dark:bg-[#142A46] rounded-2xl w-full sm:w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('exam-bank')}
            className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'exam-bank'
                ? 'bg-gradient-to-r from-emerald-700 to-teal-700 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>بنك الأسئلة ({serverExams.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('simulator')}
            className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'simulator'
                ? 'bg-gradient-to-r from-blue-700 to-indigo-700 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4 text-amber-300" />
            <span>محاكي الامتحانات التجريبي (موقوت)</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-400 text-slate-950 font-bold">
              جديد ⏱️
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('practice-quiz')}
            className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'practice-quiz'
                ? 'bg-white dark:bg-[#1F3E68] text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            تدريبات سريعة (5 أسئلة)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('past-papers')}
            className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'past-papers'
                ? 'bg-white dark:bg-[#1F3E68] text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            امتحانات وأوراق سابقة
          </button>
        </div>
      </div>

      {/* Mode 0: بنك الأسئلة — الاختبارات الجاهزة من قاعدة البيانات */}
      {activeTab === 'exam-bank' && (
        <div className="space-y-4">
          {serverExams.length === 0 ? (
            <div className="p-8 rounded-2xl bg-white dark:bg-[#0D1F35] border border-slate-200 dark:border-[#1C3A62] text-center space-y-2">
              <p className="text-sm font-bold text-slate-800 dark:text-white">ما في اختبارات متاحة الآن</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                الاختبارات تُضاف من الإدارة. جرّب «تدريبات سريعة» من نفس الدرس في هذه الأثناء.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {serverExams.map((exam) => (
                <button
                  key={exam.id}
                  onClick={() => setOpenExam({ id: exam.id, title: exam.title, subjectName: exam.subjectName })}
                  className="text-right bg-white dark:bg-[#0D1F35] rounded-2xl border border-slate-200 dark:border-[#1C3A62] p-5 hover:border-emerald-400 dark:hover:border-emerald-500 transition-colors space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white leading-snug">{exam.title}</h3>
                    <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      {exam.questionsCount} سؤال
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {exam.subjectName}
                    {exam.durationMinutes ? ` · ${exam.durationMinutes} دقيقة` : ''}
                  </p>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-800 dark:text-amber-300">
                    ابدأ الاختبار
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mode 1: Timed Full Exam Simulator */}
      {activeTab === 'simulator' && (
        <ExamSimulator />
      )}

      {/* Mode 2: Interactive Practice Quiz */}
      {activeTab === 'practice-quiz' && (
        <div className="bg-white dark:bg-[#0D1F35] rounded-3xl border border-slate-200 dark:border-[#1C3A62] p-6 sm:p-10 shadow-sm max-w-3xl mx-auto space-y-6 text-right">
          {!quizCompleted ? (
            <>
              {/* Quiz Progress & Subject Header */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-blue-900 dark:text-amber-300 bg-blue-50 dark:bg-[#142D50] px-2.5 py-1 rounded-lg border border-blue-100 dark:border-[#1F416E]">
                    مادة {currentQ.subject}
                  </span>
                  <span className="text-slate-300 dark:text-slate-600">·</span>
                  <span className="text-slate-500 dark:text-slate-400 font-medium">{currentQ.topic}</span>
                </div>

                <div className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">
                  السؤال {currentIndex + 1} من {SAMPLE_QUIZ_QUESTIONS.length}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-900 dark:bg-amber-400 transition-all duration-300"
                  style={{
                    width: `${((currentIndex + 1) / SAMPLE_QUIZ_QUESTIONS.length) * 100}%`,
                  }}
                />
              </div>

              {/* Question Text */}
              <div className="py-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed">
                  {currentQ.question}
                </h3>
              </div>

              {/* Options list */}
              <div className="space-y-3">
                {currentQ.options.map((option, idx) => {
                  let optionStyles = 'border-slate-200 dark:border-[#1E3A60] hover:border-blue-900/40 dark:hover:border-amber-400/40 bg-slate-50 dark:bg-[#122844] text-slate-800 dark:text-slate-200';

                  if (selectedOption === idx) {
                    optionStyles = 'border-blue-900 dark:border-amber-400 bg-blue-50/70 dark:bg-[#16365F] text-blue-950 dark:text-amber-200 font-bold';
                  }

                  if (hasAnswered) {
                    if (idx === currentQ.correctIndex) {
                      optionStyles = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-950 dark:text-emerald-200 font-bold ring-1 ring-emerald-500';
                    } else if (selectedOption === idx && idx !== currentQ.correctIndex) {
                      optionStyles = 'border-rose-400 bg-rose-50 dark:bg-rose-950/60 text-rose-950 dark:text-rose-200 font-bold';
                    } else {
                      optionStyles = 'opacity-50 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B182B] text-slate-500 dark:text-slate-400';
                    }
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectOption(idx)}
                      disabled={hasAnswered}
                      className={`w-full p-4 rounded-2xl border text-right text-xs sm:text-sm transition-all flex items-center justify-between gap-3 min-h-[52px] cursor-pointer ${optionStyles}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-lg bg-white dark:bg-[#0E2036] border border-slate-200 dark:border-[#1E3A60] text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-xs shrink-0">
                          {idx === 0 ? 'أ' : idx === 1 ? 'ب' : idx === 2 ? 'ج' : 'د'}
                        </span>
                        <span>{option}</span>
                      </div>

                      {hasAnswered && idx === currentQ.correctIndex && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      )}
                      {hasAnswered && selectedOption === idx && idx !== currentQ.correctIndex && (
                        <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Answer Feedback Explanation (shown after clicking check) */}
              {hasAnswered && (
                <div
                  className={`p-5 rounded-2xl border text-right space-y-2 animate-in fade-in ${
                    selectedOption === currentQ.correctIndex
                      ? 'bg-emerald-50/80 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-700/60 text-emerald-950 dark:text-emerald-200'
                      : 'bg-amber-50/80 dark:bg-[#162D4A] border-amber-200 dark:border-amber-400/30 text-amber-950 dark:text-amber-200'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs sm:text-sm">
                    {selectedOption === currentQ.correctIndex ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>إجابة صحيحة! أحسنت يا بطل.</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                        <span>إجابة غير دقيقة. لاحظ التعليل والشرح النموذجي:</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm leading-relaxed text-slate-700 dark:text-slate-300 pt-1 border-t border-slate-200/40 dark:border-slate-800">
                    <span className="font-bold">التوضيح: </span>
                    {currentQ.explanation}
                  </p>
                </div>
              )}

              {/* Quiz Buttons */}
              <div className="pt-4 flex items-center justify-between gap-3">
                {!hasAnswered ? (
                  <button
                    onClick={handleCheckAnswer}
                    disabled={selectedOption === null}
                    className={`w-full py-3 px-6 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer min-h-[44px] ${
                      selectedOption !== null
                        ? 'bg-blue-900 hover:bg-blue-800 text-white shadow-md'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    التحقق من الإجابة
                  </button>
                ) : (
                  <button
                    onClick={handleNextQuestion}
                    className="w-full py-3 px-6 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer min-h-[44px]"
                  >
                    {currentIndex < SAMPLE_QUIZ_QUESTIONS.length - 1
                      ? 'السؤال التالي'
                      : 'عرض النتيجة النهائية'}
                  </button>
                )}
              </div>
            </>
          ) : (
            /* Quiz Completed Results Screen */
            <div className="text-center py-6 space-y-6">
              <div className="w-16 h-16 rounded-3xl bg-amber-100 dark:bg-amber-400/20 text-amber-800 dark:text-amber-300 flex items-center justify-center mx-auto shadow-inner">
                <Award className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                  اكتمل الاختبار التجريبي!
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                  لقد أجبت على كافة الأسئلة الاسترشادية للشهادة المتوسطة بنجاح.
                </p>
              </div>

              {/* Score Display */}
              <div className="bg-slate-50 dark:bg-[#122844] border border-slate-200 dark:border-[#1E3A60] rounded-2xl p-6 max-w-sm mx-auto">
                <div className="text-3xl sm:text-4xl font-extrabold text-blue-900 dark:text-amber-400 font-mono mb-1">
                  {score} / {SAMPLE_QUIZ_QUESTIONS.length}
                </div>
                <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {score === SAMPLE_QUIZ_QUESTIONS.length
                    ? 'ممتاز جداً! إجابات مثالية تعكس استعدادك القوي'
                    : score >= 3
                    ? 'مستوى جيد جداً، استمر في مراجعة القواعد والمسائل'
                    : 'بداية طيبة، راجع ملخصات الدروس ثم أعد المحاولة'}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                <button
                  onClick={handleResetQuiz}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-900 hover:bg-blue-800 dark:bg-amber-400 dark:hover:bg-amber-300 dark:text-slate-950 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[44px]"
                >
                  <RotateCcw className="w-4 h-4 text-amber-300 dark:text-slate-950" />
                  <span>إعادة الاختبار من البداية</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mode 2: Past Papers */}
      {activeTab === 'past-papers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {serverExams.map(exam=><article key={exam.id} className="bg-white dark:bg-[#0D1F35] rounded-2xl border border-slate-200 dark:border-[#1C3A62] p-6 shadow-sm text-right"><h3 className="text-base font-bold text-slate-900 dark:text-white">{exam.title}</h3><p className="text-xs text-slate-500 mt-1">{exam.subjectName} · مرفقات تعليمية</p><div className="mt-4"><LessonAttachments attachments={exam.attachments.map(a=>({id:a.id,title:a.title,url:a.url,kind:a.kind,mimeType:a.mimeType,originalName:a.originalName}))} subjectId={exam.subjectName} subjectName={exam.subjectName} /></div></article>)}
          {paperResources.length === 0 && (
            <div className="md:col-span-2 p-8 rounded-2xl bg-white dark:bg-[#0D1F35] border border-slate-200 dark:border-[#1C3A62] text-center space-y-2">
              <p className="text-sm font-bold text-slate-800 dark:text-white">ما في امتحانات سابقة مرفوعة الآن</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                بنضيفها أول بأول — وفي انتظارها جرّب «بنك الأسئلة» فوق، فيه {serverExams.length} اختباراً جاهزاً.
              </p>
            </div>
          )}
          {paperResources.map((paper) => (
            <div
              key={paper.id}
              className="bg-white dark:bg-[#0D1F35] rounded-2xl border border-slate-200 dark:border-[#1C3A62] p-6 shadow-sm flex flex-col justify-between text-right space-y-4"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2 font-medium">
                  <span className="font-bold text-blue-900 dark:text-amber-400">
                    {paper.kind === 'link' ? 'اختبار تفاعلي' : 'ملف امتحان'}
                  </span>
                  {paper.subjectName && (
                    <span className="bg-slate-100 dark:bg-[#142A46] text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded">
                      {paper.subjectName}
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">{paper.title}</h3>
              </div>

              <a
                href={paper.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-[#193A64] dark:hover:bg-[#204573] text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer min-h-[44px]"
              >
                <Download className="w-4 h-4 text-amber-400" />
                <span>{paper.kind === 'link' ? 'افتح الاختبار' : 'افتح الملف'}</span>
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
