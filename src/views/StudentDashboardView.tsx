import React, { useMemo } from 'react';
import { Subject, ViewMode, Lesson } from '../types';
import { WeeklyProgressChart } from '../components/WeeklyProgressChart';
import { 
  User, 
  Award, 
  BookOpen, 
  CheckCircle2, 
  Flame, 
  Clock, 
  Calendar, 
  TrendingUp, 
  FileText, 
  ShieldCheck,
  ChevronLeft,
  Sparkles,
  Bookmark,
  Trash2,
  PlayCircle
} from 'lucide-react';

interface StudentDashboardViewProps {
  subjects: Subject[];
  completedLessonIds: string[];
  bookmarkedLessonIds?: string[];
  onToggleBookmark?: (lessonId: string) => void;
  onNavigate: (view: ViewMode) => void;
  onSelectSubject: (subjectId: string) => void;
  onSelectLesson?: (lesson: Lesson) => void;
}

export const StudentDashboardView: React.FC<StudentDashboardViewProps> = ({
  subjects,
  completedLessonIds,
  bookmarkedLessonIds = [],
  onToggleBookmark,
  onNavigate,
  onSelectSubject,
  onSelectLesson,
}) => {
  const student = {
    name: 'أحمد النور عثمان',
    grade: 'الصف الثالث المتوسط',
    school: 'مدرسة المؤتمر المتوسطة بنين',
    state: 'جمهورية السودان - ولاية نهر النيل',
    streakDays: 6,
    totalStudyHours: 18.5,
  };

  const totalLessonsInCurriculum = subjects.reduce(
    (acc, curr) => acc + curr.lessonsCount,
    0
  );
  const completedCount = completedLessonIds.length;
  const overallPercentage = Math.round(
    (completedCount / Math.max(totalLessonsInCurriculum, 1)) * 100
  );

  const weeklySchedule = [
    { day: 'الأحد', subject: 'الرياضيات', topic: 'تحليل الفرق بين مربعين والمقادير الثلاثية', time: '5:00 م - 6:30 م' },
    { day: 'الإثنين', subject: 'العلوم', topic: 'الروابط الكيميائية وتكافؤ العناصر', time: '5:00 م - 6:30 م' },
    { day: 'الثلاثاء', subject: 'اللغة العربية', topic: 'الممنوع من الصرف لعلة ولعلتين', time: '5:00 م - 6:30 م' },
    { day: 'الأربعاء', subject: 'الدراسات الاجتماعية', topic: 'أسباب الثورة المهدية وتحرير الخرطوم', time: '5:00 م - 6:30 م' },
    { day: 'الخميس', subject: 'التربية الإسلامية', topic: 'أحكام النون الساكنة والتنوين', time: '5:00 م - 6:30 م' },
    { day: 'الجمعة', subject: 'مراجعة أسبوعية', topic: 'حل نموذج امتحان الشهادة المتوسطة التجريبي', time: '4:00 م - 6:00 م' },
  ];

  return (
    <div className="space-y-8">
      {/* Student Profile Overview Card */}
      <div className="bg-[#0B1E36] text-white rounded-3xl p-6 sm:p-8 border border-[#193557] shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-right">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center font-bold text-2xl shrink-0 shadow-md">
              أ
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-white">
                  {student.name}
                </h1>
                <span className="bg-amber-400/20 text-amber-300 text-[11px] font-bold px-2 py-0.5 rounded-md border border-amber-400/30">
                  طالب نظامي
                </span>
              </div>
              <div className="text-xs text-slate-300 flex flex-wrap items-center gap-2">
                <span>{student.grade}</span>
                <span className="text-slate-500">·</span>
                <span>{student.school}</span>
                <span className="text-slate-500">·</span>
                <span className="text-amber-400 font-medium">{student.state}</span>
              </div>
            </div>
          </div>

          <div className="bg-[#122846] border border-[#21416E] p-3.5 rounded-2xl flex items-center gap-4 self-start md:self-auto text-xs">
            <div className="text-right">
              <div className="text-slate-400 text-[11px]">حالة الحساب</div>
              <div className="text-emerald-400 font-bold">نشط - معاينة الواجهة</div>
            </div>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* 4 Metric KPI Cards */}
        <div className="mt-8 pt-6 border-t border-[#162D4A] grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#071526]/70 p-4 rounded-2xl border border-[#142A46] text-right">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>الدروس المكتملة</span>
              <BookOpen className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-white">
              {completedCount} <span className="text-xs font-normal text-slate-400">درس</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">من إجمالي {totalLessonsInCurriculum} درساً</div>
          </div>

          <div className="bg-[#071526]/70 p-4 rounded-2xl border border-[#142A46] text-right">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>تتابع الدراسة</span>
              <Flame className="w-4 h-4 text-orange-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-amber-400">
              {student.streakDays} <span className="text-xs font-normal text-slate-400">أيام</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">تتابع دراسي مستمر</div>
          </div>

          <div className="bg-[#071526]/70 p-4 rounded-2xl border border-[#142A46] text-right">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>ساعات المذاكرة</span>
              <Clock className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-white">
              {student.totalStudyHours} <span className="text-xs font-normal text-slate-400">ساعة</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">هذا الشهر</div>
          </div>

          <div className="bg-[#071526]/70 p-4 rounded-2xl border border-[#142A46] text-right">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>نسبة الإنجاز العامة</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-400">
              %{overallPercentage}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">من المنهج القومي</div>
          </div>
        </div>
      </div>

      {/* Weekly Progress Chart */}
      <WeeklyProgressChart completedLessonCount={completedCount} />

      {/* Main Grid: Subject Progress & Weekly Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Subject Progress Breakdown (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-[#0D1F35] rounded-3xl border border-slate-200 dark:border-[#1C3A62] p-6 sm:p-8 space-y-6 text-right shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              تقدم دراسة المواد المقررة
            </h2>
            <button
              onClick={() => onNavigate('subjects')}
              className="text-xs font-bold text-blue-900 dark:text-amber-400 hover:text-blue-700 dark:hover:text-amber-300 flex items-center gap-1 cursor-pointer"
            >
              <span>متابعة المواد</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            {subjects.map((sub) => {
              const subCompleted = completedLessonIds.filter((id) =>
                id.startsWith(sub.id)
              ).length;
              const subPct = Math.round(
                (subCompleted / Math.max(sub.lessonsCount, 1)) * 100
              );

              return (
                <div
                  key={sub.id}
                  onClick={() => onSelectSubject(sub.id)}
                  className="p-4 rounded-2xl border border-slate-100 dark:border-[#1E3A60] bg-slate-50/50 dark:bg-[#122844]/60 hover:bg-slate-50 dark:hover:bg-[#163359] transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-bold text-slate-900 dark:text-white group-hover:text-blue-900 dark:group-hover:text-amber-300">
                      {sub.name} ({sub.nameEn})
                    </span>
                    <span className="font-mono text-slate-600 dark:text-slate-300 font-semibold">
                      {subCompleted} من {sub.lessonsCount} درس ({subPct}%)
                    </span>
                  </div>

                  <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-900 dark:bg-amber-400 rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(subPct, 5)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Weekly Study Schedule (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-[#0D1F35] rounded-3xl border border-slate-200 dark:border-[#1C3A62] p-6 sm:p-8 space-y-6 text-right shadow-sm">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-lg">
            <Calendar className="w-5 h-5 text-blue-900 dark:text-amber-400" />
            <h2>جدول المذاكرة المقترح للشهادة</h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            خطة منظمة لتغطية مواد الصف الثالث المتوسط بمعدل ساعة ونصف يومياً:
          </p>

          <div className="space-y-3">
            {weeklySchedule.map((item, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl border border-slate-100 dark:border-[#1E3A60] bg-slate-50 dark:bg-[#122844] text-right space-y-1"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-blue-900 dark:text-amber-400">{item.day}</span>
                  <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">{item.time}</span>
                </div>
                <div className="text-xs font-bold text-slate-800 dark:text-white">{item.subject}</div>
                <div className="text-[11px] text-slate-600 dark:text-slate-300">{item.topic}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
