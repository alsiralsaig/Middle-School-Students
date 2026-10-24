import React, { useState } from 'react';
import { LogIn, LogOut, UserPlus, Wifi, WifiOff, Loader2, ShieldCheck, KeyRound } from 'lucide-react';
import { getApiBase } from '../utils/serverUrl';
import { PasswordInput } from './PasswordInput';
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
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');
  const [forgotNote, setForgotNote] = useState('');
  const [forgotBusy, setForgotBusy] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNext, setPwNext] = useState('');
  const [pwNote, setPwNote] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  const offline = connection === 'offline';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!identifier.trim() || !password.trim()) {
      setError('أدخل رقم الهاتف والرقم السري');
      return;
    }
    if (mode === 'register' && !/^[0-9]{4,6}$/.test(password.trim())) {
      setError('الرقم السري ٤ إلى ٦ أرقام فقط');
      return;
    }
    if (mode === 'login' && password.trim().length < 4) {
      setError('الرقم السري ٤ خانات على الأقل');
      return;
    }
    if (mode === 'register' && !/^[0-9]{9,15}$/.test(identifier.replace(/[\s+]/g, ''))) {
      setError('أدخل رقم هاتف صحيح (٩ أرقام على الأقل)');
      return;
    }
    if (mode === 'register' && name.trim().length < 3) {
      setError('الاسم يجب أن يكون ٣ أحرف على الأقل');
      return;
    }
    if (mode === 'register' && !accessCode.trim()) {
      setError('أدخل رمز الدخول الذي استلمته من الإدارة');
      return;
    }

    setBusy(true);
    try {
      if (mode === 'login') {
        await login(identifier.trim(), password);
        setSuccess('تم تسجيل الدخول ✓');
      } else {
        await register({
          name: name.trim(),
          password: password.trim(),
          accessCode: accessCode.trim(),
          phone: identifier.trim(),
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

        {/* تغيير كلمة المرور — للحساب المسجّل على الخادم */}
        <button
          type="button"
          onClick={() => { setPwOpen((v) => !v); setPwNote(''); }}
          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-300 hover:text-white"
        >
          <KeyRound className="w-3.5 h-3.5" />
          تغيير الرقم السري
        </button>

        {pwOpen && (
          <div className="space-y-2 rounded-lg border border-[#1B3658] bg-[#0B2039] p-2.5">
            <PasswordInput
              autoComplete="current-password"
              maxLength={32}
              value={pwCurrent}
              onChange={(e) => setPwCurrent(e.target.value.slice(0, 32))}
              placeholder="الرقم السري الحالي"
              className="w-full min-h-[40px] rounded-lg bg-[#0E2440] border border-[#1B3658] px-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#F1AC12]/60 tracking-[0.3em]"
            />
            <PasswordInput
              autoComplete="new-password"
              inputMode="numeric"
              maxLength={6}
              value={pwNext}
              onChange={(e) => setPwNext(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
              placeholder="الرقم السري الجديد (٤–٦ أرقام)"
              className="w-full min-h-[40px] rounded-lg bg-[#0E2440] border border-[#1B3658] px-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#F1AC12]/60 tracking-[0.3em]"
            />
            <button
              type="button"
              disabled={pwBusy || !pwCurrent || !/^[0-9]{4,6}$/.test(pwNext)}
              onClick={async () => {
                setPwBusy(true); setPwNote('');
                try {
                  const res = await fetch(`${getApiBase()}/api/auth/password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-App': 'student' },
                    credentials: 'include',
                    body: JSON.stringify({ currentPassword: pwCurrent, newPassword: pwNext }),
                  });
                  const data = await res.json().catch(() => null) as { error?: string } | null;
                  if (!res.ok) throw new Error(data?.error || String(res.status));
                  setPwNote('تم تغيير الرقم السري بنجاح.');
                  setPwCurrent(''); setPwNext('');
                } catch (e) {
                  setPwNote(e instanceof Error ? e.message : 'تعذّر تغيير الرقم السري');
                } finally {
                  setPwBusy(false);
                }
              }}
              className="w-full min-h-[40px] rounded-lg bg-[#F1AC12] text-[#0B1E36] text-xs font-black hover:bg-amber-300 disabled:opacity-50"
            >
              {pwBusy ? 'جارٍ الحفظ…' : 'حفظ الرقم السري'}
            </button>
            {pwNote && <p className="text-[11px] text-slate-200 leading-relaxed">{pwNote}</p>}
          </div>
        )}
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
        {mode === 'register' && (
          <div>
            <input
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
              placeholder="رمز الدخول من الإدارة"
              autoCapitalize="characters"
              inputMode="text"
              maxLength={8}
              className="w-full min-h-[44px] rounded-lg bg-[#0E2440] border border-[#1B3658] px-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#F1AC12]/60 tracking-[0.2em] font-mono"
            />
            <p className="text-[10px] text-slate-400 mt-1 leading-relaxed px-1">
              تستلمه من إدارة المدرسة — يُستخدم مرة واحدة عند إنشاء الحساب
            </p>
          </div>
        )}
        <input
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="رقم الهاتف"
          inputMode="numeric"
          className="w-full min-h-[44px] rounded-lg bg-[#0E2440] border border-[#1B3658] px-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#F1AC12]/60"
        />
        <PasswordInput
          value={password}
          onChange={(e) => setPassword(
            mode === 'register' ? e.target.value.replace(/[^0-9]/g, '').slice(0, 6) : e.target.value.slice(0, 32),
          )}
          placeholder={mode === 'register' ? 'الرقم السري (٤–٦ أرقام)' : 'الرقم السري'}
          inputMode={mode === 'register' ? 'numeric' : 'text'}
          autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          maxLength={mode === 'register' ? 6 : 32}
          className="w-full min-h-[44px] rounded-lg bg-[#0E2440] border border-[#1B3658] px-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#F1AC12]/60 tracking-[0.3em]"
        />

        {mode === 'login' && (
          <button
            type="button"
            disabled={forgotBusy || !identifier.trim()}
            onClick={async () => {
              setForgotBusy(true); setForgotNote('');
              try {
                const res = await fetch(`${getApiBase()}/api/auth/forgot`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'X-App': 'student' },
                  body: JSON.stringify({ identifier: identifier.trim() }),
                });
                const data = await res.json().catch(() => null) as { message?: string; error?: string } | null;
                setForgotNote(data?.message || data?.error || 'تم إرسال الطلب للإدارة.');
              } catch {
                setForgotNote('تعذّر الوصول إلى الخادم.');
              } finally {
                setForgotBusy(false);
              }
            }}
            className="w-full min-h-[40px] inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#1B3658] text-[11px] font-bold text-slate-300 hover:border-[#F1AC12]/60 disabled:opacity-40"
          >
            <KeyRound className="w-3.5 h-3.5" />
            {forgotBusy ? 'جارٍ الإرسال…' : 'نسيت الرقم السري؟'}
          </button>
        )}

        {forgotNote && (
          <p className="text-[11px] text-emerald-200 bg-emerald-500/10 border border-emerald-500/25 rounded-lg px-3 py-2 leading-relaxed">
            {forgotNote}
          </p>
        )}

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
