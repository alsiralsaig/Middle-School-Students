import React from 'react';
import { Bell, CheckCheck, KeyRound, UserPlus, Ticket } from 'lucide-react';
import { getApiBase } from '../lib/serverUrl';

/**
 * جرس إشعارات الإدارة.
 *
 * لماذا: تسجيل طالب جديد أو طلب استعادة رقم سري كان يمرّ بصمت — المدير لا
 * يعلم إلا لو فتح الصفحة. هنا يظهر العدد فوراً وتُعرض آخر الأحداث.
 * «مقروء» يُحفظ في المتصفح: آخر وقت شاهد فيه المدير اللوحة.
 */
interface NotifItem {
  id: string;
  kind: 'student' | 'password' | 'code';
  title: string;
  detail: string;
  at: string;
}

const SEEN_KEY = 'ssp-admin-notif-seen';

const iconFor = (kind: NotifItem['kind']) => {
  if (kind === 'password') return <KeyRound className="w-4 h-4 text-rose-600" />;
  if (kind === 'code') return <Ticket className="w-4 h-4 text-amber-600" />;
  return <UserPlus className="w-4 h-4 text-emerald-600" />;
};

const ago = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'الآن';
  if (m < 60) return `قبل ${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) return `قبل ${h} ساعة`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'أمس' : `قبل ${d} أيام`;
};

export const NotificationsBell: React.FC = () => {
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<NotifItem[]>([]);
  const [seen, setSeen] = React.useState<number>(() => {
    const raw = Number(localStorage.getItem(SEEN_KEY));
    return Number.isFinite(raw) && raw > 0 ? raw : 0;
  });
  const [error, setError] = React.useState('');
  const boxRef = React.useRef<HTMLDivElement | null>(null);

  const load = React.useCallback(async () => {
    try {
      const res = await fetch(`${getApiBase()}/api/admin/notifications`, {
        headers: { Accept: 'application/json', 'X-App': 'admin' },
        credentials: 'include',
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { items: NotifItem[] };
      setItems(data.items || []);
      setError('');
    } catch {
      setError('تعذّر تحميل الإشعارات');
    }
  }, []);

  React.useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 60000);
    return () => window.clearInterval(timer);
  }, [load]);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const unread = items.filter((i) => new Date(i.at).getTime() > seen).length;

  const markSeen = () => {
    const now = Date.now();
    localStorage.setItem(SEEN_KEY, String(now));
    setSeen(now);
  };

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); if (!open) void load(); }}
        aria-label="الإشعارات"
        title="الإشعارات"
        className="relative p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-1 -left-1 min-w-[18px] h-[18px] px-1 rounded-full bg-gold-400 text-navy-900 text-[10px] font-black grid place-items-center">
            {unread > 9 ? '٩+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-2 top-16 z-[60] sm:absolute sm:inset-x-auto sm:top-full sm:left-0 sm:mt-2 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-navy-800" />
              <h3 className="text-sm font-black text-navy-800">الإشعارات</h3>
              {unread > 0 && (
                <span className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full font-bold">
                  {unread} جديد
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={markSeen}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-navy-800"
            >
              <CheckCheck className="w-3.5 h-3.5" /> تعليم كمقروء
            </button>
          </div>

          <div className="max-h-[60vh] sm:max-h-80 overflow-y-auto divide-y divide-slate-100">
            {error && <p className="p-4 text-[11px] text-rose-700 bg-rose-50">{error}</p>}
            {!error && items.length === 0 && (
              <p className="p-6 text-center text-[11px] text-slate-500">ما في إشعارات حالياً</p>
            )}
            {items.map((item) => {
              const isNew = new Date(item.at).getTime() > seen;
              return (
                <div key={item.id} className={`px-4 py-3 flex items-start gap-3 ${isNew ? 'bg-emerald-50/50' : ''}`}>
                  <div className="shrink-0 mt-0.5">{iconFor(item.kind)}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-bold text-navy-800 leading-snug">{item.title}</p>
                    <p className="text-[11px] text-slate-500 nums">{item.detail}</p>
                  </div>
                  <span className="shrink-0 text-[10px] text-slate-400">{ago(item.at)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
