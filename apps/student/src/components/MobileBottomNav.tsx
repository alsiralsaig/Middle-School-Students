import React from 'react';
import { ViewMode } from '../types';
import { BookOpen, Layers, FileText, CheckSquare, Trophy, Users } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface MobileBottomNavProps {
  currentView: ViewMode;
  onNavigate: (view: ViewMode) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ currentView, onNavigate }) => {
  const { t, isRtl } = useLanguage();

  const tabs: { view: ViewMode; label: string; icon: React.ReactNode }[] = [
    { view: 'home', label: t('home'), icon: <BookOpen className="w-5 h-5" /> },
    { view: 'subjects', label: t('subjects'), icon: <Layers className="w-5 h-5" /> },
    { view: 'resources', label: t('resources'), icon: <FileText className="w-5 h-5" /> },
    { view: 'exams', label: t('exams'), icon: <CheckSquare className="w-5 h-5" /> },
    { view: 'study-rooms', label: 'المذاكرة الجماعية', icon: <Users className="w-5 h-5" /> },
    { view: 'leaderboard', label: t('leaderboard'), icon: <Trophy className="w-5 h-5" /> },
  ];

  return (
    <nav 
      aria-label="التنقل السفلي للهاتف"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 backdrop-blur-md border-t pb-safe bg-[var(--ssp-nav)] border-[var(--ssp-header-border)]"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="grid grid-cols-6 h-16 items-center px-0.5 gap-0.5">
        {tabs.map((tab) => {
          const isActive =
            currentView === tab.view ||
            (tab.view === 'subjects' && (currentView === 'subject-detail' || currentView === 'lesson'));
          return (
            <button
              key={tab.view}
              onClick={() => onNavigate(tab.view)}
              className={`flex flex-col items-center justify-center min-h-[48px] min-w-0 py-1 px-0.5 transition-colors cursor-pointer relative ${
                isActive ? 'text-[var(--ssp-nav-active)] font-semibold' : 'text-[var(--ssp-nav-text)] hover:opacity-90'
              }`}
            >
              <div className="relative">
                {tab.icon}
                {isActive && (
                  <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-amber-400" />
                )}
              </div>
              <span className="text-[9px] leading-tight font-medium tracking-tight mt-1 text-center w-full break-words">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
