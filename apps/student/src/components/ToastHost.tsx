import React, { useEffect, useRef, useState } from 'react';
import { AlarmClock, Bell, CheckCircle2, GraduationCap, X } from 'lucide-react';
import { ViewMode } from '../types';
import { ToastItem, ToastTone, onToast } from '../utils/toastBus';

interface ToastHostProps {
  onNavigate?: (view: ViewMode, id?: string) => void;
}

const TONE_STYLE: Record<ToastTone, { wrap: string; icon: React.ElementType; iconClass: string }> = {
  info: {
    wrap: 'border-slate-200 bg-white text-slate-800',
    icon: Bell,
    iconClass: 'bg-slate-100 text-slate-600',
  },
  success: {
    wrap: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    icon: CheckCircle2,
    iconClass: 'bg-emerald-100 text-emerald-700',
  },
  warning: {
    wrap: 'border-amber-200 bg-amber-50 text-amber-900',
    icon: AlarmClock,
    iconClass: 'bg-amber-100 text-amber-700',
  },
  exam: {
    wrap: 'border-rose-200 bg-rose-50 text-rose-900',
    icon: GraduationCap,
    iconClass: 'bg-rose-100 text-rose-700',
  },
};

/**
 * حاوية التنبيهات المنبثقة — تُركّب مرة واحدة في التطبيق،
 * وتستقبل كل التنبيهات عبر ناقل الأحداث (toastBus).
 */
export const ToastHost: React.FC<ToastHostProps> = ({ onNavigate }) => {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    return onToast((payload) => {
      const item: ToastItem = {
        id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        tone: payload.tone ?? 'info',
        durationMs: payload.durationMs ?? 7000,
        ...payload,
      };
      setItems((prev) => [item, ...prev].slice(0, 3));

      timers.current[item.id] = setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== item.id));
        delete timers.current[item.id];
      }, item.durationMs);
    });
  }, []);

  useEffect(() => {
    const t = timers.current;
    return () => {
      Object.values(t).forEach(clearTimeout);
    };
  }, []);

  const dismiss = (id: string) => {
    if (timers.current[id]) clearTimeout(timers.current[id]);
    delete timers.current[id];
    setItems((prev) => prev.filter((t) => t.id !== id));
  };

  if (items.length === 0) return null;

  return (
    <div
      className="fixed inset-x-3 top-3 sm:inset-x-auto sm:left-6 sm:top-20 z-[100] flex flex-col gap-2 pointer-events-none"
      role="region"
      aria-label="التنبيهات المنبثقة"
      dir="rtl"
    >
      {items.map((t) => {
        const tone = TONE_STYLE[t.tone];
        const Icon = tone.icon;
        const clickable = Boolean(t.targetView && onNavigate);
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-2xl border p-3 shadow-lg backdrop-blur animate-in slide-in-from-top-2 duration-300 ${tone.wrap}`}
            role="status"
          >
            <div className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${tone.iconClass}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-extrabold leading-snug">{t.title}</p>
              {t.message && <p className="text-[11px] mt-0.5 opacity-80 leading-relaxed">{t.message}</p>}
              {clickable && (
                <button
                  onClick={() => {
                    onNavigate?.(t.targetView!, t.targetId);
                    dismiss(t.id);
                  }}
                  className="mt-1.5 text-[11px] font-bold underline underline-offset-2"
                >
                  فتح الآن
                </button>
              )}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="إغلاق التنبيه"
              className="p-1 rounded-lg opacity-60 hover:opacity-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
