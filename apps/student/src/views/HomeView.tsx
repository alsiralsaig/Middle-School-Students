import React, { useState } from 'react';
import { Subject, ResourceItem, ViewMode } from '../types';
import { SubjectCard } from '../components/SubjectCard';
import { 
  BookOpen, 
  Search, 
  FileText, 
  CheckSquare, 
  Sparkles, 
  Award, 
  ArrowLeft,
  ChevronLeft,
  Calendar,
  Flame,
  Download
} from 'lucide-react';

interface HomeViewProps {
  subjects: Subject[];
  resources: ResourceItem[];
  completedLessonIds: string[];
  onNavigate: (view: ViewMode) => void;
  onSelectSubject: (subjectId: string) => void;
  onSelectResource: (resourceId: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  subjects,
  resources,
  completedLessonIds,
  onNavigate,
  onSelectSubject,
  onSelectResource,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSubjects = searchQuery.trim()
    ? subjects.filter(
        (s) =>
          s.name.includes(searchQuery) ||
          s.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.description.includes(searchQuery)
      )
    : subjects;

  const countSubjectCompleted = (subjectId: string) => {
    return completedLessonIds.filter((id) => id.startsWith(subjectId)).length;
  };

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-[#0B1E36] text-white border border-[#1B365D] shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B1E36] via-[#0B1E36]/90 to-transparent z-10" />
        
        <div className="relative z-20 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center p-6 sm:p-10 lg:p-12">
          {/* Text Content: 7 cols */}
          <div className="lg:col-span-7 space-y-6 text-right">
            {/* Editorial kicker */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#142A4A] border border-[#234575] text-amber-300 text-xs font-semibold">
              <Award className="w-4 h-4 text-amber-400" />
              <span>المنهج السوداني القومي الموحد للمرحلة المتوسطة</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight tracking-tight">
              منصة الطالب السوداني الذكية
              <span className="block text-amber-400 text-2xl sm:text-3xl mt-2 font-bold">
                الصف الثالث المتوسط (الشهادة المتوسطة)
              </span>
            </h1>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-xl">
              منصتك الأولى لمراجعة مقررات الشهادة المتوسطة في السودان: شروحات مبسطة، مذكرات تلخيص شاملة، أوراق عمل، ونماذج امتحانات من مختلف الولايات لمساعدتك على التفوق.
            </p>

            {/* Search Input Bar */}
            <div className="relative max-w-lg">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن مادة، درس، أو قاعدة (مثال: فيثاغورس، الممنوع من الصرف)..."
                className="w-full bg-[#132846] border border-[#274B7E] rounded-xl py-3.5 pr-11 pl-4 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all"
              />
              <Search className="w-5 h-5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            </div>

            {/* Quick Action CTAs */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => onNavigate('subjects')}
                className="px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm flex items-center gap-2 shadow-lg transition-transform active:scale-95 cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />
                <span>تصفح المواد والدروس</span>
              </button>

              <button
                onClick={() => onNavigate('resources')}
                className="px-5 py-3 rounded-xl bg-[#173155] hover:bg-[#20406D] text-white font-medium text-sm border border-[#2B4E80] flex items-center gap-2 transition-colors cursor-pointer"
              >
                <FileText className="w-4 h-4 text-amber-400" />
                <span>بنك المذكرات والملخصات</span>
              </button>

              <button
                onClick={() => onNavigate('exams')}
                className="px-5 py-3 rounded-xl bg-[#173155] hover:bg-[#20406D] text-white font-medium text-sm border border-[#2B4E80] flex items-center gap-2 transition-colors cursor-pointer"
              >
                <CheckSquare className="w-4 h-4 text-amber-400" />
                <span>امتحانات سابقة</span>
              </button>
            </div>
          </div>

          {/* Hero Visual Image: 5 cols */}
          <div className="lg:col-span-5 relative">
            <div className="rounded-2xl overflow-hidden border-2 border-amber-400/30 shadow-2xl bg-[#0D213B]">
              <img
                src="/src/assets/images/hero_sudanese_education_1792071283906.jpg"
                alt="طلاب سودانيون يدرسون المنهج القومي للصف الثالث المتوسط"
                referrerPolicy="no-referrer"
                className="w-full h-auto object-cover max-h-[380px]"
              />
            </div>
            {/* Quick Motivation Card */}
            <div className="absolute -bottom-4 -right-4 bg-white dark:bg-[#0D1F35] text-slate-900 dark:text-white p-3.5 rounded-xl border border-slate-200 dark:border-[#1C3A62] shadow-xl hidden sm:flex items-center gap-3 max-w-xs">
              <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Flame className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-slate-900 dark:text-white">شعار طلاب السودان</div>
                <div className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">العلم سلاح الأمل ومستقبل الوطن</div>
              </div>
            </div>
          </div>
        </div>

        {/* Four-item feature bar strip */}
        <div className="relative z-20 border-t border-[#162E50] bg-[#071526]/80 px-6 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-slate-300">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>8 مواد دراسية معتمدة</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>أكثر من 100 درس ووحدة مفصلة</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            <span>مذكرات وأوراق عمل PDF جاهزة</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            <span>نماذج امتحانات الولايات السابقة</span>
          </div>
        </div>
      </section>

      {/* Subjects Grid Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="text-right">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              المواد الدراسية المقررة
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
              <span>وفق وثيقة المنهج السوداني القومي</span>
              <span aria-hidden="true">·</span>
              <span>الصف الثالث المتوسط</span>
            </div>
          </div>
          <button
            onClick={() => onNavigate('subjects')}
            className="text-xs font-bold text-blue-900 dark:text-amber-400 hover:text-blue-700 dark:hover:text-amber-300 flex items-center gap-1 cursor-pointer"
          >
            <span>عرض كافة المواد</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>

        {filteredSubjects.length === 0 ? (
          <div className="bg-white dark:bg-[#0D1F35] rounded-2xl border border-slate-200 dark:border-[#1C3A62] p-8 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">لا توجد مادة تطابق بحثك: "{searchQuery}"</p>
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs font-semibold text-blue-800 dark:text-amber-400 underline cursor-pointer"
            >
              إلغاء البحث وإظهار كافة المواد
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {filteredSubjects.slice(0, 8).map((subject) => (
              <SubjectCard
                key={subject.id}
                subject={subject}
                completedLessonsCount={countSubjectCompleted(subject.id)}
                onSelect={onSelectSubject}
              />
            ))}
          </div>
        )}
      </section>

      {/* Featured Resources Section */}
      <section className="bg-white dark:bg-[#0D1F35] rounded-3xl border border-slate-200 dark:border-[#1C3A62] p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-right">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              مكتبة المذكرات والملخصات المعتمدة
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              مذكرات تلخيصية ونماذج إجابات معدة بواسطة نخبة من كبار معلمي وموجهي المرحلة المتوسطة في السودان
            </p>
          </div>
          <button
            onClick={() => onNavigate('resources')}
            className="text-xs font-bold px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#142A46] hover:bg-slate-200 dark:hover:bg-[#1C3960] text-slate-800 dark:text-slate-200 transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <span>تصفح كل المذكرات</span>
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {resources.slice(0, 3).map((res) => (
            <div
              key={res.id}
              onClick={() => onSelectResource(res.id)}
              className="p-5 rounded-2xl border border-slate-200 dark:border-[#1C3A62] hover:border-slate-300 dark:hover:border-amber-400/40 bg-slate-50/50 dark:bg-[#122844]/60 hover:bg-white dark:hover:bg-[#163359] transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2 font-medium">
                  <span className="text-blue-900 dark:text-amber-400 font-bold">{res.subjectName}</span>
                  <span>{res.fileSize}</span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-900 dark:group-hover:text-amber-300 transition-colors mb-2 leading-snug">
                  {res.title}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed mb-4">
                  {res.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium">{res.pageCount} صفحة</span>
                <span className="text-blue-700 dark:text-amber-400 font-semibold group-hover:text-blue-900 dark:group-hover:text-amber-300 flex items-center gap-1">
                  <Download className="w-3.5 h-3.5" />
                  <span>معاينة وتنزيل</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* AI Assistant Prototype Spotlight Banner */}
      <section className="bg-gradient-to-r from-[#0F2847] to-[#183B68] rounded-3xl p-6 sm:p-8 text-white border border-[#27497A] shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-3 text-right max-w-2xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#23487A] text-amber-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>المساعد الدراسي الاسترشادي</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-white">
            هل تواجه صعوبة في فهم مسألة أو قاعدة نحوية؟
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            استعرض واجهة المساعد الذكي التفاعلية المصممة لمساعدة طلاب الصف الثالث المتوسط في شرح خطوات الرياضيات، قواعد النحو، وأحداث التاريخ السوداني عبر أسئلة استرشادية جاهزة.
          </p>
        </div>
        <button
          onClick={() => onNavigate('ai-assistant')}
          className="px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm shrink-0 flex items-center gap-2 shadow-md transition-transform active:scale-95 cursor-pointer"
        >
          <span>جرب المساعد الدراسي</span>
          <ChevronLeft className="w-4 h-4" />
        </button>
      </section>
    </div>
  );
};
