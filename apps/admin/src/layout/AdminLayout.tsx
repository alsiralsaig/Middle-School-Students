import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  BookOpen,
  ExternalLink,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Library,
  Menu,
  Star,
  Settings,
  Users,
  X,
} from 'lucide-react';

const NAV = [
  { to: '/', label: 'نظرة عامة', icon: LayoutDashboard, end: true },
  { to: '/subjects', label: 'المواد والدروس', icon: BookOpen },
  { to: '/content', label: 'إدارة المحتوى', icon: GraduationCap },
  { to: '/library', label: 'المكتبة', icon: Library },
  { to: '/ratings', label: 'تقييمات المحتوى', icon: Star },
  { to: '/students', label: 'الطلاب', icon: Users },
  { to: '/activities', label: 'الأنشطة والتقارير', icon: FileText },
  { to: '/settings', label: 'الإعدادات', icon: Settings },
];

export const AdminLayout: React.FC = () => {
  const [open, setOpen] = useState(false);

  /**
   * رابط تطبيق الطالب: يُقرأ من المتغير VITE_STUDENT_URL إن وُجد،
   * وإن كنّا داخل معاوية e2b يُستنتج من اسم المضيف (4000 → 3000).
   */
  const studentUrl = (() => {
    const env = (import.meta.env.VITE_STUDENT_URL as string | undefined)?.trim();
    if (env) return env;
    const m = /^4000-(.+\.e2b\.app)$/.exec(window.location.hostname);
    return m ? `https://3000-${m[1]}` : null;
  })();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${
      isActive ? 'bg-white/15 text-white' : 'text-white/75 hover:bg-white/10 hover:text-white'
    }`;

  const Sidebar = (
    <div className="flex flex-col h-full">
      {/* الشعار */}
      <div className="px-4 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <img
            src="/brand/logo.png"
            alt="شعار المنصة"
            className="w-11 h-11 rounded-xl bg-white object-contain p-0.5"
          />
          <div className="min-w-0">
            <p className="text-white font-black text-sm leading-tight">منصة الطالب السوداني</p>
            <p className="text-white/60 text-[10px]">لوحة الإدارة</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={linkClass} onClick={() => setOpen(false)}>
            <item.icon className="w-4 h-4 shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {studentUrl && (
        <div className="px-3 pb-1">
          <a
            href={studentUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-xl bg-gold-400 text-navy-900 text-xs font-extrabold hover:bg-gold-500"
          >
            <ExternalLink className="w-4 h-4" />
            فتح تطبيق الطالب
          </a>
        </div>
      )}

      {/* تنويه المرحلة */}
      <div className="p-3 border-t border-white/10">
        <div className="bg-white/10 rounded-xl p-3">
          <p className="text-white text-[10px] font-bold mb-1">المرحلة الأولى</p>
          <p className="text-white/60 text-[10px] leading-relaxed">
            واجهة تحضيرية للإدارة — الحفظ والرفع يتطلبان ربط قاعدة بيانات في المرحلة القادمة.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-50" dir="rtl">
      {/* شريط جانبي — سطح المكتب */}
      <aside
        className="hidden lg:flex w-64 shrink-0 flex-col fixed inset-y-0 right-0 z-30"
        style={{ background: 'linear-gradient(180deg, #002368 0%, #054287 100%)' }}
      >
        {Sidebar}
      </aside>

      {/* هيدر الجوال */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-40 bg-navy-800 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/brand/logo.png" alt="" className="w-8 h-8 rounded-lg bg-white object-contain" />
          <span className="font-black text-sm">لوحة الإدارة</span>
        </div>
        <button
          onClick={() => setOpen(true)}
          aria-label="فتح القائمة"
          className="p-2 rounded-lg bg-white/10"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* درج الجوال */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div
            className="relative mr-auto w-72 h-full"
            style={{ background: 'linear-gradient(180deg, #002368 0%, #054287 100%)' }}
          >
            <button
              onClick={() => setOpen(false)}
              aria-label="إغلاق القائمة"
              className="absolute left-3 top-3 p-2 rounded-lg bg-white/10 text-white"
            >
              <X className="w-4 h-4" />
            </button>
            {Sidebar}
          </div>
        </div>
      )}

      {/* المحتوى */}
      <main className="flex-1 min-w-0 lg:mr-64 pt-16 lg:pt-0">
        <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 min-w-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
