/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { ViewMode, Lesson, Subject } from './types';
import { SUBJECTS_DATA, RESOURCES_DATA } from './data/curriculumData';
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
import { LessonView } from './views/LessonView';
import { ResourcesView } from './views/ResourcesView';
import { ExamsView } from './views/ExamsView';
import { AIAssistantView } from './views/AIAssistantView';
import { StudentDashboardView } from './views/StudentDashboardView';
import { LeaderboardView } from './views/LeaderboardView';
import { AchievementsView } from './views/AchievementsView';
import { StudyRoomsView } from './views/StudyRoomsView';

function AppContent() {
  const [currentView, setCurrentView] = useState<ViewMode>('home');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('math');
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);

  const { activeAccount, toggleCompletedLesson, toggleBookmarkedLesson } = useAccount();
  const { isRtl } = useLanguage();

  const completedLessonIds = activeAccount.completedLessonIds || [];
  const bookmarkedLessonIds = activeAccount.bookmarkedLessonIds || [];

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sudanese_platform_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

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

  // Sync theme with document class and localStorage
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('sudanese_platform_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('sudanese_platform_theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode((prev) => !prev);

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

  const handleSelectLesson = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setSelectedSubjectId(lesson.subjectId);
    setCurrentView('lesson');
  };

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

  const allLessonsInCurrentSubject = currentSubject.units.flatMap(
    (u) => u.lessons
  );

  return (
    <div 
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
        isDarkMode 
          ? 'dark bg-[#071322] text-slate-100 selection:bg-amber-900/60 selection:text-amber-200' 
          : 'bg-slate-50 text-slate-900 selection:bg-amber-100 selection:text-amber-900'
      }`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Platform Header */}
      <Header
        currentView={currentView}
        onNavigate={handleNavigate}
        completedCount={completedLessonIds.length}
        bookmarkedCount={bookmarkedLessonIds.length}
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleDarkMode}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24 lg:pb-12">
        {currentView === 'home' && (
          <HomeView
            subjects={SUBJECTS_DATA}
            resources={RESOURCES_DATA}
            completedLessonIds={completedLessonIds}
            onNavigate={handleNavigate}
            onSelectSubject={handleSelectSubject}
            onSelectResource={handleSelectResource}
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
          />
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

      </main>

      {/* Footer */}
      <Footer onNavigate={handleNavigate} />

      {/* Mobile-first bottom navigation bar for phones */}
      <MobileBottomNav currentView={currentView} onNavigate={handleNavigate} />

      {/* Student Account Switcher and Creator Modal */}
      <AccountManagerModal />

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
