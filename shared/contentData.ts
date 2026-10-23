/**
 * بيانات المنهج المضمَّنة في التطبيق — ملف **منفصل** عن `curriculum.ts`
 * حتى يُحمَّل فقط عند الحاجة (أول زيارة دون اتصال بالخادم).
 *
 * قبل هذا الفصل كان استيراد `@shared/curriculum` يسحب ٥٨٠ كيلوبايت من JSON
 * إلى الحزمة الأساسية، فتصبح الصفحة الأولى ١.٤ ميجابايت.
 */
import type { Lesson, Subject } from './curriculumTypes';

import mathContent from './content/math.json';
import scienceContent from './content/science.json';
import arabicContent from './content/arabic.json';
import islamicContent from './content/islamic.json';
import socialContent from './content/social.json';
import englishContent from './content/english.json';
import ictContent from './content/ict.json';
import civicsContent from './content/civics.json';
import technicalContent from './content/technical.json';

const CONTENT_FILES = [
  mathContent,
  scienceContent,
  arabicContent,
  islamicContent,
  socialContent,
  englishContent,
  ictContent,
  civicsContent,
  technicalContent,
];

export const SUBJECTS_DATA: Subject[] = CONTENT_FILES.map((raw) => {
  const c = raw as unknown as Subject;
  return {
    ...c,
    units: (c.units || []).map((u) => ({
      ...u,
      subjectId: c.id,
      lessons: (u.lessons || []).map((l) => ({ ...l, subjectId: c.id, unitId: u.id })),
    })),
  };
});

export interface FlatLesson extends Lesson {
  subjectName: string;
  subjectCode: string;
  unitTitle: string;
  unitNumber: number;
}

/** كل الدروس مسطّحة مع اسم المادة والوحدة — للبحث وجداول الإدارة */
export const allLessons = (): FlatLesson[] =>
  SUBJECTS_DATA.flatMap((s) =>
    s.units.flatMap((u) =>
      u.lessons.map((l) => ({
        ...l,
        subjectName: s.name,
        subjectCode: s.code,
        unitTitle: u.title,
        unitNumber: u.unitNumber,
      })),
    ),
  );

export const subjectNameById = (id: string) =>
  SUBJECTS_DATA.find((s) => s.id === id)?.name ?? '—';

export const curriculumStats = () => ({
  subjects: SUBJECTS_DATA.length,
  units: SUBJECTS_DATA.reduce((a, s) => a + s.units.length, 0),
  lessons: SUBJECTS_DATA.reduce(
    (a, s) => a + s.units.reduce((b, u) => b + u.lessons.length, 0),
    0,
  ),
  // عدد عناصر المكتبة يُحسب في `curriculum.ts` (RESOURCES_DATA) — لا نستوردها هنا
  // حتى لا نعيد ربط هذا الملف بالحزمة الأساسية.
  /** الأعداد المعلنة في الخطة (unitsCount / lessonsCount) */
  plannedUnits: SUBJECTS_DATA.reduce((a, s) => a + s.unitsCount, 0),
  plannedLessons: SUBJECTS_DATA.reduce((a, s) => a + s.lessonsCount, 0),
});

