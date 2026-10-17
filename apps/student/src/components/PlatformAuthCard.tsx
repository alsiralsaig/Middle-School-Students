import React, { useState } from 'react';
import { LogIn, LogOut, UserPlus, Wifi, WifiOff, Loader2, ShieldCheck } from 'lucide-react';
import { useSession } from '../hooks/useSession';
import { login, logout, register } from '../utils/sessionStore';
import { runSync } from '../utils/syncEngine';

/**
 * بطاقة «حساب المنصة» — تسجيل الدخول الحقيقي مقابل خادم apps/api.
 *
 * إن تعذّر الاتصال بالخادم لا يظهر أي خطأ مزعج: تبقى المنصة تعمل
 * كاملة من المتصفح (localStorage)، وتُعرض حالة الاتصال بوضوح.
 */
export const PlatformAuthCard: React.FC = () => {
  const { user, connection, syncing, lastSyncAt } = useSession();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  const offline = connection === 'offline';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!identifier.trim() || !password.trim()) {
      setError('أدخل رقم الهاتف (أو البريد) وكلمة المرور');
      return;
    }
    if (password.length < 6) {
      setError('كلمة المرور يجب أن تكون ٦ أحرف على الأقل');
      return;
    }
    if (mode === 'register' && name.trim().length < 3) {
      setError('الاسم يجب أن يكون ٣ أحرف على الأقل');
      return;
    }

    setBusy(true);
    try {
      if (mode === 'login') {
        await login(identifier.trim(), password);
        setSuccess('تم تسجيل الدخول ✓');
      } else {
        const isMail = identifier.includes('@');
        await register({
          name: name.trim(),
          password,
          ...(isMail ? { email: identifier.trim() } : { phone: identifier.trim() }),
        });
        setSuccess('تم إنشاء الحساب ✓');
      }
      setPassword('');
      await runSync();
    } catch (err) {
      setError((err as Error).message || 'تعذّر إتمام العملية');
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    setBusy(true);
    setError('');
    setSuccess('');
    await logout();
    setBusy(false);
  };

  /* ==================== الحالة: مسجّل دخوله ==================== */
  if (user) {
    return (
      <div className="rounded-xl border border-[#1A375A] bg-[#08182B] p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate">{user.name}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {user.phone ? `📱 ${user.phone}` : user.email}
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={busy}
            className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-rose-300 bg-rose-500/10 border border-rose-500/25 px-3 py-1.5 rounded-lg hover:bg-rose-500/20 transition-colors cursor-pointer disabled:opacity-60 min-h-[36px]"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>خروج</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-[11px]">
          {offline ? (
            <span className="inline-flex items-center gap-1 text-amber-300 bg-amber-500/10 border border-amber-500/25 px-2.5 py-1 rounded-lg">
              <WifiOff className="w-3 h-3" />
              غير متصل — بياناتك محفوظة في جهازك
            </span>
          ) : syncing ? (
            <span className="inline-flex items-center gap-1 text-sky-300 bg-sky-500/10 border border-sky-500/25 px-2.5 py-1 rounded-lg">
              <Loader2 className="w-3 h-3 animate-spin" />
              جارٍ المزامنة…
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 rounded-lg">
              <Wifi className="w-3 h-3" />
              متصل{lastSyncAt ? ` · آخر مزامنة ${new Date(lastSyncAt).toLocaleTimeString('ar')}` : ''}
            </span>
          )}
        </div>
      </div>
    );
  }

  /* ==================== الحالة: زائر ==================== */
  return (
    <div className="rounded-xl border border-[#1A375A] bg-[#08182B] p-4 space-y-3">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-[#F1AC12] shrink-0" />
        <p className="text-xs font-bold text-white">حساب المنصة (اختياري)</p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode('login')}
          className={`flex-1 min-h-[36px] rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
            mode === 'login'
              ? 'bg-[#F1AC12]/15 border-[#F1AC12]/50 text-[#F1AC12]'
              : 'bg-[#0E2440] border-[#1B3658] text-slate-300 hover:border-slate-500'
          }`}
        >
          تسجيل الدخول
        </button>
        <button
          type="button"
          onClick={() => setMode('register')}
          className={`flex-1 min-h-[36px] rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
            mode === 'register'
              ? 'bg-[#F1AC12]/15 border-[#F1AC12]/50 text-[#F1AC12]'
              : 'bg-[#0E2440] border-[#1B3658] text-slate-300 hover:border-slate-500'
          }`}
        >
          حساب جديد
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2.5">
        {mode === 'register' && (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="الاسم الثلاثي"
            className="w-full min-h-[44px] rounded-lg bg-[#0E2440] border border-[#1B3658] px-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#F1AC12]/60"
          />
        )}
        <input
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="رقم الهاتف أو البريد الإلكتروني"
          inputMode={mode === 'register' ? 'text' : 'numeric'}
          className="w-full min-h-[44px] rounded-lg bg-[#0E2440] border border-[#1B3658] px-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#F1AC12]/60"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="كلمة المرور (٦ أحرف على الأقل)"
          className="w-full min-h-[44px] rounded-lg bg-[#0E2440] border border-[#1B3658] px-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#F1AC12]/60"
        />

        {error && (
          <p className="text-[11px] font-medium text-rose-300 bg-rose-500/10 border border-rose-500/25 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        {success && (
          <p className="text-[11px] font-medium text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 rounded-lg px-3 py-2">
            {success}
          </p>
        )}

        <button
          type="submit"
          disabled={busy || offline}
          className="w-full min-h-[44px] rounded-lg bg-gradient-to-l from-[#F1AC12] to-[#FCB91E] text-[#002368] text-sm font-extrabold flex items-center justify-center gap-2 hover:brightness-105 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : mode === 'login' ? (
            <LogIn className="w-4 h-4" />
          ) : (
            <UserPlus className="w-4 h-4" />
          )}
          <span>{mode === 'login' ? 'دخول' : 'إنشاء الحساب'}</span>
        </button>
      </form>

      <p className="text-[11px] leading-relaxed text-slate-400">
        {offline
          ? 'الخادم غير متاح حالياً — يمكنك متابعة استخدام المنصة كاملة، وستُزامَن بياناتك عند عودة الاتصال.'
          : 'بدون حساب تبقى بياناتك في هذا المتصفح فقط. بالحساب تُحفظ تلقائياً على الخادم.'}
      </p>
    </div>
  );
};
