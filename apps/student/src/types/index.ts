export * from '@shared/curriculumTypes';










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

export interface StudentAccount {
  id: string;
  name: string;
  grade: string;
  state: string;
  school: string;
  avatar: string;
  completedLessonIds: string[];
  bookmarkedLessonIds: string[];
  quizScores: Record<string, number>;
  streakDays: number;
  createdAt: string;
}

export interface BadgeItem {
  id: string;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  icon: string;
  category: 'progress' | 'quiz' | 'streak' | 'subject';
  points: number;
  requirement: string;
  requirementEn: string;
  isUnlocked: boolean;
  unlockedAt?: string;
  progressPercent: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  titleEn: string;
  type: 'live_class' | 'deadline' | 'exam' | 'trial_exam' | 'review' | 'reminder';
  date: string; // YYYY-MM-DD
  time: string;
  subjectName: string;
  teacher?: string;
  description: string;
  link?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  titleEn: string;
  message: string;
  messageEn: string;
  type: 'lesson' | 'exam' | 'badge' | 'live' | 'system';
  timestamp: string;
  isRead: boolean;
  targetView?: ViewMode;
  targetId?: string;
}

export interface LeaderboardStudent {
  rank: number;
  id: string;
  name: string;
  school: string;
  state: string;
  completedLessons: number;
  examsPassed: number;
  score: number;
  streakDays: number;
  avatar: string;
  isCurrentStudent?: boolean;
}

export type ReaderTheme = 'comfort' | 'white' | 'dark';
export type ReaderLineHeight = 'normal' | 'relaxed' | 'loose';
export type ReaderFontSize = 'sm' | 'base' | 'lg' | 'xl';

export interface ReaderSettings {
  lineHeight: ReaderLineHeight;
  fontSize: ReaderFontSize;
  theme: ReaderTheme;
  autoNightMode: boolean;
}

export type Language = 'ar' | 'en';

export type ViewMode =
  | 'home'
  | 'subjects'
  | 'subject-detail'
  | 'lesson'
  | 'resources'
  | 'exams'
  | 'ai-assistant'
  | 'student-dashboard'
  | 'leaderboard'
  | 'achievements'
  | 'study-rooms';

export interface StudyReminder {
  id: string;
  time: string; // "17:00"
  days: string[]; // ['الأحد', 'الإثنين', 'الثلاثاء', ...]
  subjectName: string;
  label: string;
  isEnabled: boolean;
  notifyBrowser: boolean;
  soundEnabled?: boolean;
}

export interface StudyRoomMessage {
  id: string;
  roomId: string;
  senderName: string;
  senderAvatar: string;
  senderState: string;
  text: string;
  timestamp: string;
  isSelf?: boolean;
  reactions?: Record<string, number>;
  attachedQuestion?: string;
}

export interface StudyRoom {
  id: string;
  title: string;
  subjectId: string;
  subjectName: string;
  topic: string;
  activeCount: number;
  description: string;
  pinnedNote?: string;
  iconBg: string;
  tags: string[];
}



/** تقييم الطالب وملاحظاته على درس معيّن (يُحفظ محلياً في المرحلة الأولى) */
export interface LessonFeedback {
  lessonId: string;
  rating: number; // من ١ إلى ٥
  comment: string;
  updatedAt: string;
}
