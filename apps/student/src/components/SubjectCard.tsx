import React from 'react';
import { Subject } from '../types';
import { CheckCircle2 } from 'lucide-react';
import { subjectVisual } from '../utils/subjectVisuals';

interface SubjectCardProps {
  subject: Subject;
  completedLessonsCount: number;
  onSelect: (subjectId: string) => void;
}

/**
 * مربع المادة — بنفس نظام تطبيق الثانوي: إيموجي كبير + اسم المادة،
 * ومربّعان في الصف على الهاتف حتى تكون الأيقونات كبيرة وواضحة.
 */
export const SubjectCard: React.FC<SubjectCardProps> = ({
  subject,
  completedLessonsCount,
  onSelect,
}) => {
  const visual = subjectVisual(subject.id, subject.name);
  const percent = Math.min(
    100,
    Math.round((completedLessonsCount / Math.max(subject.lessonsCount, 1)) * 100),
  );

  return (
    <button
      type="button"
      onClick={() => onSelect(subject.id)}
      className="group relative flex min-h-[132px] flex-col items-center justify-center gap-2 overflow-hidden rounded-3xl border bg-white p-4 text-center shadow-sm transition-transform active:scale-[0.98] dark:bg-[#0F2742]"
      style={{ borderColor: `${visual.accent}55` }}
      aria-label={`فتح مادة ${subject.name}`}
    >
      {/* توهّج خفيف بلون المادة */}
      <span
        className="pointer-events-none absolute inset-0 opacity-60 dark:opacity-100"
        style={{ background: `radial-gradient(circle at 50% 0%, ${visual.accentSoft} 0%, transparent 70%)` }}
        aria-hidden="true"
      />

      <span className="relative text-[40px] leading-none drop-shadow-sm">{visual.emoji}</span>

      <h3 className="relative text-[13.5px] font-black leading-tight text-slate-900 dark:text-white">
        {subject.name}
      </h3>

      <span className="relative flex items-center gap-1 text-[10.5px] font-bold text-slate-500 dark:text-slate-300">
        <CheckCircle2 className="h-3 w-3" style={{ color: visual.accent }} />
        {completedLessonsCount} من {subject.lessonsCount} درس
      </span>

      {/* شريط تقدّم رقيق أسفل المربع */}
      <span className="absolute inset-x-0 bottom-0 h-1 bg-slate-100 dark:bg-[#0B1E36]" aria-hidden="true">
        <span
          className="block h-full transition-all duration-300"
          style={{ width: `${percent}%`, backgroundColor: visual.accent }}
        />
      </span>
    </button>
  );
};

export default SubjectCard;
