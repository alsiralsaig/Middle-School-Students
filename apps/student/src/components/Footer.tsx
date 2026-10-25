import React from 'react';
import { ViewMode } from '../types';
import { GraduationCap, BookCheck, ShieldAlert, Award, Heart } from 'lucide-react';

interface FooterProps {
  onNavigate: (view: ViewMode) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-[#071322] text-slate-300 border-t border-[#14263D] mt-16 pb-20 lg:pb-8 pt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Column 1: Platform Identity */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 font-bold">
                <GraduationCap className="w-5 h-5" />
              </div>
              <span className="text-lg font-bold text-white">منصة الطالب السوداني الذكية</span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed max-w-md">
              منصة تعليمية متخصصة ومصممة لخدمة طلاب الصف الثالث المتوسط في كافة ولايات السودان،
              تهدف لتيسير دراسة المنهج السوداني القومي، ومراجعة الدروس، والتدريب على نماذج امتحانات الشهادة المتوسطة.
            </p>
            <div className="flex items-center gap-2 text-xs text-amber-400/90 pt-1">
              <Award className="w-4 h-4 text-amber-400 shrink-0" />
              <span>مطابق وموجه لمقررات التعليم المتوسط المعتمدة في جمهورية السودان</span>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white tracking-wide">أقسام المنصة</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <button
                  onClick={() => onNavigate('subjects')}
                  className="hover:text-amber-300 transition-colors cursor-pointer inline-block py-2 min-h-[36px]"
                >
                  المواد الدراسية المقررة
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('resources')}
                  className="hover:text-amber-300 transition-colors cursor-pointer inline-block py-2 min-h-[36px]"
                >
                  بنك المذكرات والملخصات
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('exams')}
                  className="hover:text-amber-300 transition-colors cursor-pointer inline-block py-2 min-h-[36px]"
                >
                  نماذج الامتحانات والاختبارات
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('ai-assistant')}
                  className="hover:text-amber-300 transition-colors cursor-pointer inline-block py-2 min-h-[36px]"
                >
                  المساعد التعليمي الاسترشادي
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('student-dashboard')}
                  className="hover:text-amber-300 transition-colors cursor-pointer inline-block py-2 min-h-[36px]"
                >
                  لوحة متابعة إنجاز الطالب
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Transparency Note & Phase 1 Scope */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white tracking-wide">كيف تذاكر معنا؟</h4>
            <div className="bg-[#0B1E36] p-3.5 rounded-xl border border-[#1A3353] text-xs text-slate-300 space-y-2">
              <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
                <ShieldAlert className="w-4 h-4" />
                <span>خطة مذاكرة في ٣ خطوات</span>
              </div>
              <p className="text-slate-400 leading-normal">
                اقرأ شرح الدرس وملخصه ← حل أسئلة الدرس والاختبارات ← حمّل المذكرات والملفات على جهازك عشان تفتحها بدون إنترنت وقت الامتحان.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <span>صُنعت بعناية لدعم تفوق طلاب السودان</span>
            <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500 inline" />
          </div>
          <div>
            <span>جميع الحقوق محفوظة © {new Date().getFullYear()} - منصة الطالب السوداني الذكية</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
