import React, { useState } from 'react';
import { GraduationCap, ShieldCheck, KeyRound, WifiOff, Loader2 } from 'lucide-react';
import { login, register } from '../utils/sessionStore';
import { useSession } from '../hooks/useSession';
import { getApiBase } from '../utils/serverUrl';
import { PasswordInput } from './PasswordInput';

/**
 * بوابة الدخول — لا يُفتح التطبيق إلا بحساب مُفعَّل برمز من الإدارة.
 * (نظام رموز الدخول: الإدارة تولّد الرمز ← الطالب يفعّل حسابه به)
 */
export const AuthGate: React.FC = () => {
  const { connection } = useSession();
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [forgotBusy, setForgotBusy] = useState(false);
  const [forgotNote, setForgotNote] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (mode === 'login') {
      if (!identifier.trim() || !password) {
        setError('أدخل رقم هاتفك والرقم السري');
        return;
      }
      /* الدخول يقبل الرقم السري الجديد (أرقام) أو كلمة قديمة فيها حروف */
      if (password.length < 4) { setError('الرقم السري ٤ خانات على الأقل'); return; }
    } else {
      if (name.trim().length < 3) { setError('اكتب اسمك (٣ أحرف على الأقل)'); return; }
      if (!accessCode.trim()) { setError('رمز الدخول من الإدارة مطلوب'); return; }
      if (!phone.trim()) { setError('أدخل رقم هاتفك'); return; }
      if (!/^[0-9]{9,15}$/.test(phone.replace(/[\s+]/g, ''))) { setError('رقم الهاتف ٩ أرقام على الأقل'); return; }
    }
    if (mode === 'register' && !/^[0-9]{4,6}$/.test(password)) { setError('الرقم السري ٤ إلى ٦ أرقام فقط'); return; }
    setBusy(true);
    try {
      if (mode === 'login') {
        await login(identifier.trim(), password);
      } else {
        await register({
          name: name.trim(),
          phone: phone.trim(),
          password,
          accessCode: accessCode.trim().toUpperCase(),
        });
      }
      /* نجاح الدخول: sessionStore يتحدّث ويُفتح التطبيق تلقائياً */
    } catch (err) {
      const e = err as { status?: number; message?: string };
      if (e.status === 0) setError('تعذّر الوصول للخادم — تأكد من اتصال الإنترنت وحاول مرة أخرى');
      else if (e.status === 401) setError('رقم الهاتف أو الرقم السري غير صحيح');
      else if (e.status === 429) setError('محاولات كثيرة خاطئة — استنى دقائق وجرّب تاني');
      else if (e.status === 403) setError('رمز الدخول غير صالح أو مستخدم من قبل — راجع الإدارة');
      else if (e.status === 409) setError('يوجد حساب بنفس الرقم — سجّل الدخول بدلاً من ذلك');
      else setError(e.message || 'حدث خطأ غير متوقع، حاول مرة أخرى');
    } finally {
      setBusy(false);
    }
  };

  const inputCls =
    'w-full min-h-[46px] rounded-xl bg-[#0E2440] border border-[#1B3658] px-3.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#F1AC12]/70 transition-colors';

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#071322] text-white flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden"
    >
      {/* زخرفة خلفية */}
      <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-[#0B1E36] blur-3xl opacity-80 pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-[#0B1E36] blur-3xl opacity-80 pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#F1AC12]" />

      <div className="w-full max-w-sm relative z-10">
        {/* الشعار */}
        <div className="flex flex-col items-center mb-6">
          <img
            src="/brand/logo.png"
            alt="شعار المنصة"
            className="w-24 h-24 rounded-2xl shadow-lg shadow-black/40 object-cover bg-white"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <h1 className="mt-4 text-xl font-black text-center leading-relaxed">
            منصة الطالب السوداني الذكية
          </h1>
          <p className="mt-1 text-[13px] text-[#F1AC12] font-bold flex items-center gap-1.5">
            <GraduationCap className="w-4 h-4" />
            الصف الثالث متوسط — المنهج القومي
          </p>
        </div>

        {/* بطاقة الدخول */}
        <div className="rounded-2xl border border-[#1A375A] bg-[#08182B]/95 p-5 shadow-2xl shadow-black/50">
          <p className="text-[13px] font-bold text-white flex items-center gap-2 mb-4">
            <ShieldCheck className="w-4.5 h-4.5 text-[#F1AC12] shrink-0" />
            الدخول متاح لحاملي رمز الإدارة فقط
          </p>

          {/* تبويب */}
          <div className="flex gap-2 mb-4">
            {(['register', 'login'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(''); }}
                className={`flex-1 min-h-[40px] rounded-xl text-[13px] font-bold border transition-colors cursor-pointer ${
                  mode === m
                    ? 'bg-[#F1AC12]/15 border-[#F1AC12]/60 text-[#F1AC12]'
                    : 'bg-[#0E2440] border-[#1B3658] text-slate-300 hover:border-slate-500'
                }`}
              >
                {m === 'register' ? 'تفعيل رمز جديد' : 'تسجيل الدخول'}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === 'register' ? (
              <>
                <div className="relative">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="الاسم الثلاثي"
                    autoComplete="name"
                    className={inputCls}
                  />
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-[#F1AC12] absolute top-3.5 right-3" />
                  <input
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    placeholder="رمز الدخول من الإدارة"
                    className={`${inputCls} pr-9 tracking-[0.25em] font-mono uppercase`}
                  />
                </div>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="رقم الهاتف (مثال: 0912345678)"
                  inputMode="numeric"
                  autoComplete="tel"
                  className={inputCls}
                />
                <PasswordInput
                  value={password}
                  onChange={(e) => setPassword(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                  placeholder="الرقم السري — ٤ إلى ٦ أرقام"
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="new-password"
                  className={`${inputCls} tracking-[0.3em]`}
                />
                <p className="text-[11px] text-slate-400 leading-relaxed px-1">
                  لا تملك رمزاً؟ تواصل مع إدارة المنصة للحصول على رمز دخول خاص بك.
                </p>
              </>
            ) : (
              <>
                <input
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="رقم الهاتف"
                  inputMode="numeric"
                  autoComplete="username"
                  className={inputCls}
                />
                <PasswordInput
                  value={password}
                  onChange={(e) => setPassword(e.target.value.slice(0, 32))}
                  placeholder="الرقم السري"
                  autoComplete="current-password"
                  className={inputCls}
                />
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
                      const data = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
                      setForgotNote(data?.message || data?.error || 'تم إرسال الطلب للإدارة.');
                    } catch {
                      setForgotNote('تعذّر الوصول إلى الخادم.');
                    } finally {
                      setForgotBusy(false);
                    }
                  }}
                  className="w-full min-h-[40px] rounded-xl border border-[#1B3658] text-[12px] font-bold text-slate-300 hover:border-[#F1AC12]/60 disabled:opacity-40"
                >
                  {forgotBusy ? 'جارٍ الإرسال…' : 'نسيت الرقم السري؟'}
                </button>
                {forgotNote && (
                  <p className="text-[11px] text-emerald-200 bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-3 py-2 leading-relaxed">
                    {forgotNote}
                  </p>
                )}
              </>
            )}

            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-3.5 py-2.5 text-[12px] text-red-300 leading-relaxed">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full min-h-[48px] rounded-xl bg-[#F1AC12] hover:bg-[#ffc433] disabled:opacity-60 text-[#071322] font-black text-[15px] transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              {busy ? 'لحظة…' : mode === 'register' ? 'تفعيل الحساب والدخول' : 'دخول'}
            </button>
          </form>
        </div>

        {/* حالة الاتصال */}
        <div className="mt-4 text-center">
          {connection === 'offline' ? (
            <p className="inline-flex items-center gap-1.5 text-[12px] text-amber-300/90 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-1.5">
              <WifiOff className="w-3.5 h-3.5" />
              لا يوجد اتصال — يلزم إنترنت عند أول تسجيل دخول
            </p>
          ) : (
            <p className="text-[11px] text-slate-500">المنهج القومي السوداني · بخت الرضا</p>
          )}
        </div>
      </div>
    </div>
  );
};
