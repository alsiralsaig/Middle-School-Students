/**
 * الأنواع المشتركة بين تطبيق الطالب وتطبيق الإدارة.
 *
 * أهم قاعدة في المرحلة الأولى: كل محتوى يحمل `status`
 *  - 'sample'   → محتوى تجريبي للعرض (غير مطابق للمنهج بعد)
 *  - 'verified' → محتوى مُطابق للمنهج السوداني المعتمد
 * ولا يجوز عرض 'sample' بدون وسم واضح للطالب.
 */

export type ContentStatus = 'sample' | 'verified';

export type AccentColor =
  | 'navy'
  | 'blue'
  | 'gold'
  | 'emerald'
  | 'violet'
  | 'rose'
  | 'cyan'
  | 'teal';

export type AttachmentKind = 'summary' | 'worksheet' | 'pdf' | 'audio' | 'video';

export interface Attachment {
  id: string;
  title: string;
  kind: AttachmentKind;
  size?: string;
  pages?: number;
  /** رفع الملفات غير مُفعّل في المرحلة الأولى */
  available: boolean;
}

export interface LessonSection {
  id: string;
  title: string;
  paragraphs: string[];
  keyPoints?: string[];
  rule?: string;
  example?: { question: string; solution: string };
}

export interface Lesson {
  id: string;
  subjectId: string;
  unitId: string;
  number: number;
  title: string;
  durationMinutes: number;
  summary: string;
  objectives: string[];
  sections: LessonSection[];
  attachments: Attachment[];
  status: ContentStatus;
}

export interface Unit {
  id: string;
  subjectId: string;
  number: number;
  title: string;
  description: string;
  lessons: Lesson[];
}

export interface Subject {
  id: string;
  name: string;
  nameEn: string;
  code: string;
  description: string;
  icon: string;
  accent: AccentColor;
  units: Unit[];
  status: ContentStatus;
}

export interface ResourceItem {
  id: string;
  title: string;
  subjectId: string;
  kind: AttachmentKind;
  pages?: number;
  size?: string;
  available: boolean;
  status: ContentStatus;
}

/** صف في جداول لوحة الإدارة */
export interface AdminRow {
  id: string;
  title: string;
  type: 'مادة' | 'وحدة' | 'درس' | 'مذكرة';
  subjectName: string;
  status: ContentStatus;
  updatedAt: string;
}

/** صف تجريبي لقائمة الطلاب في لوحة الإدارة (المرحلة الأولى) */
export interface SampleStudent {
  id: string;
  name: string;
  grade: string;
  lastActivity: string;
  progressPercent: number;
  status: ContentStatus;
}

/** سطر في سجل الأنشطة التجريبي للوحة الإدارة */
export interface SampleActivity {
  id: string;
  action: string;
  detail: string;
  time: string;
}
