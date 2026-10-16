import React from 'react';
import { AlertTriangle, Inbox, Info, Loader2, Lock } from 'lucide-react';
import type { ContentStatus } from '@shared/types';

/* ============================ بطاقة ============================ */

export const Card: React.FC<{
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}> = ({ children, className = '', title, subtitle, action }) => (
  <section className={`bg-white border border-slate-200 rounded-2xl shadow-sm ${className}`}>
    {(title || action) && (
      <header className="flex items-start justify-between gap-3 px-4 py-3 border-b border-slate-100">
        <div>
          {title && <h2 className="font-extrabold text-navy-800 text-sm">{title}</h2>}
          {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </header>
    )}
    <div className="p-4">{children}</div>
  </section>
);

/* ============================ شارة ============================ */

export const Badge: React.FC<{
  children: React.ReactNode;
  tone?: 'navy' | 'gold' | 'green' | 'amber' | 'red' | 'slate';
}> = ({ children, tone = 'navy' }) => {
  const tones: Record<string, string> = {
    navy: 'bg-navy-50 text-navy-800 border-navy-200',
    gold: 'bg-gold-100 text-gold-600 border-gold-300',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-rose-50 text-rose-700 border-rose-200',
    slate: 'bg-slate-100 text-slate-600 border-slate-200',
  };
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${tones[tone]}`}
    >
      {children}
    </span>
  );
};

/** وسم حالة المحتوى — يميّز التجريبي عن المعتمد */
export const StatusBadge: React.FC<{ status: ContentStatus }> = ({ status }) =>
  status === 'sample' ? (
    <Badge tone="amber">تجريبي</Badge>
  ) : (
    <Badge tone="green">معتمد</Badge>
  );

/* ============================ أزرار ============================ */

export const Button: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'gold' | 'ghost' | 'outline';
  disabled?: boolean;
  title?: string;
  className?: string;
  type?: 'button' | 'submit';
}> = ({ children, onClick, variant = 'primary', disabled, title, className = '', type = 'button' }) => {
  const base =
    'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all';
  const styles: Record<string, string> = {
    primary: 'bg-navy-800 text-white hover:bg-navy-500',
    gold: 'bg-gold-400 text-navy-900 hover:bg-gold-500',
    ghost: 'bg-slate-100 text-slate-600 hover:bg-slate-200',
    outline: 'border border-navy-200 text-navy-800 hover:bg-navy-50',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${base} ${styles[variant]} ${disabled ? 'opacity-60 cursor-not-allowed' : ''} ${className}`}
    >
      {disabled && <Lock className="w-3.5 h-3.5" />}
      {children}
    </button>
  );
};

/* ==================== حالات: تحميل / فارغ / خطأ ==================== */

export const LoadingState: React.FC<{ label?: string }> = ({
  label = 'جارٍ تحميل البيانات…',
}) => (
  <div className="flex flex-col items-center justify-center py-12 text-slate-500">
    <Loader2 className="w-7 h-7 animate-spin text-navy-500 mb-3" />
    <p className="text-xs">{label}</p>
  </div>
);

export const EmptyState: React.FC<{
  title: string;
  description: string;
  hint?: string;
}> = ({ title, description, hint }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center px-6">
    <div className="w-14 h-14 rounded-2xl bg-slate-100 grid place-items-center mb-3">
      <Inbox className="w-6 h-6 text-slate-400" />
    </div>
    <h3 className="font-extrabold text-sm text-navy-800">{title}</h3>
    <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-sm">{description}</p>
    {hint && (
      <p className="mt-3 text-[11px] text-slate-400 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
        {hint}
      </p>
    )}
  </div>
);

export const ErrorState: React.FC<{ title: string; description: string }> = ({
  title,
  description,
}) => (
  <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-xl p-4">
    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
    <div>
      <h3 className="font-extrabold text-sm text-rose-800">{title}</h3>
      <p className="text-xs text-rose-700 mt-1 leading-relaxed">{description}</p>
    </div>
  </div>
);

/** تنبيه بأن الميزة غير مُفعّلة في هذه المرحلة */
export const NotConnectedNote: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
    <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
    <p className="text-[11px] text-amber-800 leading-relaxed">{children}</p>
  </div>
);

/* ============================ جدول ============================ */

export const Table: React.FC<{
  head: string[];
  children: React.ReactNode;
}> = ({ head, children }) => (
  <div className="w-full max-w-full overflow-x-auto -mx-4 px-4">
    <table className="w-full text-xs min-w-[520px]">
      <thead>
        <tr className="text-slate-500 border-b border-slate-200">
          {head.map((h) => (
            <th key={h} className="text-right font-bold py-2.5 px-3 whitespace-nowrap">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">{children}</tbody>
    </table>
  </div>
);
