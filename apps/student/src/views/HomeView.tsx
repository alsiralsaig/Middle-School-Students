import React from 'react';
import { Subject, ViewMode } from '../types';
import { SubjectCard } from '../components/SubjectCard';

interface HomeViewProps {
  subjects: Subject[];
  completedLessonIds: string[];
  onNavigate: (view: ViewMode) => void;
  onSelectSubject: (subjectId: string) => void;
  isGuest?: boolean;
  onOpenAuth?: () => void;
}

/**
 * الصفحة الرئيسية = **قائمة المقررات فقط**.
 *
 * القرار (بطلب صاحب المنصة): حُذف كل ما كان فوق المقررات — البانر الترحيبي،
 * شريط الإحصاءات، صندوق البحث، أزرار «تصفح المواد» و«بنك المذكرات»،
 * وقسم المذكرات المميّزة، وبانر المساعد. الطالب يفتح التطبيق فيدخل على
 * المقررات مباشرة، والصفحة تنتهي بآخر مقرر. كل الوظائف الأخرى موجودة في
 * شريط التنقّل السفلي أصلاً، فلا داعي لتكرارها هنا.
 */
export const HomeView: React.FC<HomeViewProps> = ({
  subjects,
  completedLessonIds,
  onSelectSubject,
  isGuest = false,
  onOpenAuth,
}) => {
  /**
   * نستبعد أي مادة ليست مقرّرة على هذا الصف (مثل «التربية الوطنية» التي
   * تنبيهها يقول إن كتابها للصف الثاني)، حتى لا يظهر للطالب منهج ليس منه.
   */
  const visibleSubjects = subjects.filter((s) => !s.gradeWarning);

  const countSubjectCompleted = (subjectId: string) => {
    const prefix = `${subjectId}`;
    return completedLessonIds.filter((id) => id === prefix || id.startsWith(`${prefix}-`) || id.startsWith(prefix)).length;
  };

  return (
    <div className="space-y-4">
      <div className="px-1 text-right">
        <h1 className="text-[17px] font-black text-[var(--ssp-text)]">المقررات الدراسية</h1>
        <p className="mt-1 text-[11px] font-semibold text-[var(--ssp-muted)]">
          وفق وثيقة المنهج السوداني القومي · الصف الثالث المتوسط
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 sm:gap-5">
        {visibleSubjects.map((subject) => (
          <SubjectCard
            key={subject.id}
            subject={subject}
            completedLessonsCount={countSubjectCompleted(subject.id)}
            onSelect={onSelectSubject}
          />
        ))}
      </div>
    </div>
  );
};

export default HomeView;
