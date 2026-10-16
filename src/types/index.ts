export type SubjectCategory = 'all' | 'core' | 'science' | 'humanities' | 'tech';

export interface LessonAttachment {
  id: string;
  title: string;
  type: 'pdf' | 'worksheet' | 'summary' | 'audio';
  size: string;
  pages?: number;
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
  id: string;
  subjectId: string;
  unitNumber: number;
  title: string;
  description: string;
  lessons: Lesson[];
}

export interface Subject {
  id: string;
  name: string;
  nameEn: string;
  code: string;
  category: SubjectCategory;
  description: string;
  curriculumRef: string;
  unitsCount: number;
  lessonsCount: number;
  colorScheme: {
    bg: string;
    text: string;
    border: string;
    accent: string;
    pillBg: string;
  };
  units: Unit[];
}

export type ResourceCategory = 'all' | 'notes' | 'textbook' | 'worksheets' | 'past_exams';

export interface ResourceItem {
  id: string;
  title: string;
  subjectId: string;
  subjectName: string;
  category: ResourceCategory;
  fileType: 'PDF' | 'DOCX';
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

export interface StudentProfile {
  name: string;
  grade: string;
  state: string;
  school: string;
  completedLessonIds: string[];
  bookmarkedLessonIds: string[];
  studyStreakDays: number;
  lastActive: string;
}

export type ViewMode =
  | 'home'
  | 'subjects'
  | 'subject-detail'
  | 'lesson'
  | 'resources'
  | 'exams'
  | 'ai-assistant'
  | 'student-dashboard'
  | 'admin-dashboard';
