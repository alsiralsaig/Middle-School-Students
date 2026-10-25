import React, { useState } from 'react';
import { ViewMode } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useAccount } from '../context/AccountContext';
import { StudentAvatar } from './StudentAvatar';
import { Camera } from 'lucide-react';
import { NotificationCenter } from './NotificationCenter';
import { 
  BookOpen, 
  Layers, 
  FileText, 
  CheckSquare, 
  Sparkles, 
  Menu, 
  X,
  GraduationCap,
  Bookmark,
  Languages,
  Trophy,
  Award,
  Users
} from 'lucide-react';

interface HeaderProps {
  currentView: ViewMode;
  onNavigate: (view: ViewMode) => void;
  completedCount: number;
  bookmarkedCount?: number;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  currentView, 
  onNavigate, 
  completedCount: _completedCount,
  bookmarkedCount = 0,
  isDarkMode: _isDarkMode,
  onToggleDarkMode: _onToggleDarkMode
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { language, toggleLanguage, t, isRtl } = useLanguage();
  const { activeAccount, setIsAccountModalOpen } = useAccount();

  const navLinks: { view: ViewMode; label: string; icon: React.ReactNode }[] = [
    { view: 'home', label: t('home'), icon: <BookOpen className="w-4 h-4" /> },
    { view: 'subjects', label: t('subjects'), icon: <Layers className="w-4 h-4" /> },
    { view: 'resources', label: t('resources'), icon: <FileText className="w-4 h-4" /> },
    { view: 'exams', label: t('exams'), icon: <CheckSquare className="w-4 h-4" /> },
    { view: 'leaderboard', label: t('leaderboard'), icon: <Trophy className="w-4 h-4 text-amber-400" /> },
    { view: 'achievements', label: t('achievements'), icon: <Award className="w-4 h-4 text-sky-400" /> },
    { view: 'study-rooms', label: 'غرف المذاكرة', icon: <Users className="w-4 h-4 text-indigo-400" /> },
    { view: 'ai-assistant', label: t('aiAssistant'), icon: <Sparkles className="w-4 h-4" /> },
  ];

