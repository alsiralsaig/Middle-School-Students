import React, { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { AIAssistantView } from '../views/AIAssistantView';

/**
 * المساعد الذكي العائم — أيقونة في كل الصفحات تفتح المساعد كطبقة علوية.
 * فوق شريط التنقل السفلي (h-16) يميناً.
 */
export const AIAssistantFab: React.FC = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* الزر العائم */}
      <button
        type="button"
        aria-label="المساعد الذكي"
        onClick={() => setOpen(true)}
        className="lg:bottom-8 fixed bottom-20 left-4 z-40 w-14 h-14 rounded-full
                   bg-gradient-to-br from-[#F1AC12] to-[#d98f0a]
                   shadow-lg shadow-black/40 flex items-center justify-center
                   active:scale-95 transition-transform cursor-pointer"
      >
        <span className="absolute inset-0 rounded-full bg-[#F1AC12]/40 animate-ping opacity-30" />
        <Sparkles className="w-6 h-6 text-[#071322] relative" />
        <span
          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-[#071322]"
          aria-hidden
        />
      </button>

      {/* الطبقة العلوية للمساعد */}
      {open && (
        <div className="fixed inset-0 z-50 bg-[#071322] flex flex-col" dir="rtl">
          <div className="flex items-center justify-between px-4 h-14 border-b border-[#1C3659] bg-[#0B1E36] shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#F1AC12]" />
              <h2 className="text-[15px] font-black text-white">المساعد الذكي</h2>
              <span className="text-[10px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 rounded-md px-1.5 py-0.5">
                استرشادي
              </span>
            </div>
            <button
              type="button"
              aria-label="إغلاق"
              onClick={() => setOpen(false)}
              className="w-9 h-9 rounded-lg bg-[#0E2440] border border-[#1B3658] flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
            >
              <X className="w-5 h-5 text-slate-300" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <AIAssistantView />
          </div>
        </div>
      )}
    </>
  );
};
