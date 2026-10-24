import React, { useState } from 'react';
import { X, GraduationCap } from 'lucide-react';

/**
 * بانر الترحيب — يظهر عند فتح التطبيق (مرة واحدة في اليوم).
 *
 * لماذا في التطبيق لا في الصورة فقط: الصورة عمودية ٢:٣، وعرضها في بطاقة
 * عادية يقصّها. هنا تُعرض كاملة داخل شاشة الترحيب، ويقدر الطالب يقفلها.
 * «اليوم» يُحفظ في التخزين المحلي حتى ما تزعجه كل مرة يفتح التطبيق.
 */
const SEEN_KEY = 'ssp-hero-banner-seen';
const todayKey = () => new Date().toISOString().slice(0, 10);

export const WelcomeBanner: React.FC = () => {
  const [open, setOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SEEN_KEY) !== todayKey();
    } catch {
      return true;
    }
  });

  const close = (forever = false) => {
    try {
      localStorage.setItem(SEEN_KEY, forever ? 'never' : todayKey());
    } catch {
      /* تجاهل */
    }
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[100] bg-[#04101F]/95 backdrop-blur-sm flex flex-col items-center justify-center px-3 py-4"
      onClick={() => close()}
    >
      <div
        className="relative w-full max-w-sm max-h-[88vh] flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => close()}
          aria-label="إغلاق"
          className="absolute -top-2 -left-2 z-10 w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 text-white grid place-items-center"
        >
          <X className="w-4 h-4" />
        </button>

        <img
          src="/brand/hero-banner.webp"
          alt="منصة الطالب السوداني الذكية — الصف الثالث المتوسط"
          className="w-full max-h-[70vh] object-contain rounded-2xl shadow-2xl shadow-black/50"
          loading="eager"
        />

        <div className="w-full grid grid-cols-2 gap-2 mt-3">
          <button
            type="button"
            onClick={() => close()}
            className="min-h-[48px] rounded-xl bg-[#F1AC12] text-[#0B1E36] text-sm font-black hover:bg-amber-300 flex items-center justify-center gap-2"
          >
            <GraduationCap className="w-4 h-4" />
            ابدأ التعلّم
          </button>
          <button
            type="button"
            onClick={() => close(true)}
            className="min-h-[48px] rounded-xl border border-white/25 text-white/80 text-xs font-bold hover:bg-white/10"
          >
            لا تعرضها تاني
          </button>
        </div>
      </div>
    </div>
  );
};
