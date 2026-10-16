import React, { useState } from 'react';
import { ViewMode } from '../types';
import { 
  BookOpen, 
  Layers, 
  FileText, 
  CheckSquare, 
  Sparkles, 
  User, 
  ShieldCheck, 
  Menu, 
  X,
  GraduationCap,
  Sun,
  Moon
} from 'lucide-react';

interface HeaderProps {
  currentView: ViewMode;
  onNavigate: (view: ViewMode) => void;
  completedCount: number;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  currentView, 
  onNavigate, 
  completedCount,
  isDarkMode,
  onToggleDarkMode
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks: { view: ViewMode; label: string; icon: React.ReactNode }[] = [
    { view: 'home', label: 'الرئيسية', icon: <BookOpen className="w-4 h-4" /> },
    { view: 'subjects', label: 'المواد الدراسية', icon: <Layers className="w-4 h-4" /> },
    { view: 'resources', label: 'بنك الموارد', icon: <FileText className="w-4 h-4" /> },
    { view: 'exams', label: 'الامتحانات', icon: <CheckSquare className="w-4 h-4" /> },
    { view: 'ai-assistant', label: 'المساعد الذكي', icon: <Sparkles className="w-4 h-4" /> },
  ];

  const handleNavClick = (view: ViewMode) => {
    onNavigate(view);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0B1E36] text-white border-b border-[#1A3353] shadow-md">
      {/* Top Banner Bar for Grade & Curriculum Recognition */}
      <div className="bg-[#071322] border-b border-[#14263D] py-1 px-4 text-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-300">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400"></span>
            <span className="font-medium text-amber-300">المنهج السوداني القومي</span>
            <span className="text-slate-500">·</span>
            <span>الصف الثالث المتوسط (المرحلة المتوسطة)</span>
          </div>
          <div className="flex items-center gap-4 text-slate-300">
            <button
              onClick={() => handleNavClick('admin-dashboard')}
              className={`hover:text-amber-300 transition-colors flex items-center gap-1.5 cursor-pointer ${
                currentView === 'admin-dashboard' ? 'text-amber-300 font-semibold' : ''
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>لوحة الإدارة</span>
            </button>
            <span className="text-slate-600 hidden sm:inline">|</span>
            <span className="text-slate-400 hidden sm:inline">العام الدراسي 2025 - 2026</span>
          </div>
        </div>
      </div>

      {/* Main Top Navigation Row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single Brand Wordmark */}
        <button
          onClick={() => handleNavClick('home')}
          className="flex items-center gap-3 text-right cursor-pointer group focus:outline-none"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 shadow-inner shrink-0 group-hover:scale-105 transition-transform">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div className="whitespace-nowrap shrink-0">
            <span className="text-lg font-bold tracking-tight text-white block">
              منصة الطالب السوداني الذكية
            </span>
          </div>
        </button>

        {/* Zone 2: 4-5 Clean Single-Line Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-200">
          {navLinks.map((link) => {
            const isActive = currentView === link.view;
            return (
              <button
                key={link.view}
                onClick={() => handleNavClick(link.view)}
                className={`py-2 whitespace-nowrap shrink-0 transition-colors relative cursor-pointer ${
                  isActive
                    ? 'text-amber-400 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <span>{link.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400 rounded-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary Action & Student Dashboard */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Dark / Light Mode Toggle Button */}
          <button
            onClick={onToggleDarkMode}
            className="p-2 rounded-xl bg-[#162D4A] hover:bg-[#1E3A60] text-amber-300 hover:text-amber-200 border border-[#27446C] transition-all cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center shadow-sm"
            title={isDarkMode ? 'التبديل إلى الوضع النهاري المضيء' : 'التبديل إلى الوضع الليلي الهادئ'}
            aria-label={isDarkMode ? 'التبديل إلى الوضع النهاري' : 'التبديل إلى الوضع الليلي'}
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-amber-300" />}
          </button>

          <button
            onClick={() => handleNavClick('student-dashboard')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer border ${
              currentView === 'student-dashboard'
                ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md'
                : 'bg-[#162D4A] hover:bg-[#1E3A60] text-white border-[#27446C]'
            }`}
          >
            <User className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">لوحة الطالب</span>
            {completedCount > 0 && (
              <span className="bg-amber-500 text-slate-950 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {completedCount}
              </span>
            )}
          </button>

          {/* Mobile Hamburger Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg bg-[#162D4A] text-slate-200 hover:text-white cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="القائمة الرئيسية"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation (When hamburger clicked on mobile) */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#0A182B] border-b border-[#1A3353] px-4 py-4 space-y-2 animate-in slide-in-from-top duration-200">
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
            {/* Theme Toggle in Mobile Drawer */}
            <button
              onClick={onToggleDarkMode}
              className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium bg-[#162D4A] text-slate-200 cursor-pointer min-h-[44px]"
            >
              <div className="flex items-center gap-2.5">
                {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-amber-400" />}
                <span>المظهر: {isDarkMode ? 'الوضع الليلي (مفعل)' : 'الوضع النهاري (مفعل)'}</span>
              </div>
              <span className="text-xs text-amber-300 font-semibold">تبديل</span>
            </button>

            <button
              onClick={() => handleNavClick('student-dashboard')}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-right cursor-pointer min-h-[44px] ${
                currentView === 'student-dashboard'
                  ? 'bg-amber-400 text-slate-950 font-bold'
                  : 'bg-[#162D4A] text-white'
              }`}
            >
              <User className="w-4 h-4" />
              <span>لوحة متابعة الطالب (أحمد النور)</span>
            </button>
            <button
              onClick={() => handleNavClick('admin-dashboard')}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-right cursor-pointer min-h-[44px] ${
                currentView === 'admin-dashboard'
                  ? 'bg-amber-400 text-slate-950 font-bold'
                  : 'bg-[#112338] text-amber-300 border border-amber-400/20'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>لوحة تحكم المعلم وإدارة المحتوى</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
