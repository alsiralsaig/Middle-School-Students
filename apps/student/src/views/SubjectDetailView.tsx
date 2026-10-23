import React, { useState } from 'react';
import { Subject, Lesson } from '../types';
import { MediaAssetViewer } from '../components/MediaAssetViewer';
import { 
  ArrowRight, 
  BookOpen, 
  Clock, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  FileText, 
  Award,
  Sparkles,
  PlayCircle,
  Bookmark
} from 'lucide-react';

interface SubjectDetailViewProps {
  subject: Subject;
  completedLessonIds: string[];
  bookmarkedLessonIds?: string[];
  onToggleBookmark?: (lessonId: string) => void;
  onBack: () => void;
  onSelectLesson: (lesson: Lesson) => void;
}

export const SubjectDetailView: React.FC<SubjectDetailViewProps> = ({
  subject,
  completedLessonIds,
  bookmarkedLessonIds = [],
  onToggleBookmark,
  onBack,
  onSelectLesson,
}) => {
  const [expandedUnits, setExpandedUnits] = useState<Record<string, boolean>>({
    [subject.units[0]?.id || '']: true,
  });

  const toggleUnit = (unitId: string) => {
    setExpandedUnits((prev) => ({
      ...prev,
      [unitId]: !prev[unitId],
    }));
  };

  const isLessonCompleted = (lessonId: string) =>
    completedLessonIds.includes(lessonId);

  return (
    <div className="space-y-8">
      {/* Breadcrumb and Back Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 hover:text-blue-900 dark:hover:text-amber-300 bg-white dark:bg-[#0D1F35] px-4 py-2 rounded-xl border border-slate-200 dark:border-[#1C3A62] shadow-sm transition-colors cursor-pointer"
        >
          <ArrowRight className="w-4 h-4" />
          <span>الرجوع إلى قائمة المواد</span>
        </button>

        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
          <span>المواد الدراسية</span>
          <span aria-hidden="true">/</span>
          <span className="text-slate-900 dark:text-white font-bold">{subject.name}</span>
        </div>
      </div>

      {/* Subject Header Banner */}
      <div className="bg-[#0B1E36] text-white rounded-3xl p-6 sm:p-10 border border-[#193557] shadow-lg relative overflow-hidden">
        <div className="relative z-10 space-y-4 max-w-3xl text-right">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[#142D4F] border border-[#234676] text-amber-300 text-xs font-semibold">
            <Award className="w-4 h-4 text-amber-400" />
            <span>{subject.curriculumRef}</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            مادة {subject.name} ({subject.nameEn})
          </h1>

          <p className="text-sm text-slate-300 leading-relaxed">
            {subject.description}
          </p>

          {/* Clean metadata strip */}
          <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-slate-300 font-medium">
            <span className="bg-[#122846] px-3 py-1.5 rounded-lg border border-[#20406C]">
              {subject.unitsCount} وحدات دراسية
            </span>
            <span className="bg-[#122846] px-3 py-1.5 rounded-lg border border-[#20406C]">
              {subject.lessonsCount} درساً في المنهج
            </span>
            <span className="bg-[#122846] px-3 py-1.5 rounded-lg border border-[#20406C] text-amber-300">
              الصف الثالث المتوسط
            </span>
          </div>
        </div>
      </div>

      {!!subject.mediaAssets?.length&&<section className="rounded-2xl border border-slate-200 dark:border-[#1C3A62] bg-white dark:bg-[#0D1F35] p-5"><h2 className="text-sm font-bold mb-3">وسائط المادة</h2><MediaAssetViewer assets={subject.mediaAssets}/></section>}
      {/* Units & Lessons Accordion List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white text-right">
            فهرس الوحدات والدروس المقررة
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            اضغط على الوحدة لعرض دروسها
          </span>
        </div>

        {subject.units.map((unit) => {
          const isExpanded = !!expandedUnits[unit.id];
          const unitCompletedCount = unit.lessons.filter((l) =>
            isLessonCompleted(l.id)
          ).length;

          return (
            <div
              key={unit.id}
              className="bg-white dark:bg-[#0D1F35] rounded-2xl border border-slate-200 dark:border-[#1C3A62] overflow-hidden shadow-sm transition-all"
            >
              {/* Unit Header Bar */}
              <button
                onClick={() => toggleUnit(unit.id)}
                className="w-full p-5 sm:p-6 text-right flex items-center justify-between gap-4 hover:bg-slate-50/80 dark:hover:bg-[#122844] transition-colors cursor-pointer"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-900 dark:text-amber-300">
                      الوحدة {unit.unitNumber}
                    </span>
                    <span className="text-slate-300 dark:text-slate-600">·</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {unit.lessons.length} دروس
                    </span>
                    {unitCompletedCount > 0 && (
                      <span className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold mr-2">
                        (أُنجز {unitCompletedCount} من {unit.lessons.length})
                      </span>
                    )}
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    {unit.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-1">
                    {unit.description}
                  </p>
                </div>

                <div className="p-2 rounded-xl bg-slate-100 dark:bg-[#142A46] text-slate-700 dark:text-slate-200 shrink-0">
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </div>
              </button>

              {/* Lessons List in Unit */}
              {isExpanded && (
                <div className="border-t border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50/30 dark:bg-[#091524]">
                  {!!unit.mediaAssets?.length&&<div className="p-4 border-b border-slate-100 dark:border-slate-800"><h4 className="text-xs font-bold mb-2">وسائط الوحدة</h4><MediaAssetViewer assets={unit.mediaAssets}/></div>}
                  {unit.lessons.map((lesson) => {
                    const completed = isLessonCompleted(lesson.id);
                    return (
                      <div
                        key={lesson.id}
                        onClick={() => onSelectLesson(lesson)}
                        className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white dark:hover:bg-[#0E223D] transition-colors cursor-pointer group text-right"
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-mono font-bold text-slate-400 dark:text-slate-400">
                              درس {lesson.lessonNumber}
                            </span>
                            <span className="text-slate-300 dark:text-slate-600">·</span>
                            <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{lesson.durationMinutes} دقيقة</span>
                            </span>
                            {completed && (
                              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold mr-2">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>تمت دراسته</span>
                              </span>
                            )}
                          </div>

                          <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-900 dark:group-hover:text-amber-300 transition-colors">
                            {lesson.title}
                          </h4>

                          <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                            {lesson.summary}
                          </p>

                          <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                            <span>{lesson.sections.length} محاور شرح</span>
                            <span>·</span>
                            <span>{lesson.attachments.length} مرفقات PDF</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 sm:self-center shrink-0">
                          {onToggleBookmark && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleBookmark(lesson.id);
                              }}
                              className={`p-2.5 rounded-xl border transition-all cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center ${
                                bookmarkedLessonIds.includes(lesson.id)
                                  ? 'bg-amber-400 text-slate-950 border-amber-500 hover:bg-amber-300'
                                  : 'bg-white dark:bg-[#122844] text-slate-400 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 border-slate-200 dark:border-[#1E3A60]'
                              }`}
                              title={
                                bookmarkedLessonIds.includes(lesson.id)
                                  ? 'إزالة من قائمة المتابعة لاحقاً'
                                  : 'حفظ في قائمة المتابعة لاحقاً'
                              }
                              aria-label={
                                bookmarkedLessonIds.includes(lesson.id)
                                  ? 'إزالة من قائمة المتابعة'
                                  : 'حفظ للمتابعة لاحقاً'
                              }
                            >
                              <Bookmark
                                className={`w-4 h-4 ${
                                  bookmarkedLessonIds.includes(lesson.id)
                                    ? 'fill-current text-slate-950'
                                    : ''
                                }`}
                              />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectLesson(lesson);
                            }}
                            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer shadow-sm"
                          >
                            <PlayCircle className="w-4 h-4 text-amber-300" />
                            <span>فتح الدرس والشرح</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