  const handleNavClick = (view: ViewMode) => {
    onNavigate(view);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0B1E36] text-white border-b border-[#1A3353] shadow-md" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Top Banner Bar for Grade & Curriculum Recognition */}
      <div className="bg-[#071322] border-b border-[#14263D] py-1 px-4 text-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-300">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span className="font-medium text-amber-300">
              {language === 'en' ? 'Sudanese National Curriculum' : 'المنهج السوداني القومي'}
            </span>
            <span className="text-slate-500">·</span>
            <span className="hidden sm:inline">
              {language === 'en' ? 'Middle School Certificate' : 'الشهادة المتوسطة — الصف الثالث المتوسط'}
            </span>
          </div>
          <div className="flex items-center gap-4 text-slate-300">
            {/* Language Switcher in Top Bar */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-2.5 py-1.5 min-h-[32px] rounded-lg bg-[#122846] hover:bg-[#1C3B65] text-amber-300 hover:text-white border border-[#234572] transition-colors cursor-pointer text-[11px] font-semibold"
              title="Switch Interface Language (EN / AR)"
            >
              <Languages className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'English (EN)' : 'العربية (AR)'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Top Navigation Row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Zone 1: Single Brand Wordmark */}
        <button
          onClick={() => handleNavClick('home')}
          className="flex items-center gap-2.5 text-right cursor-pointer group focus:outline-none min-w-0 shrink"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 shadow-inner shrink-0 group-hover:scale-105 transition-transform">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div className="min-w-0 text-right">
            <span className="text-sm sm:text-lg font-bold tracking-tight text-white block truncate whitespace-nowrap max-w-[46vw] sm:max-w-none">
              <span className="sm:hidden">{language === 'en' ? 'Student Platform' : 'الطالب السوداني'}</span>
              <span className="hidden sm:inline">{language === 'en' ? 'Smart Sudanese Student Platform' : 'منصة الطالب السوداني الذكية'}</span>
            </span>
            <span className="text-[10px] text-amber-400 font-medium hidden sm:block">
              {language === 'en' ? 'Grade 9 — Sudan' : 'الصف الثالث المتوسط — السودان'}
            </span>
          </div>
        </button>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden xl:flex min-w-0 items-center gap-4 text-sm font-medium text-slate-200">
          {navLinks.map((link) => {
            const isActive = currentView === link.view;
            return (
              <button
                key={link.view}
                onClick={() => handleNavClick(link.view)}
                className={`py-2 whitespace-nowrap shrink-0 transition-colors relative cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'text-amber-400 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {link.icon}
                <span>{link.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400 rounded-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary Action & Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Notification Center Bell */}
          <NotificationCenter onNavigate={handleNavClick} />

          {/* Quick Bookmarks Button */}
          <button
            onClick={() => handleNavClick('student-dashboard')}
            className="hidden sm:flex p-2 rounded-xl bg-[#162D4A] hover:bg-[#1E3A60] text-amber-300 hover:text-amber-200 border border-[#27446C] transition-all cursor-pointer min-h-[40px] min-w-[40px] items-center justify-center shadow-sm relative"
            title={`قائمة المتابعة لاحقاً (${bookmarkedCount} دروس)`}
            aria-label="قائمة المتابعة لاحقاً"
          >
            <Bookmark className={`w-4 h-4 ${bookmarkedCount > 0 ? 'fill-amber-400 text-amber-400' : 'text-amber-300'}`} />
            {bookmarkedCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-400 text-slate-950 font-bold text-[10px] min-w-[18px] h-[18px] rounded-full flex items-center justify-center border-2 border-[#0B1E36] px-1">
                {bookmarkedCount}
              </span>
            )}
          </button>

          {/* Student Profile & Account Switcher Button */}
          <button
            onClick={() => setIsAccountModalOpen(true)}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer border border-[#27446C] bg-[#162D4A] hover:bg-[#1E3A60] text-white shadow-sm"
            title="حسابي — بياناتي وصورتي"
          >
            <span className="relative">
              <StudentAvatar avatar={activeAccount.avatar} name={activeAccount.name} className="w-7 h-7" textClassName="text-[12px]" />
              <span className="absolute -bottom-1 -left-1 w-4 h-4 rounded-full bg-[#F1AC12] border-2 border-[#162D4A] flex items-center justify-center">
                <Camera className="w-2 h-2 text-[#071322]" />
              </span>
            </span>
            <span className="hidden sm:inline font-bold truncate max-w-[90px]">
              {activeAccount.name.split(' ')[0]}
            </span>
            <Users className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {/* Mobile Hamburger Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden p-2 rounded-xl bg-[#162D4A] text-slate-200 hover:text-white cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center border border-[#27446C]"
            aria-label="القائمة الرئيسية"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="xl:hidden bg-[#0A182B] border-b border-[#1A3353] px-4 py-4 space-y-2 animate-in slide-in-from-top duration-200">
          {navLinks.map((link) => {
            const isActive = currentView === link.view;
            return (
              <button
                key={link.view}
                onClick={() => handleNavClick(link.view)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors text-right cursor-pointer min-h-[44px] ${
                  isActive
                    ? 'bg-amber-400/10 text-amber-400 border border-amber-400/30'
                    : 'text-slate-300 hover:bg-[#12243C] hover:text-white'
                }`}
              >
                {link.icon}
                <span>{link.label}</span>
              </button>
            );
          })}
          
          <div className="pt-2 border-t border-slate-800 space-y-2">
            {/* Language Switcher in Mobile Drawer */}
            <button
              onClick={toggleLanguage}
              className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium bg-[#162D4A] text-amber-300 cursor-pointer min-h-[44px]"
            >
              <div className="flex items-center gap-2.5">
                <Languages className="w-4 h-4 text-amber-300" />
                <span>{language === 'ar' ? 'English (Interface)' : 'واجهة باللغة العربية'}</span>
              </div>
              <span className="text-xs bg-[#0E2440] px-2.5 py-1 rounded-lg text-white font-mono">
                {language.toUpperCase()}
              </span>
            </button>

            {/* Account Switcher in Mobile Drawer */}
            <button
              onClick={() => {
                setIsAccountModalOpen(true);
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium bg-[#162D4A] text-slate-200 cursor-pointer min-h-[44px]"
            >
              <div className="flex items-center gap-2.5">
                <StudentAvatar avatar={activeAccount.avatar} name={activeAccount.name} className="w-8 h-8" textClassName="text-[13px]" />
                <span>{activeAccount.name}</span>
              </div>
              <span className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                حسابي
              </span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
