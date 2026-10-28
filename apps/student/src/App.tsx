/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { ViewMode, Lesson, Subject } from './types';
import { RESOURCES_DATA, useSubjects, refreshCurriculum, hydrateLesson } from './data/curriculumData';
import { Header } from './components/Header';
import { MobileBottomNav } from './components/MobileBottomNav';
import { Footer } from './components/Footer';
import { AccountManagerModal } from './components/AccountManagerModal';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { ToastHost } from './components/ToastHost';
import { useReminderEngine, PendingLesson } from './hooks/useReminderEngine';
import { AccountProvider, useAccount } from './context/AccountContext';
import { startSyncEngine, runSync } from './utils/syncEngine';
import { refreshSession } from './utils/sessionStore';

import { HomeView } from './views/HomeView';
import { SubjectsView } from './views/SubjectsView';
import { SubjectDetailView } from './views/SubjectDetailView';

/**
 * الشاشات الثانوية تُحمَّل عند فتحها فقط (code-splitting).
 * الشاشات الثلاث الأولى تبقى في الحزمة الأساسية لأنها أول ما يراه الطالب،
 * والباقي — الدرس، المكتبة، الامتحانات، المساعد، اللوحة، المتصدرين،
 * الإنجازات، غرف المذاكرة — حزم مستقلة تُطلب عند الحاجة.
 */
const LessonView = React.lazy(() =>
  import('./views/LessonView').then((m) => ({ default: m.LessonView })),
);
const ResourcesView = React.lazy(() =>
  import('./views/ResourcesView').then((m) => ({ default: m.ResourcesView })),
);
const ExamsView = React.lazy(() =>
  import('./views/ExamsView').then((m) => ({ default: m.ExamsView })),
);
const AIAssistantView = React.lazy(() =>
  import('./views/AIAssistantView').then((m) => ({ default: m.AIAssistantView })),
);
const StudentDashboardView = React.lazy(() =>
  import('./views/StudentDashboardView').then((m) => ({ default: m.StudentDashboardView })),
);
const LeaderboardView = React.lazy(() =>
  import('./views/LeaderboardView').then((m) => ({ default: m.LeaderboardView })),
);
const AchievementsView = React.lazy(() =>
  import('./views/AchievementsView').then((m) => ({ default: m.AchievementsView })),
);
const StudyRoomsView = React.lazy(() =>
  import('./views/StudyRoomsView').then((m) => ({ default: m.StudyRoomsView })),
);

/** بديل خفيف أثناء تحميل حزمة الشاشة. */
const ViewLoader = () => (
  <div className="flex items-center justify-center py-16" role="status" aria-live="polite">
    <span className="h-8 w-8 rounded-full border-[3px] border-amber-400/30 border-t-amber-400 animate-spin" />
    <span className="sr-only">جارٍ التحميل…</span>
  </div>
);
import { AuthGate } from './components/AuthGate';
import { WelcomeBanner } from './components/WelcomeBanner';
import { AIAssistantFab } from './components/AIAssistantFab';
import { WhatsAppFab } from './components/WhatsAppFab';
import { useSession } from './hooks/useSession';
import { ServerSetupDialog } from './components/ServerSetupDialog';
import { applyTheme, readSavedTheme, type ShellTheme } from './utils/theme';

