import React, { useState, useEffect, useRef } from 'react';
import { 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  Flag, 
  RotateCcw, 
  Award, 
  Sparkles, 
  ChevronRight, 
  ChevronLeft, 
  BarChart3, 
  BookOpen, 
  Check, 
  X, 
  Printer, 
  Flame, 
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  GraduationCap,
  Play
} from 'lucide-react';
import { EXAM_PACKAGES, ExamPackage, SimulatorQuestion } from '../data/examSimulatorData';
import { useAccount } from '../context/AccountContext';
import { QuestionText } from './QuestionText';

interface StudentExamResult {
  examId: string;
  examTitle: string;
  subjectName: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  timeSpentSeconds: number;
  completedAt: string;
  isPassed: boolean;
  answers: Record<number, number>; // questionId -> selectedOption
  strengths: string[];
  weaknesses: string[];
  topicBreakdown: Record<string, { total: number; correct: number }>;
}

export const ExamSimulator: React.FC = () => {
  const { activeAccount, updateActiveAccount } = useAccount();

  // Screen states: 'select' | 'exam' | 'result'
  const [screen, setScreen] = useState<'select' | 'exam' | 'result'>('select');
  const [selectedExam, setSelectedExam] = useState<ExamPackage>(EXAM_PACKAGES[0]);
  const [timingMode, setTimingMode] = useState<'standard' | 'blitz'>('standard');

  // Exam runtime states
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<number, boolean>>({});
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [totalExamSeconds, setTotalExamSeconds] = useState<number>(0);
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  const [examResult, setExamResult] = useState<StudentExamResult | null>(null);
  const [reviewFilter, setReviewFilter] = useState<'all' | 'correct' | 'incorrect'>('all');

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Start exam handler
  const handleStartExam = (pkg: ExamPackage) => {
    setSelectedExam(pkg);
    const duration = timingMode === 'blitz' ? Math.max(Math.floor(pkg.durationMinutes * 0.6), 5) : pkg.durationMinutes;
    const totalSecs = duration * 60;
    
    setTotalExamSeconds(totalSecs);
    setSecondsRemaining(totalSecs);
    setAnswers({});
    setFlaggedQuestions({});
    setCurrentQuestionIndex(0);
    setScreen('exam');
  };

  // Timer effect
  useEffect(() => {
    if (screen !== 'exam') {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleFinishExam(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [screen]);

  // Finish exam & compute comprehensive report
  const handleFinishExam = (isAutoSubmit = false) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setShowSubmitModal(false);

    const questions = selectedExam.questions;
    let correctCount = 0;
    const topicBreakdown: Record<string, { total: number; correct: number }> = {};

    questions.forEach((q) => {
      const selected = answers[q.id];
      const isCorrect = selected === q.correctIndex;
      if (isCorrect) correctCount++;

      // Track by topic
      if (!topicBreakdown[q.topic]) {
        topicBreakdown[q.topic] = { total: 0, correct: 0 };
      }
      topicBreakdown[q.topic].total += 1;
      if (isCorrect) {
        topicBreakdown[q.topic].correct += 1;
      }
    });

    const percentage = Math.round((correctCount / questions.length) * 100);
    const timeSpent = totalExamSeconds - secondsRemaining;
    const isPassed = percentage >= selectedExam.passPercentage;

    // Identify strengths and weaknesses
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    Object.entries(topicBreakdown).forEach(([topic, stats]) => {
      const topicRatio = stats.correct / stats.total;
      if (topicRatio === 1) {
        strengths.push(`${topic} (إتقان بنسبة 100%)`);
      } else if (topicRatio < 0.6) {
        weaknesses.push(`${topic} (أجبت على ${stats.correct} من أصل ${stats.total})`);
      }
    });

    if (strengths.length === 0 && correctCount > 0) {
      strengths.push('المحاولة الشجاعة وحل عدد من الأسئلة بنجاح');
    }
    if (weaknesses.length === 0 && percentage < 100) {
      weaknesses.push('مراجعة طفيفة في الأسئلة التي تم ارتكاب خطأ فيها لتحقيق الدرجة الكاملة');
    }

    const result: StudentExamResult = {
      examId: selectedExam.id,
      examTitle: selectedExam.title,
      subjectName: selectedExam.subjectName,
      score: correctCount,
      totalQuestions: questions.length,
      percentage,
      timeSpentSeconds: timeSpent,
      completedAt: new Date().toLocaleDateString('ar-EG', { dateStyle: 'long' }),
      isPassed,
      answers,
      strengths,
      weaknesses,
      topicBreakdown,
    };

    setExamResult(result);
    setScreen('result');

    // Save exam score to active student account
    if (activeAccount) {
      try {
        const existingScores = activeAccount.quizScores || {};
        updateActiveAccount({
          quizScores: {
            ...existingScores,
            [selectedExam.id]: percentage,
          },
        });
      } catch (err) {
        console.error('Error updating score on exam pass:', err);
      }
    }
  };

  const currentQ = selectedExam.questions[currentQuestionIndex];
  const isCurrentFlagged = !!flaggedQuestions[currentQ?.id];
  const answeredCount = Object.keys(answers).length;
  const unansweredCount = selectedExam.questions.length - answeredCount;

  // Format time
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainderSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainderSecs.toString().padStart(2, '0')}`;
  };

  // Timer alert colors
  const isTimeCritical = secondsRemaining <= 120; // < 2 mins
  const isTimeWarning = secondsRemaining <= 300 && !isTimeCritical; // < 5 mins

  return (
    <div className="space-y-6">
      
      {/* ======================= SCREEN 1: SELECT EXAM ======================= */}
      {screen === 'select' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Hero Banner */}
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white text-right relative overflow-hidden shadow-xl border border-amber-400/20">
            <div className="relative z-10 max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-bold">
                <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
                <span>محاكي الامتحانات الوزارية المقننة · الشهادة المتوسطة</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black">
                محاكي الامتحانات التجريبي تحت ضغط الوقت ⏱️
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                اختبر جاهزيتك الحقيقية للامتحانات القومية من خلال جلسة اختبار متكاملة بمؤقت زمني حقيقي، كراسة إجابة تفاعلية، وتقرير نهائي يحلل نقاط القوة والضعف بدقة وتوجيهات لمعالجتها.
              </p>
            </div>

            {/* Timing mode selector */}
            <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-300 font-bold">نمط التوقيت:</span>
                <button
                  type="button"
                  onClick={() => setTimingMode('standard')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    timingMode === 'standard'
                      ? 'bg-amber-400 text-slate-950 shadow-md'
                      : 'bg-white/10 text-slate-300 hover:bg-white/20'
                  }`}
                >
                  الوضع الوزاري المعتمد (وقت رسمي كامل)
                </button>
                <button
                  type="button"
                  onClick={() => setTimingMode('blitz')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    timingMode === 'blitz'
                      ? 'bg-amber-400 text-slate-950 shadow-md'
                      : 'bg-white/10 text-slate-300 hover:bg-white/20'
                  }`}
                >
                  تحدي السرعة الخاطف (مضغوط ⚡)
                </button>
              </div>

              <div className="text-xs text-amber-300/90 font-medium">
                🇸🇩 أسئلة تجريبية مطابقة لنمط امتحانات الشهادة المتوسطة
              </div>
            </div>
          </div>

          {/* Exam Packages Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {EXAM_PACKAGES.map((pkg) => {
              const displayDuration = timingMode === 'blitz' ? Math.max(Math.floor(pkg.durationMinutes * 0.6), 5) : pkg.durationMinutes;
              return (
                <div
                  key={pkg.id}
                  className="bg-white dark:bg-[#0D1F35] rounded-3xl border border-slate-200 dark:border-[#1E3A60] p-6 text-right flex flex-col justify-between hover:shadow-xl hover:border-amber-400/60 transition-all group"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-[#142A46] border border-blue-200 dark:border-[#1E3A60] flex items-center justify-center text-blue-900 dark:text-amber-400 font-black shadow-inner">
                        <GraduationCap className="w-6 h-6" />
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-[#122844] text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                          <span>{displayDuration} دقيقة</span>
                        </span>
                        <span className="px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 text-xs font-bold">
                          {pkg.questions.length} سؤال
                        </span>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-900 dark:group-hover:text-amber-400 transition-colors">
                        {pkg.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                        {pkg.description}
                      </p>
                    </div>

                    {/* Features pills */}
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      <span className="text-[11px] px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        درجة النجاح: {pkg.passPercentage}%
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        وسام: {pkg.badgeTitle}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        تحليل فوري لنقاط الضعف
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      محاكاة الامتحان الوزاري
                    </span>
                    <button
                      type="button"
                      onClick={() => handleStartExam(pkg)}
                      className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer group-hover:scale-105"
                    >
                      <span>بدء محاكاة الاختبار</span>
                      <Play className="w-4 h-4 fill-current rotate-180" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================= SCREEN 2: LIVE EXAM HALL ======================= */}
      {screen === 'exam' && currentQ && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Exam Header: Timer, Title, Submit */}
          <div className="bg-white dark:bg-[#0D1F35] rounded-3xl border border-slate-200 dark:border-[#1E3A60] p-4 sm:p-6 shadow-sm sticky top-4 z-30 backdrop-blur-md">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              
              {/* Exam Info */}
              <div className="text-right w-full sm:w-auto">
                <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 font-bold mb-1">
                  <span>جلسة الامتحان المباشرة</span>
                  <span>•</span>
                  <span>{selectedExam.subjectName}</span>
                </div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate max-w-md">
                  {selectedExam.title}
                </h2>
              </div>

              {/* Countdown Timer with Visual Alert */}
              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                <div
                  className={`flex items-center gap-2.5 px-4 py-2 rounded-2xl border font-mono font-black text-sm sm:text-base transition-all ${
                    isTimeCritical
                      ? 'bg-red-500 text-white border-red-600 animate-pulse shadow-lg shadow-red-500/30'
                      : isTimeWarning
                      ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-md'
                      : 'bg-slate-100 dark:bg-[#142A46] text-slate-900 dark:text-white border-slate-200 dark:border-[#1E3A60]'
                  }`}
                  title="الوقت المتبقي"
                >
                  <Clock className={`w-5 h-5 ${isTimeCritical ? 'animate-spin' : ''}`} />
                  <span>{formatTime(secondsRemaining)}</span>
                  {isTimeCritical && (
                    <span className="text-[10px] bg-white text-red-700 px-1.5 py-0.5 rounded font-sans font-bold">
                      أسرع!
                    </span>
                  )}
                </div>

                {/* Submit Exam Button */}
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(true)}
                  className="px-4 sm:px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-black shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تسليم الإجابات</span>
                </button>
              </div>
            </div>

            {/* Time progress bar */}
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-4 overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 ${
                  isTimeCritical ? 'bg-red-500' : isTimeWarning ? 'bg-amber-500' : 'bg-blue-600'
                }`}
                style={{ width: `${(secondsRemaining / totalExamSeconds) * 100}%` }}
              />
            </div>
          </div>

          {/* Main Question Card Area */}
          <div className="bg-white dark:bg-[#0D1F35] rounded-3xl border border-slate-200 dark:border-[#1E3A60] p-6 sm:p-8 text-right shadow-sm space-y-6">
            
            {/* Question Top Bar */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-900 dark:text-blue-300 text-xs font-black">
                  السؤال {currentQuestionIndex + 1} من {selectedExam.questions.length}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
                  {currentQ.unit}
                </span>
              </div>

              {/* Flag for Review toggle */}
              <button
                type="button"
                onClick={() =>
                  setFlaggedQuestions((prev) => ({
                    ...prev,
                    [currentQ.id]: !prev[currentQ.id],
                  }))
                }
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isCurrentFlagged
                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                    : 'bg-slate-100 dark:bg-[#142A46] text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                <Flag className={`w-3.5 h-3.5 ${isCurrentFlagged ? 'fill-current text-amber-500' : ''}`} />
                <span>{isCurrentFlagged ? 'معلّم للمراجعة 🚩' : 'علامة مراجعة'}</span>
              </button>
            </div>

            {/* Question Topic & Text */}
            <div className="space-y-3">
              <div className="text-xs text-amber-600 dark:text-amber-400 font-bold">
                الموضوع: {currentQ.topic}
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed">
                <QuestionText text={currentQ.question} />
              </h3>
            </div>

            {/* Options List */}
            <div className="grid grid-cols-1 gap-3 pt-2">
              {currentQ.options.map((option, idx) => {
                const isSelected = answers[currentQ.id] === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() =>
                      setAnswers((prev) => ({
                        ...prev,
                        [currentQ.id]: idx,
                      }))
                    }
                    className={`w-full p-4 rounded-2xl border text-right font-medium text-xs sm:text-sm leading-relaxed transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-[#173356] border-blue-600 dark:border-amber-400 text-blue-950 dark:text-white shadow-md ring-2 ring-blue-500/20'
                        : 'bg-slate-50/70 dark:bg-[#0E2036] border-slate-200 dark:border-[#1C3A62] text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#142A46]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {['أ', 'ب', 'ج', 'د', 'هـ'][idx] ?? idx + 1}
                      </div>
                      <span>{option}</span>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Previous & Next Navigation */}
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentQuestionIndex((i) => Math.max(i - 1, 0))}
                disabled={currentQuestionIndex === 0}
                className="px-4 sm:px-5 py-2.5 rounded-xl border border-slate-300 dark:border-[#1E3A60] text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-bold flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-[#142A46] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
                <span>السؤال السابق</span>
              </button>

              <span className="text-xs text-slate-400">
                {answeredCount} من {selectedExam.questions.length} تمت إجابته
              </span>

              {currentQuestionIndex < selectedExam.questions.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentQuestionIndex((i) => Math.min(i + 1, selectedExam.questions.length - 1))}
                  className="px-5 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 dark:bg-amber-400 dark:hover:bg-amber-300 dark:text-slate-950 text-white text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <span>السؤال التالي</span>
                  <ChevronLeft className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(true)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-black flex items-center gap-2 cursor-pointer transition-colors shadow-md"
                >
                  <span>مراجعة وتسليم</span>
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Question Navigator Palette (Matrix) */}
          <div className="bg-white dark:bg-[#0D1F35] rounded-3xl border border-slate-200 dark:border-[#1E3A60] p-5 text-right shadow-sm space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 font-bold">
              <span>خريطة أسئلة كراسة الإجابة:</span>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                  <span>تمت الإجابة</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                  <span>مراجعة 🚩</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700 inline-block" />
                  <span>لم يُجب</span>
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {selectedExam.questions.map((q, idx) => {
                const isAnswered = answers[q.id] !== undefined;
                const isFlagged = flaggedQuestions[q.id];
                const isCurrent = currentQuestionIndex === idx;

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentQuestionIndex(idx)}
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl font-mono font-bold text-xs flex items-center justify-center transition-all cursor-pointer relative ${
                      isCurrent
                        ? 'ring-2 ring-blue-600 dark:ring-amber-400 scale-110 shadow-md font-black'
                        : ''
                    } ${
                      isAnswered
                        ? 'bg-emerald-600 text-white'
                        : isFlagged
                        ? 'bg-amber-500 text-slate-950 font-black'
                        : 'bg-slate-100 dark:bg-[#142A46] text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    <span>{idx + 1}</span>
                    {isFlagged && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full border border-white" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Submit Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0D1F35] rounded-3xl max-w-md w-full p-6 text-right border border-slate-200 dark:border-[#1E3A60] shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              هل أنت متأكد من تسليم ورقة الامتحان؟
            </h3>

            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-[#122844] p-3.5 rounded-2xl border border-slate-200 dark:border-[#1E3A60]">
              <div className="flex justify-between">
                <span>الأسئلة التي تمت إجابتها:</span>
                <span className="font-bold text-emerald-600">{answeredCount} سؤال</span>
              </div>
              <div className="flex justify-between">
                <span>الأسئلة غير المكتملة:</span>
                <span className={`font-bold ${unansweredCount > 0 ? 'text-red-500' : 'text-slate-400'}`}>
                  {unansweredCount} سؤال
                </span>
              </div>
              <div className="flex justify-between">
                <span>الأسئلة المعلّمة للمراجعة:</span>
                <span className="font-bold text-amber-500">
                  {Object.values(flaggedQuestions).filter(Boolean).length} سؤال
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-800">
                <span>الوقت المتبقي:</span>
                <span className="font-mono font-bold text-blue-600">{formatTime(secondsRemaining)}</span>
              </div>
            </div>

            <p className="text-xs text-slate-500">
              بمجرد التسليم، ستنتهي الجلسة وسيتم توليد التقرير الأكاديمي الشامل لنقاط القوة والضعف.
            </p>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
              >
                العودة للحل
              </button>
              <button
                type="button"
                onClick={() => handleFinishExam(false)}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md cursor-pointer"
              >
                تأكيد التسليم الآن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================= SCREEN 3: COMPREHENSIVE PERFORMANCE REPORT ======================= */}
      {screen === 'result' && examResult && (
        <div className="space-y-6 animate-in fade-in duration-300 text-right">
          
          {/* Main Score & Congratulatory Banner */}
          <div
            className={`rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl border ${
              examResult.isPassed
                ? 'bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 border-emerald-400/30'
                : 'bg-gradient-to-r from-amber-900 via-slate-900 to-slate-900 border-amber-400/30'
            }`}
          >
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-3 max-w-xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-bold">
                  {examResult.isPassed ? (
                    <>
                      <Award className="w-4 h-4 text-amber-300" />
                      <span>مبروك! لقد اجتزت امتحان المحاكاة بنجاح 🇸🇩</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <span>نتيجة المحاولة: بحاجة لمزيد من المراجعة والتكرار</span>
                    </>
                  )}
                </div>

                <h2 className="text-2xl sm:text-3xl font-black">
                  تقرير تقييم الأداء: {examResult.examTitle}
                </h2>

                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  {examResult.percentage >= 90
                    ? 'أداء استثنائي ومبهر! لقد أظهرت استيعاباً كاملاً لقوانين المنهج وتطبيقاته الوزارية.'
                    : examResult.isPassed
                    ? 'أداء طيب ومميز! اجتزت الاختبار بنجاح، ويوضح التقرير أدناه المحاور التي يمكنك صقلها لبلوغ الدرجة الكاملة.'
                    : 'محاولة شجاعة يا بطل! الامتحان تحت ضغط الوقت يكشف بدقة نقاط الضعف لمراجعتها والتفوق في المرة القادمة.'}
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-slate-300">
                  <span>زمن الإجابة: {Math.floor(examResult.timeSpentSeconds / 60)} دقيقة و {examResult.timeSpentSeconds % 60} ثانية</span>
                  <span>•</span>
                  <span>تاريخ الاختبار: {examResult.completedAt}</span>
                  <span>•</span>
                  <span>المعدل المطلوب: {selectedExam.passPercentage}%</span>
                </div>
              </div>

              {/* Big Score Card */}
              <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20 text-center shrink-0 min-w-[180px]">
                <div className="text-4xl sm:text-5xl font-black font-mono text-amber-300">
                  {examResult.percentage}%
                </div>
                <div className="text-xs text-white/90 font-bold mt-1">
                  {examResult.score} من أصل {examResult.totalQuestions} سؤال
                </div>
                <div className="mt-3 pt-3 border-t border-white/10 text-[11px] font-bold">
                  {examResult.percentage >= 90
                    ? 'التقدير: ممتاز (مرتبة الشرف) 🏆'
                    : examResult.percentage >= 75
                    ? 'التقدير: جيد جداً 🌟'
                    : examResult.percentage >= 50
                    ? 'التقدير: جيد (ناجح) 👍'
                    : 'التقدير: غير مجتاز (إعادة محاولة) 📚'}
                </div>
              </div>
            </div>
          </div>

          {/* Analysis Cards: Strengths vs Weaknesses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Strengths Card */}
            <div className="bg-white dark:bg-[#0D1F35] rounded-3xl border border-slate-200 dark:border-[#1E3A60] p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400 font-extrabold text-base pb-3 border-b border-slate-100 dark:border-slate-800">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span>نقاط القوة والمواضيع التي أتقنتها (Strengths):</span>
              </div>

              {examResult.strengths.length > 0 ? (
                <ul className="space-y-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                  {examResult.strengths.map((st, i) => (
                    <li
                      key={i}
                      className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-start gap-2.5"
                    >
                      <Sparkles className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                      <span>{st}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500">لا توجد مواضيع محددة بلغت 100% في هذه المحاولة.</p>
              )}
            </div>

            {/* Weaknesses & Areas for Improvement Card */}
            <div className="bg-white dark:bg-[#0D1F35] rounded-3xl border border-slate-200 dark:border-[#1E3A60] p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-400 font-extrabold text-base pb-3 border-b border-slate-100 dark:border-slate-800">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                <span>المحاور التي تحتاج تقوية ومراجعة (Action Plan):</span>
              </div>

              {examResult.weaknesses.length > 0 ? (
                <ul className="space-y-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                  {examResult.weaknesses.map((wk, i) => (
                    <li
                      key={i}
                      className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-start gap-2.5"
                    >
                      <Lightbulb className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                      <div>
                        <div className="font-bold">{wk}</div>
                        <div className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                          نصيحة المعلم: راجع شروحات هذا المفهوم في قسم الدروس وحل نماذج المذكرة لتثبيت القاعدة.
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>ما شاء الله! لا توجد نقاط ضعف بارزة في هذا الامتحان.</span>
                </div>
              )}
            </div>
          </div>

          {/* Detailed Question by Question Review */}
          <div className="bg-white dark:bg-[#0D1F35] rounded-3xl border border-slate-200 dark:border-[#1E3A60] p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  المراجعة التفصيلية لورقة الإجابة والحلول النموذجية
                </h3>
                <p className="text-xs text-slate-500">
                  اطلع على خطوات الحل لكل مسألة واعرف أسباب الخطأ والصواب
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-[#142A46] rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setReviewFilter('all')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    reviewFilter === 'all'
                      ? 'bg-white dark:bg-[#0D1F35] text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  الكل ({selectedExam.questions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setReviewFilter('correct')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    reviewFilter === 'correct'
                      ? 'bg-white dark:bg-[#0D1F35] text-emerald-600 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  الصحيحة ({examResult.score})
                </button>
                <button
                  type="button"
                  onClick={() => setReviewFilter('incorrect')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    reviewFilter === 'incorrect'
                      ? 'bg-white dark:bg-[#0D1F35] text-red-500 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  الخاطئة ({examResult.totalQuestions - examResult.score})
                </button>
              </div>
            </div>

            {/* Questions List */}
            <div className="space-y-4">
              {selectedExam.questions
                .filter((q) => {
                  const isCorrect = examResult.answers[q.id] === q.correctIndex;
                  if (reviewFilter === 'correct') return isCorrect;
                  if (reviewFilter === 'incorrect') return !isCorrect;
                  return true;
                })
                .map((q, idx) => {
                  const studentAnswer = examResult.answers[q.id];
                  const isCorrect = studentAnswer === q.correctIndex;
                  const isUnanswered = studentAnswer === undefined;

                  return (
                    <div
                      key={q.id}
                      className={`p-5 rounded-2xl border transition-all ${
                        isCorrect
                          ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                          : 'bg-red-50/40 dark:bg-red-950/20 border-red-200 dark:border-red-800/60'
                      }`}
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs text-white font-bold ${
                              isCorrect ? 'bg-emerald-600' : 'bg-red-500'
                            }`}
                          >
                            {isCorrect ? '✓' : '✗'}
                          </span>
                          <span className="text-xs font-black text-slate-900 dark:text-white">
                            السؤال: {q.topic}
                          </span>
                        </div>

                        <span className="text-[11px] font-bold text-slate-500">
                          {isCorrect
                            ? 'إجابة صحيحة (+10 درجات)'
                            : isUnanswered
                            ? 'لم يتم حل السؤال'
                            : 'إجابة غير صحيحة'}
                        </span>
                      </div>

                      <div className="mt-3">
                        <QuestionText text={q.question} />
                      </div>

                      {/* Options preview */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-3 text-xs">
                        {q.options.map((opt, oIdx) => {
                          const isOptCorrect = oIdx === q.correctIndex;
                          const isOptStudent = oIdx === studentAnswer;

                          return (
                            <div
                              key={oIdx}
                              className={`p-2.5 rounded-xl border flex items-center justify-between ${
                                isOptCorrect
                                  ? 'bg-emerald-100 dark:bg-emerald-900/50 border-emerald-400 font-bold text-emerald-950 dark:text-emerald-100'
                                  : isOptStudent
                                  ? 'bg-red-100 dark:bg-red-900/50 border-red-400 font-bold text-red-950 dark:text-red-100'
                                  : 'bg-white dark:bg-[#10243C] border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <span>{opt}</span>
                              {isOptCorrect && <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold">الإجابة الصحيحة ✓</span>}
                              {isOptStudent && !isOptCorrect && <span className="text-[10px] text-red-700 dark:text-red-300 font-bold">إجابتك ✗</span>}
                            </div>
                          );
                        })}
                      </div>

                      {/* Explanation box */}
                      <div className="p-3 rounded-xl bg-blue-50/80 dark:bg-[#122844] border border-blue-200 dark:border-[#1E3A60] text-xs text-blue-950 dark:text-blue-200 leading-relaxed">
                        <span className="font-extrabold block text-blue-900 dark:text-amber-400 mb-1">
                          الشرح والتوجيه النموذجي:
                        </span>
                        {q.explanation}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-6 bg-white dark:bg-[#0D1F35] rounded-3xl border border-slate-200 dark:border-[#1E3A60] flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setScreen('select')}
              className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-[#1E3A60] text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-[#142A46] cursor-pointer transition-colors"
            >
              العودة لقائمة الامتحانات
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-[#142A46] hover:bg-slate-200 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-emerald-500" />
                <span>طباعة التقرير</span>
              </button>

              <button
                type="button"
                onClick={() => handleStartExam(selectedExam)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white text-xs font-black flex items-center gap-2 shadow-md cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>إعادة المحاولة مجدداً</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamSimulator;
