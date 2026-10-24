import React, { useState } from 'react';
import { Phone, X } from 'lucide-react';
import { useSession } from '../hooks/useSession';

/**
 * أرقام الدعم — مصدر واحد للحقيقة، مثل ما عملنا في منصة سند.
 * `raw` بصيغة دولية بلا علامة + (هي الصيغة التي يقبلها واتساب و tel:).
 */
export const SUPPORT_PHONES = [
  { raw: '249913009060', display: '+249 91 300 9060', label: 'الدعم الفني والإدارة' },
  { raw: '249114537190', display: '+249 11 453 7190', label: 'الاستفسارات والاشتراكات' },
] as const;

/** رابط محادثة واتساب مع رسالة جاهزة */
export const waHref = (raw: string, message: string) =>
  `https://wa.me/${raw}?text=${encodeURIComponent(message)}`;

const WhatsAppGlyph: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.65.07-.3-.15-1.13-.42-2.15-1.33-.8-.71-1.33-1.59-1.48-1.89-.15-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.6-.92-2.19-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.01-1.04 2.47s1.06 2.87 1.21 3.07c.15.2 2.09 3.19 5.06 4.35.71.3 1.26.48 1.69.62.71.22 1.36.19 1.87.12.57-.09 1.75-.71 2-1.41.25-.7.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35z" />
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2zm0 18.13c-1.5 0-2.97-.4-4.26-1.17l-.31-.18-3.16.83.84-3.08-.2-.32a8.19 8.19 0 0 1-1.26-4.35c0-4.54 3.7-8.23 8.24-8.23 4.54 0 8.23 3.69 8.23 8.23 0 4.54-3.69 8.23-8.23 8.23z" />
  </svg>
);

/**
 * زر واتساب عائم — نفس فكرة منصة سند: ضغطة واحدة تفتح محادثة مع الدعم
 * برسالة جاهزة فيها اسم الطالب ورقمه، فلا يكتب الطالب شيئاً.
 */
export const WhatsAppFab: React.FC = () => {
  const { user } = useSession();
  const [open, setOpen] = useState(false);

  const greeting =
    'مرحباً، أنا ' +
    (user?.name || 'طالب') +
    (user?.phone ? ` (رقمي ${user.phone})` : '') +
    ' من منصة الطالب السوداني الذكية — الصف الثالث متوسط. عندي استفسار: ';

  return (
    <>
      <button
        type="button"
        aria-label="تواصل معنا على واتساب"
        onClick={() => setOpen(true)}
        className="lg:bottom-8 fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full
                   bg-[#25D366] shadow-lg shadow-black/40 flex items-center justify-center
                   active:scale-95 transition-transform cursor-pointer"
      >
        <span className="absolute inset-0 rounded-full bg-[#25D366]/40 animate-ping opacity-25" />
        <WhatsAppGlyph className="w-7 h-7 text-white relative" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" dir="rtl">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="relative w-full sm:max-w-sm bg-[#0B1E36] border border-[#1C3659] rounded-t-3xl sm:rounded-3xl p-5 pb-7 shadow-2xl">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-[15px] font-black text-white flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-[#25D366] flex items-center justify-center">
                  <WhatsAppGlyph className="w-4 h-4 text-white" />
                </span>
                تواصل معنا
              </h2>
              <button
                type="button"
                aria-label="إغلاق"
                onClick={() => setOpen(false)}
                className="w-9 h-9 rounded-lg bg-[#0E2440] border border-[#1B3658] flex items-center justify-center cursor-pointer active:scale-95"
              >
                <X className="w-5 h-5 text-slate-300" />
              </button>
            </div>
            <p className="text-[12px] text-slate-400 mb-4 leading-relaxed">
              اضغط الرقم وبنفتح لك واتساب ورسالة جاهزة — ما تحتاج تكتب حاجة.
            </p>

            <div className="space-y-2.5">
              {SUPPORT_PHONES.map((p) => (
                <div
                  key={p.raw}
                  className="rounded-2xl border border-[#1B3658] bg-[#0E2440] p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-[11px] text-[#F1AC12] font-bold">{p.label}</div>
                      <div className="text-[14px] font-black text-white" dir="ltr">
                        {p.display}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <a
                        href={waHref(p.raw, greeting)}
                        target="_blank"
                        rel="noreferrer"
                        className="min-h-[38px] px-3 rounded-xl bg-[#25D366] text-[#06240f] text-[12px] font-black flex items-center gap-1.5"
                      >
                        <WhatsAppGlyph className="w-4 h-4" />
                        واتساب
                      </a>
                      <a
                        href={`tel:+${p.raw}`}
                        aria-label={`اتصال ${p.display}`}
                        className="min-h-[38px] w-10 rounded-xl bg-[#122B4A] border border-[#1B3658] flex items-center justify-center"
                      >
                        <Phone className="w-4 h-4 text-slate-300" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
