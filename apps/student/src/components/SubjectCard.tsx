import React from 'react';
import { Subject } from '../types';
import { 
  Calculator, 
  FlaskConical, 
  BookOpen, 
  Moon, 
  Globe2, 
  Languages, 
  Cpu, 
  Scale, 
  ChevronLeft,
  CheckCircle2
} from 'lucide-react';

interface SubjectCardProps {
  subject: Subject;
  completedLessonsCount: number;
  onSelect: (subjectId: string) => void;
}

export const SubjectCard: React.FC<SubjectCardProps> = ({
  subject,
  completedLessonsCount,
  onSelect,
}) => {
  const getSubjectIcon = (id: string) => {
    switch (id) {
      case 'math':
        return <Calculator className="w-6 h-6 text-blue-700" />;
      case 'science':
        return <FlaskConical className="w-6 h-6 text-emerald-700" />;
      case 'arabic':
        return <BookOpen className="w-6 h-6 text-amber-700" />;
      case 'islamic':
        return <Moon className="w-6 h-6 text-teal-700" />;
      case 'social':
        return <Globe2 className="w-6 h-6 text-orange-700" />;
      case 'english':
        return <Languages className="w-6 h-6 text-indigo-700" />;
      case 'ict':
        return <Cpu className="w-6 h-6 text-cyan-700" />;
      case 'civics':
        return <Scale className="w-6 h-6 text-rose-700" />;
      default:
        return <BookOpen className="w-6 h-6 text-slate-700" />;
    }
  };

  const progressPercent = Math.min(
    100,
    Math.round((completedLessonsCount / Math.max(subject.lessonsCount, 1)) * 100)
  );

  return (
    <div
      onClick={() => onSelect(subject.id)}
      className="bg-white dark:bg-[#0D1F35] rounded-2xl border border-slate-200 dark:border-[#1C3A62] hover:border-slate-300 dark:hover:border-amber-400/40 p-5 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between group text-right"
    >
      <div>
        {/* Header Row: Icon & Category Indicator */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#122844] border border-slate-100 dark:border-[#1E3A60] group-hover:scale-105 transition-transform shrink-0">
            {getSubjectIcon(subject.id)}
          </div>
          <div className="text-left">
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-400 font-mono tracking-wider">
              {subject.code}
            </span>
          </div>
        </div>

        {/* Title and English Name */}
        <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-900 dark:group-hover:text-amber-300 transition-colors">
          {subject.name}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 font-medium">
          {subject.nameEn}
        </p>

        {/* Description */}
        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed mb-4">
          {subject.description}
        </p>

        {/* Clean Unboxed Metadata with Dot Separators */}
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-4 font-medium">
          <span>{subject.unitsCount} وحدات</span>
          <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">·</span>
          <span>{subject.lessonsCount} درساً مقرراً</span>
          <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">·</span>
          <span className="text-amber-700 dark:text-amber-400 font-semibold">منهج 2026</span>
        </div>
      </div>

      <div>
        {/* Progress bar */}
        <div className="mb-4 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 mb-1.5 font-medium">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>الإنجاز</span>
            </span>
            <span className="font-mono tabular-nums text-slate-700 dark:text-slate-200 font-semibold">
              {completedLessonsCount} من {subject.lessonsCount} درس
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Action Button */}
        <div className="w-full py-2.5 px-4 rounded-xl bg-slate-50 dark:bg-[#122844] group-hover:bg-[#0B1E36] dark:group-hover:bg-[#193A64] group-hover:text-white text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center justify-between transition-colors">
          <span>تصفح الدروس والوحدات</span>
          <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
        </div>
      </div>
    </div>
  );
};
