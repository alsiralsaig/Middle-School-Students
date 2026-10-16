import React, { useState, useMemo } from 'react';
import { Subject, ViewMode, Lesson } from '../types';
import { WeeklyProgressChart } from '../components/WeeklyProgressChart';
import { InteractiveCalendar } from '../components/InteractiveCalendar';
import { StudyReminderWidget } from '../components/StudyReminderWidget';
import { WeeklyExamPlanner } from '../components/WeeklyExamPlanner';
import { StudyInsights } from '../components/StudyInsights';
import { useAccount } from '../context/AccountContext';
import { useLanguage } from '../context/LanguageContext';
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
  PlayCircle,
  Search,
  BookMarked,
  Layers,
  ArrowUpRight,
  Trophy,
  FileCheck2,
  Users
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
  const { activeAccount, setIsAccountModalOpen } = useAccount();
  const { t, language, isRtl } = useLanguage();
  const [bookmarkSearch, setBookmarkSearch] = useState('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');

  const student = {
    name: activeAccount.name,
    grade: activeAccount.grade,
    school: activeAccount.school,
    state: activeAccount.state,
    streakDays: activeAccount.streakDays,
    avatar: activeAccount.avatar || '👨‍🎓',
    totalStudyHours: Math.round((completedLessonIds.length * 1.5 + 4.5) * 10) / 10,
  };


  const totalLessonsInCurriculum = subjects.reduce(
    (acc, curr) => acc + curr.lessonsCount,
    0
  );
  const completedCount = completedLessonIds.length;
  const overallPercentage = Math.round(
    (completedCount / Math.max(totalLessonsInCurriculum, 1)) * 100
  );

  // Collect all bookmarked lessons
  const bookmarkedLessons = useMemo(() => {
    const list: { lesson: Lesson; subject: Subject; unitTitle: string }[] = [];
    subjects.forEach((sub) => {
      (sub.units || []).forEach((unit) => {
        (unit.lessons || []).forEach((les) => {
          if (bookmarkedLessonIds.includes(les.id)) {
            list.push({ lesson: les, subject: sub, unitTitle: unit.title });
          }
        });
      });
    });
    return list;
  }, [subjects, bookmarkedLessonIds]);

  // Filter bookmarked lessons based on search query and subject filter
  const filteredBookmarks = useMemo(() => {
    return bookmarkedLessons.filter((item) => {
      const matchesSubject =
        selectedSubjectFilter === 'all' || item.subject.id === selectedSubjectFilter;
      const matchesSearch =
        !bookmarkSearch.trim() ||
        item.lesson.title.toLowerCase().includes(bookmarkSearch.toLowerCase()) ||
        item.lesson.summary.toLowerCase().includes(bookmarkSearch.toLowerCase()) ||
        item.subject.name.toLowerCase().includes(bookmarkSearch.toLowerCase());
      return matchesSubject && matchesSearch;
    });
  }, [bookmarkedLessons, selectedSubjectFilter, bookmarkSearch]);

  // Unique subjects that have bookmarks
  const subjectsWithBookmarks = useMemo(() => {
    const map = new Map<string, string>();
    bookmarkedLessons.forEach((item) => {
      map.set(item.subject.id, item.subject.name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [bookmarkedLessons]);

  const handleLessonOpen = (lesson: Lesson, subject: Subject) => {
    if (onSelectLesson) {
      onSelectLesson(lesson);
    } else {
      onSelectSubject(subject.id);
    }
  };

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
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#122846] to-[#0A1A2E] border-2 border-amber-400/60 text-slate-950 flex items-center justify-center text-3xl shrink-0 shadow-lg">
              {student.avatar}
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

          <div className="flex items-center gap-2.5 flex-wrap self-start md:self-auto">
            <button
              onClick={() => setIsAccountModalOpen(true)}
              className="bg-[#122846] hover:bg-[#1A3860] border border-[#21416E] hover:border-emerald-500/50 px-3.5 py-2.5 rounded-2xl flex items-center gap-2 text-xs text-slate-200 transition-all cursor-pointer shadow-sm"
              title="التبديل بين حسابات الطلاب أو إنشاء حساب جديد"
            >
              <Users className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold">{t('switchAccount')}</span>
            </button>

            <div className="bg-[#122846] border border-[#21416E] p-2.5 rounded-2xl flex items-center gap-2.5 text-xs">
              <div className="text-right">
                <div className="text-slate-400 text-[10px]">حالة الحساب</div>
                <div className="text-emerald-400 font-bold text-[11px]">نشط ومحفوظ</div>
              </div>
              <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>


        {/* 5 Metric KPI Cards */}
        <div className="mt-8 pt-6 border-t border-[#162D4A] grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
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
              <span>قائمة المتابعة</span>
              <Bookmark className="w-4 h-4 text-amber-400 fill-amber-400/30" />
            </div>
            <div className="text-2xl font-bold font-mono text-amber-300">
              {bookmarkedLessons.length} <span className="text-xs font-normal text-slate-400">درس</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">محفوظ للمراجعة</div>
          </div>

          <div className="bg-[#071526]/70 p-4 rounded-2xl border border-[#142A46] text-right col-span-2 sm:col-span-1">
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

      {/* Quick Feature Nav Cards: Leaderboard, Achievements & Study Rooms */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Leaderboard Card */}
        <div 
          onClick={() => onNavigate('leaderboard')}
          className="bg-gradient-to-r from-[#172314] via-[#0E243E] to-[#0B1E36] border border-amber-500/30 hover:border-amber-400 p-5 rounded-3xl shadow-lg transition-all cursor-pointer group text-right flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center text-xl group-hover:scale-105 transition-transform shadow-md shrink-0">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-white text-sm group-hover:text-amber-300 transition-colors">
                  {t('leaderboardTitle')}
                </h3>
                <span className="text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/30 px-1.5 py-0.2 rounded-full font-bold">
                  ترتيب
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-2">
                لوحة الشرف للطلاب الأكثر نشاطاً في المذاكرة
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center text-xs font-bold text-amber-400 bg-amber-500/10 p-2 rounded-xl group-hover:bg-amber-500 group-hover:text-slate-950 transition-all shrink-0">
            <ChevronLeft className="w-4 h-4" />
          </div>
        </div>

        {/* Achievements Card */}
        <div 
          onClick={() => onNavigate('achievements')}
          className="bg-gradient-to-r from-[#21162B] via-[#0E243E] to-[#0B1E36] border border-sky-500/30 hover:border-sky-400 p-5 rounded-3xl shadow-lg transition-all cursor-pointer group text-right flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/20 border border-sky-500/40 text-sky-300 flex items-center justify-center text-xl group-hover:scale-105 transition-transform shadow-md shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-white text-sm group-hover:text-sky-300 transition-colors">
                  {t('achievementsTitle')}
                </h3>
                <span className="text-[10px] bg-sky-400/20 text-sky-300 border border-sky-400/30 px-1.5 py-0.2 rounded-full font-bold">
                  أوسمة
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-2">
                الأوسمة الرقمية وشهادات التقدير المعتمدة
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center text-xs font-bold text-sky-400 bg-sky-500/10 p-2 rounded-xl group-hover:bg-sky-500 group-hover:text-slate-950 transition-all shrink-0">
            <ChevronLeft className="w-4 h-4" />
          </div>
        </div>

        {/* Study Rooms Card */}
        <div 
          onClick={() => onNavigate('study-rooms')}
          className="bg-gradient-to-r from-[#11243A] via-[#162E4D] to-[#0B1E36] border border-indigo-500/30 hover:border-indigo-400 p-5 rounded-3xl shadow-lg transition-all cursor-pointer group text-right flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 flex items-center justify-center text-xl group-hover:scale-105 transition-transform shadow-md shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-white text-sm group-hover:text-indigo-300 transition-colors">
                  غرف المذاكرة
                </h3>
                <span className="text-[10px] bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 px-1.5 py-0.2 rounded-full font-bold">
                  مباشر 🟢
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-2">
                غرف افتراضية لمناقشة الدروس مع زملائك
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center text-xs font-bold text-indigo-400 bg-indigo-500/10 p-2 rounded-xl group-hover:bg-indigo-500 group-hover:text-slate-950 transition-all shrink-0">
            <ChevronLeft className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Weekly Progress Chart */}
      <WeeklyProgressChart completedLessonCount={completedCount} />

      {/* Interactive Academic Calendar Component */}
      <InteractiveCalendar />

      {/* Study Reminder & Push Notification Scheduler Widget */}
      <StudyReminderWidget />

      {/* رؤى المذاكرة: التركيز + تقييماتي */}
      <StudyInsights />

      {/* جدولة اختبارات تجريبية أسبوعية → تُضاف للتقويم الدراسي */}
      <WeeklyExamPlanner />


      {/* Bookmarked / Saved for Later Lessons Section */}
      <section className="bg-white dark:bg-[#0D1F35] rounded-3xl border border-slate-200 dark:border-[#1C3A62] p-6 sm:p-8 space-y-6 text-right shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-[#1E3A60]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 dark:bg-amber-400/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
              <BookMarked className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  قائمة المتابعة لاحقاً (الدروس المحفوظة)
                </h2>
                <span className="bg-amber-100 dark:bg-amber-400/20 text-amber-800 dark:text-amber-300 text-xs font-bold px-2.5 py-0.5 rounded-full border border-amber-300 dark:border-amber-400/30">
                  {bookmarkedLessons.length} {bookmarkedLessons.length === 1 ? 'درس' : 'دروس'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                دروسك المميزة للرجوع السريع والمذاكرة المركزة قبل الامتحانات والتقييمات الشهرية
              </p>
            </div>
          </div>

          {bookmarkedLessons.length > 0 && (
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search Bar */}
              <div className="relative min-w-[200px] flex-1 sm:flex-initial">
                <input
                  type="text"
                  value={bookmarkSearch}
                  onChange={(e) => setBookmarkSearch(e.target.value)}
                  placeholder="بحث في الدروس المحفوظة..."
                  className="w-full pl-3 pr-9 py-2 text-xs bg-slate-50 dark:bg-[#122844] border border-slate-200 dark:border-[#22446E] rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
              </div>

              {/* Subject Filter dropdown */}
              {subjectsWithBookmarks.length > 1 && (
                <select
                  value={selectedSubjectFilter}
                  onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                  className="px-3 py-2 text-xs bg-slate-50 dark:bg-[#122844] border border-slate-200 dark:border-[#22446E] rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                >
                  <option value="all">كل المواد ({bookmarkedLessons.length})</option>
                  {subjectsWithBookmarks.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>

        {/* Bookmarked Lessons Grid or Empty State */}
        {bookmarkedLessons.length === 0 ? (
          <div className="py-12 text-center flex flex-col items-center justify-center space-y-4 bg-slate-50/60 dark:bg-[#10243E]/40 rounded-2xl border border-dashed border-slate-200 dark:border-[#1E3B64] p-6">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/10 dark:bg-amber-400/10 text-amber-500 flex items-center justify-center">
              <Bookmark className="w-8 h-8" />
            </div>
            <div className="space-y-1 max-w-md">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                لا توجد دروس في قائمة المتابعة حالياً
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                يمكنك حفظ أي درس للرجوع إليه لاحقاً بالنقر على زر <span className="font-semibold text-amber-600 dark:text-amber-400">"متابعة لاحقاً 🔖"</span> في صفحة الدرس أو بجوار قائمة دروس كل مادة.
              </p>
            </div>
            <button
              onClick={() => onNavigate('subjects')}
              className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-900 dark:bg-amber-400 text-white dark:text-slate-950 text-xs font-bold hover:bg-blue-800 dark:hover:bg-amber-300 transition-all cursor-pointer shadow-sm"
            >
              <BookOpen className="w-4 h-4" />
              <span>استعراض المقررات والدروس</span>
            </button>
          </div>
        ) : filteredBookmarks.length === 0 ? (
          <div className="py-8 text-center text-slate-500 dark:text-slate-400 text-xs bg-slate-50 dark:bg-[#122844] rounded-2xl border border-slate-200 dark:border-[#1E3B64]">
            لا توجد دروس مطابقة لبحثك "{bookmarkSearch}".
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBookmarks.map(({ lesson, subject, unitTitle }) => {
              const isDone = completedLessonIds.includes(lesson.id);
              return (
                <div
                  key={lesson.id}
                  className="group relative bg-slate-50/70 dark:bg-[#122744]/70 hover:bg-white dark:hover:bg-[#152e52] border border-slate-200 dark:border-[#1E3B64] hover:border-amber-400/50 dark:hover:border-amber-400/50 rounded-2xl p-5 transition-all duration-200 flex flex-col justify-between shadow-sm hover:shadow-md"
                >
                  <div>
                    {/* Header: Subject badge & bookmark removal */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-[#183457] text-blue-900 dark:text-amber-300 border border-blue-200 dark:border-[#22446E] shrink-0">
                          {subject.name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium truncate">
                          {unitTitle}
                        </span>
                      </div>

                      {onToggleBookmark && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleBookmark(lesson.id);
                          }}
                          className="p-2 min-h-[36px] min-w-[36px] grid place-items-center rounded-lg text-amber-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer shrink-0"
                          title="إزالة من قائمة المتابعة لاحقاً"
                          aria-label="إزالة من قائمة المتابعة"
                        >
                          <Bookmark className="w-4 h-4 fill-amber-500 text-amber-500" />
                        </button>
                      )}
                    </div>

                    {/* Lesson Title */}
                    <h4
                      onClick={() => handleLessonOpen(lesson, subject)}
                      className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors cursor-pointer line-clamp-2 mb-2 leading-snug"
                    >
                      الدرس {lesson.lessonNumber}: {lesson.title}
                    </h4>

                    {/* Lesson Summary */}
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed mb-4">
                      {lesson.summary}
                    </p>
                  </div>

                  <div>
                    {/* Meta details: time, attachments, completion */}
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 pt-3 border-t border-slate-200/60 dark:border-[#1E3B64] mb-4">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                        <span>{lesson.durationMinutes} دقيقة</span>
                      </span>

                      {lesson.attachments && lesson.attachments.length > 0 && (
                        <span className="flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-amber-500" />
                          <span>{lesson.attachments.length} مرفقات</span>
                        </span>
                      )}

                      <span className={`inline-flex items-center gap-1 font-semibold ${
                        isDone 
                          ? 'text-emerald-600 dark:text-emerald-400' 
                          : 'text-slate-500 dark:text-slate-400'
                      }`}>
                        {isDone ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            <span>مكتمل</span>
                          </>
                        ) : (
                          <span>قيد المذاكرة</span>
                        )}
                      </span>
                    </div>

                    {/* Action button */}
                    <button
                      onClick={() => handleLessonOpen(lesson, subject)}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-blue-900 dark:bg-amber-400 hover:bg-blue-800 dark:hover:bg-amber-300 text-white dark:text-slate-950 text-xs font-bold transition-all cursor-pointer shadow-sm"
                    >
                      <PlayCircle className="w-4 h-4" />
                      <span>فتح ومتابعة الدرس الآن</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

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
