/**
 * أنواع المنهج الدراسي — المصدر الوحيد للحقيقة (Single Source of Truth)
 *
 * تستخدمها: تطبيق الطالب (العرض) + تطبيق الإدارة (إدارة المحتوى).
 * أي تغيير في بنية المحتوى يتم هنا مرة واحدة وينعكس على التطبيقين.
 */

export type SubjectCategory = 'all' | 'core' | 'science' | 'humanities' | 'tech';

/**
 * تصنيف الوسيط كما تختاره الإدارة عند الرفع.
 * 'textbook'|'notes'|'worksheets' → تبويب «الكتب»، و'exam'|'past-exams' → تبويب «الامتحانات».
 * null يعني «لم يُحدَّد» — عندها يوزّعه التطبيق حسب عنوان الملف (ملفات قديمة فقط).
 */
export type MediaCategory = 'textbook' | 'exam' | 'notes' | 'worksheets' | 'past-exams';
export interface ContentMediaAsset { id:string; kind:string; title:string; url:string; category?:string|null; mimeType?:string|null; sizeBytes?:number|null; description?:string|null; originalName?:string|null }
export interface LessonAttachment {
  id: string;
  title: string;
  type: string;
  size?: string;
  pages?: number;
  url?:string|null;
  filePath?:string|null;
  kind?:string;
  mimeType?:string|null;
  originalName?:string|null;
}
export interface LessonExplanationSection {
  title: string;
  content: string;
  keyPoints?: string[];
  formulaOrRule?: string;
  example?: {
    question: string;
    solution: string;
  };
}
export type ResourceCategory = 'all' | 'notes' | 'textbook' | 'worksheets' | 'past_exams';

export interface Lesson {
  id: string;
  subjectId: string;
  unitId: string;
  lessonNumber: number;
  title: string;
  durationMinutes: number;
  summary: string;
  learningObjectives: string[];
  sections: LessonExplanationSection[];
  keyRules: string[];
  attachments: LessonAttachment[];
  faq: { question: string; answer: string }[];
  examTips: string[];
  isCompleted?: boolean;
}
export interface Unit {
  mediaAssets?: ContentMediaAsset[];
  id: string;
  subjectId: string;
  unitNumber: number;
  title: string;
  description: string;
  lessons: Lesson[];
}
/** مصدر رسمي استُخرج منه هيكل المادة (اسم الكتاب وناشره وعدده) */
export interface OfficialSource {
  /** اسم الكتاب المدرسي الرسمي كما ورد على الغلاف */
  book: string | null;
  /** الجهة الناشرة */
  publisher: string | null;
  /** عدد صفحات الكتاب */
  pages: number | null;
  /** رابط تحميل الكتاب الرسمي */
  url: string | null;
  /** عدد الوحدات في الكتاب الرسمي (null = غير مستخرج) */
  unitsCount: number | null;
  /** عدد الدروس في الكتاب الرسمي إن توفّر في الفهرس */
  lessonsCount: number | null;
  /** عدد المحاور إن كان الكتاب لا يرقّم دروسه (جغرافيا · علوم) */
  themesCount?: number | null;
  /** مدى الثقة في الهيكل المستخرج */
  confidence: 'high' | 'partial' | 'none';
  /** تاريخ الاستخراج */
  verifiedAt: string | null;
  /** ملاحظات عن طريقة الاستخراج وما يحتاج تأكيداً */
  note: string | null;
  /** الطبعة كما وردت في الكتاب */
  edition?: string | null;
  /** هل الكتاب بلا طبقة نص (مسح ضوئي) — يبرّر التحفّظات */
  hasTextLayer?: boolean;
  /** كيف يسمّي الكتاب ما يحتويه كل وحدة */
  numbering?: 'lessons' | 'themes';
  /** تصحيح جوهري طرأ على هيكل مسجَّل سابقاً */
  correction?: string | null;
  /** هل للوحدات عناوين في الكتاب أصلاً (العربية: لا) */
  hasUnitTitles?: boolean;
  /** كيف يعرّف الكتاب وحداته حين لا يسمّيها */
  unitNaming?: string | null;
}

/** نوع ترقيم محتوى الوحدة في الكتاب: دروس مُرقّمة أو محاور بلا ترقيم */
export type SyllabusNumbering = 'lessons' | 'themes';

export interface SyllabusLesson {
  lessonNumber?: number;
  title: string;
  /** صفحة الدرس في الكتاب (التاريخ) */
  sourcePage?: number | null;
  /** مدى صفحات المحور (الجغرافيا) */
  pages?: string | null;
  /** تحفّظ على هذا العنصر تحديداً */
  note?: string | null;
}

export interface SyllabusComponent {
  type: string;
  topic: string;
}

/** وحدة كما وردت في الكتاب الرسمي — الهيكل الكامل المستخرج */
export interface SyllabusEntry {
  /** التاريخ أو الجغرافيا في مادة الاجتماعيات */
  subject?: string;
  unitNumber: number;
  title?: string | null;
  sourcePage?: number | null;
  startPage?: number | null;
  endPage?: number | null;
  sourceConfidence?: 'high' | 'partial' | 'none';
  numbering?: SyllabusNumbering;
  /** أهداف الوحدة كما كتبها الكتاب */
  objectives?: string[];
  /** الفكرة الرئيسة للوحدة */
  mainIdea?: string;
  /** مفردات الوحدة */
  vocabulary?: string[];
  /** مكوّنات الوحدة (اللغة العربية: قراءة/أدب/نحو/إملاء/تعبير) */
  components?: SyllabusComponent[];
  lessons: SyllabusLesson[];
}

export interface Subject {
  mediaAssets?: ContentMediaAsset[];
  id: string;
  name: string;
  nameEn: string;
  code: string;
  category: SubjectCategory;
  description: string;
  curriculumRef: string;
  unitsCount: number;
  lessonsCount: number;
  /** شرح لكيفية حساب lessonsCount حين تكون محاور لا دروساً */
  lessonsCountNote?: string | null;
  /** تحذير بأن المصدر لصفّ آخر (التربية الوطنية: كتاب الصف الثاني) */
  gradeWarning?: string | null;
  /** الهيكل الرسمي الكامل المستخرج من الكتاب */
  syllabus?: SyllabusEntry[];
  /** المصدر الرسمي لهيكل المادة — قد يكون null إن لم يُعثر على مصدر */
  official?: OfficialSource;
  colorScheme: {
    bg: string;
    text: string;
    border: string;
    accent: string;
    pillBg: string;
  };
  units: Unit[];
}
export interface ResourceItem {
  id: string;
  title: string;
  subjectId: string;
  subjectName: string;
  category: ResourceCategory;
  fileType: string;
  filePath?: string | null;
  fileSize: string;
  pageCount: number;
  author: string;
  publishYear: string;
  isVerifiedCurriculum: boolean;
  downloadCount: number;
  description: string;
  previewSummary: string[];
}
export interface QuizQuestion {
  id: number;
  subject: string;
  topic: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}