function AppContent() {
  /* المنهج من قاعدة البيانات (مع نسخة محفوظة تعمل دون اتصال) */
  const SUBJECTS_DATA = useSubjects();

  useEffect(() => {
    // يُحمّل من الخادم عند الإقلاع؛ الفشل يُبقي النسخة المحفوظة محلياً
    void refreshCurriculum();
  }, []);

  const [currentView, setCurrentView] = useState<ViewMode>('home');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('math');
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);

  const { activeAccount, toggleCompletedLesson, toggleBookmarkedLesson } = useAccount();
  const { isRtl } = useLanguage();

  const completedLessonIds = activeAccount.completedLessonIds || [];
  const bookmarkedLessonIds = activeAccount.bookmarkedLessonIds || [];

  const [theme, setTheme] = useState<ShellTheme>(() => readSavedTheme());

  /* ===== الجلسة والمزامنة مع خادم المنصة (apps/api) =====
     كل شيء اختياري: إذا تعذّر الاتصال تبقى المنصة تعمل من localStorage. */
  useEffect(() => {
    const stopEngine = startSyncEngine();
    let cancelled = false;

    (async () => {
      const user = await refreshSession();
      if (cancelled || !user) return;
      // نجاح الاتصال: اسحب الحالة من الخادم ثم ادفع ما تغيّر محلياً
      await runSync();
    })();

    return () => {
      cancelled = true;
      stopEngine();
    };
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Scroll to top when view changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentView, selectedLesson]);

  const handleNavigate = (view: ViewMode) => {
    setCurrentView(view);
    if (view !== 'lesson') {
      setSelectedLesson(null);
    }
  };

  const handleSelectSubject = (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    setCurrentView('subject-detail');
  };

  /**
   * الفهرس يحمل عناوين الدروس فقط؛ عند فتح درس نطلب شرحه من الخادم.
   * إن كان الشرح محمّلاً من قبل (تنقّل داخلي) لا نطلب شيئاً.
   */
  const [lessonHydrating, setLessonHydrating] = useState(false);

  const handleSelectLesson = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setSelectedSubjectId(lesson.subjectId);
    setCurrentView('lesson');
    if (!lesson.sections || lesson.sections.length === 0) {
      setLessonHydrating(true);
      hydrateLesson(lesson.id).finally(() => setLessonHydrating(false));
    } else {
      setLessonHydrating(false);
    }
  };

  // وصل الشرح من الخادم: نستبدل الكائن المعروض بنسخته الكاملة
  useEffect(() => {
    if (!selectedLesson) return;
    const fresh = SUBJECTS_DATA.flatMap((s) => s.units.flatMap((u) => u.lessons)).find(
      (l) => l.id === selectedLesson.id,
    );
    if (fresh && (fresh.sections?.length || 0) > (selectedLesson.sections?.length || 0)) {
      setSelectedLesson(fresh);
    }
  }, [SUBJECTS_DATA, selectedLesson]);

  const handleSelectResource = (resourceId: string) => {
    setSelectedResourceId(resourceId);
    setCurrentView('resources');
  };

  const currentSubject =
    SUBJECTS_DATA.find((s) => s.id === selectedSubjectId) || SUBJECTS_DATA[0];

  // دروس في قائمة المتابعة ولم تكتمل → يُذكّر بها محرّك التنبيهات مساءً
  const pendingLessons: PendingLesson[] = useMemo(() => {
    const allLessons = SUBJECTS_DATA.flatMap((s) =>
      s.units.flatMap((u) => u.lessons.map((l) => ({ lesson: l, subjectName: s.name })))
    );
    return allLessons
      .filter(({ lesson }) => bookmarkedLessonIds.includes(lesson.id))
      .filter(({ lesson }) => !completedLessonIds.includes(lesson.id))
      .map(({ lesson, subjectName }) => ({
        id: lesson.id,
        title: lesson.title,
        subjectName,
      }));
  }, [bookmarkedLessonIds, completedLessonIds]);

  // محرّك التنبيهات المحلي (تذكيرات + مواعيد التقويم + الدروس غير المكتملة)
  useReminderEngine({ pendingLessons });

  const allLessonsInCurrentSubject = (currentSubject?.units || []).flatMap(
    (u) => u.lessons
  );

  const { user: gateUser } = useSession();
  const [authOpen, setAuthOpen] = useState(false);
  const isGuest = !gateUser;

  /* بعد الدخول نقفل شاشة الحساب ونرجع للمنهج */
  useEffect(() => {
    if (gateUser) setAuthOpen(false);
  }, [gateUser]);

  /**
   * أول زيارة (لا نسخة محفوظة) — المنهج يصل من الخادم بعد لحظة.
   * بدل أن تنهار الشاشات على `subjects[0].units` نعرض انتظاراً خفيفاً.
   */
  if (SUBJECTS_DATA.length === 0) {
    return (
      <>
      <WelcomeBanner />
      <div
        dir={isRtl ? 'rtl' : 'ltr'}
        className="min-h-screen flex flex-col items-center justify-center gap-3 px-6"
        style={{ background: 'var(--ssp-bg)', color: 'var(--ssp-text)' }}
      >
        <span className="h-9 w-9 rounded-full border-[3px] border-amber-400/30 border-t-amber-400 animate-spin" />
        <p className="text-sm font-bold text-amber-300">جارٍ تحميل المنهج…</p>
        <p className="text-[11px] text-slate-400">أول مرة فقط — بعدها يعمل التطبيق دون اتصال</p>
      </div>
      </>
    );
  }

  return (
    <div 
      className="min-h-screen flex flex-col font-sans transition-colors duration-200"
      style={{ background: 'var(--ssp-bg)', color: 'var(--ssp-text)' }}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <WelcomeBanner />
      {/* Platform Header */}
      <Header
        currentView={currentView}
        onNavigate={handleNavigate}
        completedCount={completedLessonIds.length}
        bookmarkedCount={bookmarkedLessonIds.length}
        theme={theme}
        onThemeChange={setTheme}
        isGuest={isGuest}
        onOpenAuth={() => setAuthOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24 lg:pb-12">
        <React.Suspense fallback={<ViewLoader />}>
        {currentView === 'home' && (
          <HomeView
            subjects={SUBJECTS_DATA}
            completedLessonIds={completedLessonIds}
            onNavigate={handleNavigate}
            onSelectSubject={handleSelectSubject}
            isGuest={isGuest}
            onOpenAuth={() => setAuthOpen(true)}
          />
        )}

        {currentView === 'subjects' && (
          <SubjectsView
            subjects={SUBJECTS_DATA}
            completedLessonIds={completedLessonIds}
            onSelectSubject={handleSelectSubject}
          />
        )}

        {currentView === 'subject-detail' && currentSubject && (
          <SubjectDetailView
            subject={currentSubject}
            completedLessonIds={completedLessonIds}
            bookmarkedLessonIds={bookmarkedLessonIds}
            onToggleBookmark={toggleBookmarkedLesson}
            onBack={() => setCurrentView('subjects')}
            onSelectLesson={handleSelectLesson}
            onOpenAssistant={() => setCurrentView('ai-assistant')}
            onOpenExams={() => setCurrentView('exams')}
          />
        )}

        {currentView === 'lesson' && lessonHydrating && (
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] font-bold text-amber-900">
            <span className="h-4 w-4 rounded-full border-2 border-amber-400/40 border-t-amber-600 animate-spin" />
            جارٍ تحميل شرح الدرس…
          </div>
        )}

        {currentView === 'lesson' && selectedLesson && currentSubject && (
          <LessonView
            lesson={selectedLesson}
            subject={currentSubject}
            allLessonsInSubject={allLessonsInCurrentSubject}
            isCompleted={completedLessonIds.includes(selectedLesson.id)}
            onToggleComplete={toggleCompletedLesson}
            isBookmarked={bookmarkedLessonIds.includes(selectedLesson.id)}
            onToggleBookmark={toggleBookmarkedLesson}
            onSelectLesson={handleSelectLesson}
            onBackToSubject={() => setCurrentView('subject-detail')}
          />
        )}

        {currentView === 'resources' && (
          <ResourcesView
            resources={RESOURCES_DATA}
            subjects={SUBJECTS_DATA}
            initialSelectedResourceId={selectedResourceId}
          />
        )}

        {currentView === 'exams' && <ExamsView />}

        {currentView === 'ai-assistant' && <AIAssistantView />}

        {currentView === 'student-dashboard' && (
          <StudentDashboardView
            subjects={SUBJECTS_DATA}
            completedLessonIds={completedLessonIds}
            bookmarkedLessonIds={bookmarkedLessonIds}
            onToggleBookmark={toggleBookmarkedLesson}
            onNavigate={handleNavigate}
            onSelectSubject={handleSelectSubject}
            onSelectLesson={handleSelectLesson}
          />
        )}

        {currentView === 'leaderboard' && (
          <LeaderboardView onBack={() => setCurrentView('student-dashboard')} />
        )}

        {currentView === 'achievements' && (
          <AchievementsView onBack={() => setCurrentView('student-dashboard')} />
        )}

        {currentView === 'study-rooms' && (
          <StudyRoomsView onBackToDashboard={() => setCurrentView('student-dashboard')} />
        )}
        </React.Suspense>
      </main>

      {/* Footer */}
      <Footer onNavigate={handleNavigate} />

      {/* Mobile-first bottom navigation bar for phones */}
      <MobileBottomNav currentView={currentView} onNavigate={handleNavigate} />

      {/* Student Account Switcher and Creator Modal */}
      <AccountManagerModal />

      {authOpen && isGuest && (
        <div className="fixed inset-0 z-[80] overflow-y-auto" style={{ background: 'var(--ssp-bg)' }}>
          <AuthGate onBrowse={() => setAuthOpen(false)} />
        </div>
      )}

      {/* نافذة ضبط عنوان الخادم — تُفتح تلقائياً داخل حزمة APK أول مرة */}
      <ServerSetupDialog />

      {/* المساعد الذكي العائم — في كل الصفحات */}
      <AIAssistantFab />

      {/* زر واتساب العائم — تواصل مباشر مع الدعم */}
      <WhatsAppFab />

      {/* التنبيهات المنبثقة (Toasts) — تُدار عبر ناقل الأحداث */}
      <ToastHost
        onNavigate={(view, id) => {
          handleNavigate(view);
          if (id) setSelectedSubjectId(id);
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AccountProvider>
        <AppContent />
      </AccountProvider>
    </LanguageProvider>
  );
}
