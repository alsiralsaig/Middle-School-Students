import React, { useState, useMemo } from 'react';
import { Subject, SubjectCategory } from '../types';
import { SubjectCard } from '../components/SubjectCard';
import { Search, BookOpen, Layers, Info, X, Sparkles, Filter } from 'lucide-react';

interface SubjectsViewProps {
  subjects: Subject[];
  completedLessonIds: string[];
  onSelectSubject: (subjectId: string) => void;
}

// Normalize Arabic characters and diacritics for flexible search
const normalizeArabicText = (text: string): string => {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F\u0670]/g, '') // remove Arabic tashkeel & harakat
    .replace(/\s+/g, ' ');
};

export const SubjectsView: React.FC<SubjectsViewProps> = ({
  subjects,
  completedLessonIds,
  onSelectSubject,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<SubjectCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filterTabs: { key: SubjectCategory; label: string }[] = [
    { key: 'all', label: 'جميع المواد' },
    { key: 'core', label: 'المواد الأساسية' },
    { key: 'science', label: 'المواد العلمية والرياضيات' },
    { key: 'humanities', label: 'اللغات والعلوم الإنسانية' },
    { key: 'tech', label: 'التكنولوجيا والحاسوب' },
  ];

  // Quick subject search chips for 1-tap filtering on mobile
  const quickSearchChips = [
    'الرياضيات',
    'العلوم',
    'اللغة العربية',
    'التربية الإسلامية',
    'الدراسات الاجتماعية',
    'اللغة الإنجليزية',
    'تكنولوجيا المعلومات',
    'التربية الوطنية',
  ];

  const normalizedQuery = useMemo(() => normalizeArabicText(searchQuery), [searchQuery]);

  const filteredSubjects = useMemo(() => {
    return subjects.filter((subject) => {
      const matchesCategory =
        selectedCategory === 'all' || subject.category === selectedCategory;

      if (!normalizedQuery) {
        return matchesCategory;
      }

      // Check subject name and English title
      const normName = normalizeArabicText(subject.name);
      const normNameEn = normalizeArabicText(subject.nameEn);
      const normDesc = normalizeArabicText(subject.description);
      const normCode = normalizeArabicText(subject.code);

      // Deep search into units and lesson titles for comprehensive searchability
      const hasMatchingLessonOrUnit = subject.units.some((unit) => {
        if (normalizeArabicText(unit.title).includes(normalizedQuery)) return true;
        return unit.lessons.some((lesson) =>
          normalizeArabicText(lesson.title).includes(normalizedQuery) ||
          normalizeArabicText(lesson.summary).includes(normalizedQuery)
        );
      });

      const matchesSearch =
        normName.includes(normalizedQuery) ||
        normNameEn.includes(normalizedQuery) ||
        normDesc.includes(normalizedQuery) ||
        normCode.includes(normalizedQuery) ||
        hasMatchingLessonOrUnit;

      return matchesCategory && matchesSearch;
    });
  }, [subjects, selectedCategory, normalizedQuery]);

  // If search returns 0 results within a sub-category, check if results exist in 'all'
  const countInAllCategories = useMemo(() => {
    if (!normalizedQuery || selectedCategory === 'all') return 0;
    return subjects.filter((subject) => {
      const normName = normalizeArabicText(subject.name);
      const normNameEn = normalizeArabicText(subject.nameEn);
      const normDesc = normalizeArabicText(subject.description);
      const normCode = normalizeArabicText(subject.code);
      const hasMatchingLessonOrUnit = subject.units.some((unit) => {
        if (normalizeArabicText(unit.title).includes(normalizedQuery)) return true;
        return unit.lessons.some((lesson) =>
          normalizeArabicText(lesson.title).includes(normalizedQuery)
        );
      });
      return (
        normName.includes(normalizedQuery) ||
        normNameEn.includes(normalizedQuery) ||
        normDesc.includes(normalizedQuery) ||
        normCode.includes(normalizedQuery) ||
        hasMatchingLessonOrUnit
      );
    }).length;
  }, [subjects, selectedCategory, normalizedQuery]);

  const countSubjectCompleted = (subjectId: string) => {
    return completedLessonIds.filter((id) => id.startsWith(subjectId)).length;
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  const handleChipClick = (chip: string) => {
    if (searchQuery === chip) {
      setSearchQuery('');
    } else {
      setSearchQuery(chip);
      // If currently filtered to a non-matching category, reset to 'all' so student sees the subject
      setSelectedCategory('all');
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="bg-white dark:bg-[#0D1F35] rounded-3xl border border-slate-200 dark:border-[#1C3A62] p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="text-right space-y-2">
            <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 font-semibold">
              <Layers className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>مقررات الصف الثالث المتوسط - المنهج السوداني</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              المواد الدراسية والوحدات التعليمية
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
              ابحث عن أي مادة دراسية بالاسم، وتصفح الوحدات والدروس المقررة لامتحان الشهادة المتوسطة والشروحات المدعومة بالأمثلة وأوراق العمل.
            </p>
          </div>

          {/* Quick Curriculum Badge */}
          <div className="bg-slate-50 dark:bg-[#122844] border border-slate-200 dark:border-[#1E3A60] rounded-2xl p-4 flex items-center gap-3 self-start md:self-auto shrink-0">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-amber-400/20 text-blue-900 dark:text-amber-300 flex items-center justify-center font-bold">
              8
            </div>
            <div className="text-right text-xs">
              <div className="font-bold text-slate-900 dark:text-white">مواد معتمدة بالكامل</div>
              <div className="text-slate-500 dark:text-slate-400">جاهزة للشرح والمراجعة</div>
            </div>
          </div>
        </div>

        {/* Filter and Search Controls */}
        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            {/* Functional Category Filter Segmented Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-[#142A46] rounded-xl overflow-x-auto">
              {filterTabs.map((tab) => {
                const isActive = selectedCategory === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setSelectedCategory(tab.key)}
                    className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-white dark:bg-[#1F3E68] text-slate-900 dark:text-white shadow-sm font-bold'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Enhanced Search Box with Live Clear Button */}
            <div className="relative min-w-[280px] sm:min-w-[320px]">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث باسم المادة (مثال: رياضيات، علوم، عربية)..."
                className="w-full bg-slate-50 dark:bg-[#11243C] border border-slate-200 dark:border-[#1E3A60] rounded-xl py-2.5 pr-10 pl-10 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-900 dark:focus:border-amber-400 focus:bg-white dark:focus:bg-[#0E2036] transition-all"
                aria-label="البحث في قائمة المواد"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  title="مسح البحث"
                  aria-label="مسح نص البحث"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Quick Search Chips / Shortcuts */}
          <div className="pt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1 text-[11px] font-bold text-slate-400 dark:text-slate-400 pl-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>بحث سريع:</span>
            </span>
            {quickSearchChips.map((chip) => {
              const isSelected = searchQuery === chip;
              return (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleChipClick(chip)}
                  className={`px-3 py-2 min-h-[32px] inline-flex items-center rounded-lg text-[11px] transition-all cursor-pointer font-medium ${
                    isSelected
                      ? 'bg-amber-400 text-slate-950 font-bold shadow-xs'
                      : 'bg-slate-100 dark:bg-[#122844] hover:bg-slate-200 dark:hover:bg-[#1A375E] text-slate-700 dark:text-slate-300 border border-slate-200/70 dark:border-[#1E3A60]'
                  }`}
                >
                  {chip}
                </button>
              );
            })}
          </div>

          {/* Active Search Results Feedback Banner */}
          {searchQuery && (
            <div className="pt-2 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-[#0B1B30] p-3 rounded-xl border border-slate-200 dark:border-[#1C3A62]">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900 dark:text-white">
                  نتائج البحث عن: <span className="text-blue-900 dark:text-amber-400">"{searchQuery}"</span>
                </span>
                <span className="text-slate-400">·</span>
                <span>
                  تم العثور على {filteredSubjects.length} من {subjects.length} مادة
                </span>
              </div>
              <button
                type="button"
                onClick={handleClearSearch}
                className="text-xs font-semibold text-blue-900 dark:text-amber-400 hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>إلغاء التصفية</span>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Curriculum Verification Notice */}
      <div className="bg-amber-50/70 dark:bg-[#152B4A] border border-amber-200/80 dark:border-amber-400/30 rounded-2xl p-4 flex items-start gap-3 text-right">
        <Info className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 dark:text-amber-200 space-y-1">
          <span className="font-bold">منهجك الدراسي:</span>
          <p className="text-amber-800 dark:text-slate-300 leading-relaxed">
            كل المواد والوحدات والدروس مرتّبة حسب منهج الشهادة المتوسطة السودانية. افتح المادة اللي عايز تذاكرها، وابدأ بالدرس ثم حل أسئلته.
          </p>
        </div>
      </div>

      {/* Subject Cards Grid / Empty States */}
      {filteredSubjects.length === 0 ? (
        <div className="bg-white dark:bg-[#0D1F35] rounded-3xl border border-slate-200 dark:border-[#1C3A62] p-12 text-center space-y-4">
          <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
          <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white">
            لا توجد مادة تطابق بحثك: "{searchQuery}"
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            لم نجد نتائج مطابقة في هذا التصنيف. يمكنك التحقق من صحة الكلمة أو توسيع نطاق البحث ليشمل كافة المواد المقررة.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {countInAllCategories > 0 && selectedCategory !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition-all cursor-pointer shadow-sm"
              >
                البحث في جميع المواد ({countInAllCategories} نتيجة متوفرة)
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="px-4 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              إلغاء البحث وإظهار كافة المواد
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 sm:gap-5">
          {filteredSubjects.map((subject) => (
            <SubjectCard
              key={subject.id}
              subject={subject}
              completedLessonsCount={countSubjectCompleted(subject.id)}
              onSelect={onSelectSubject}
            />
          ))}
        </div>
      )}
    </div>
  );
};

