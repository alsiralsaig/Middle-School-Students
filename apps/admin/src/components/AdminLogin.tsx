import React, { useState } from 'react';
import { KeyRound, LogIn, MailQuestion, ShieldCheck } from 'lucide-react';
import { getApiBase } from '../lib/serverUrl';

/**
 * بوابة دخول لوحة الإدارة.
 *
 * لماذا أُضيفت: مسارات الإدارة على الخادم محمية بـ `requireAdmin`، الذي
 * يشترط دور مدير **و** رمزاً صادراً عن لوحة الإدارة. فلا يمكن لإدارة
 * المنصة توليد رموز الدخول إن لم تكن مسجّلة دخولها أولاً.
 *
 * الحساب التجريبي في بيانات البذر: الهاتف ١٠٠٠٠٠٠٠٠٠ · admin12345
 */
export const AdminLogin: React.FC<{
  onLogin: (identifier: string, password: string) => Promise<unknown>;
  error?: string;
  /** true = تعذّر الوصول إلى الخادم — نعرض زر المعاينة */
  offline?: boolean;
  onPreview?: () => void;
}> = ({ onLogin, error, offline, onPreview }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [forgot, setForgot] = useState(false);
  const [forgotNote, setForgotNote] = useState('');
  const [forgotBusy, setForgotBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr('');
    try {
      await onLogin(identifier.trim(), password);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'تعذّر تسجيل الدخول');
    } finally {
      setBusy(false);
    }
  };

  const shown = err || error || '';

  return (
    <div
      className="min-h-screen grid place-items-center px-4 py-10"
      style={{ background: 'linear-gradient(160deg, #002368 0%, #054287 60%, #0a5aa8 100%)' }}
      dir="rtl"
    >
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <img
            src="/brand/logo.png"
            alt="شعار المنصة"
            className="w-20 h-20 rounded-2xl bg-white object-contain p-1 shadow-lg"
          />
          <h1 className="mt-4 text-white text-lg font-black">لوحة الإدارة</h1>
          <p className="text-white/60 text-xs mt-1">منصة الطالب السوداني الذكية</p>
        </div>

        <form
          onSubmit={submit}
          className="bg-white rounded-2xl shadow-xl p-5 space-y-4"
        >
          <div className="flex items-center gap-2 text-navy-800">
            <ShieldCheck className="w-4 h-4" />
            <h2 className="font-extrabold text-sm">دخول الإدارة</h2>
          </div>

          <label className="block">
            <span className="text-[11px] font-bold text-slate-600">الهاتف أو البريد</span>
            <input
              type="text"
              inputMode="tel"
              autoComplete="username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="1000000000"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm nums focus:border-navy-800 focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="text-[11px] font-bold text-slate-600">كلمة المرور</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-navy-800 focus:outline-none"
            />
          </label>

          {shown && (
            <p className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 leading-relaxed">
              {shown}
            </p>
          )}

          <button
            type="button"
            onClick={() => { setForgot((v) => !v); setForgotNote(''); }}
            className="text-[11px] font-bold text-navy-700 hover:underline cursor-pointer"
          >
            نسيت كلمة المرور؟
          </button>

          {forgot && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
              <p className="text-[10px] text-slate-600 leading-relaxed">
                اكتب رقم الهاتف أو البريد، ويوصل طلبك للإدارة — هي اللي تُصدر كلمة مرور مؤقتة.
              </p>
              <button
                type="button"
                disabled={forgotBusy || !identifier.trim()}
                onClick={async () => {
                  setForgotBusy(true); setForgotNote('');
                  try {
                    const res = await fetch(`${getApiBase()}/api/auth/forgot`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'X-App': 'admin' },
                      body: JSON.stringify({ identifier: identifier.trim() }),
                    });
                    const data = await res.json().catch(() => null) as { message?: string; error?: string } | null;
                    setForgotNote(data?.message || data?.error || 'تم إرسال الطلب.');
                  } catch {
                    setForgotNote('تعذّر الوصول إلى الخادم.');
                  } finally {
                    setForgotBusy(false);
                  }
                }}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-white border border-navy-800 px-3 py-2.5 text-[11px] font-bold text-navy-800 hover:bg-navy-50 disabled:opacity-50"
              >
                <MailQuestion className="w-3.5 h-3.5" />
                {forgotBusy ? 'جارٍ الإرسال…' : 'أرسل طلب الاستعادة'}
              </button>
              {forgotNote && (
                <p className="text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1.5 leading-relaxed">{forgotNote}</p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={busy || !identifier.trim() || !password}
            className="w-full inline-flex items-center justify-center gap-2 bg-navy-800 text-white font-extrabold text-sm px-4 py-3 rounded-xl hover:bg-navy-700 transition-colors disabled:opacity-60 cursor-pointer"
          >
            {busy ? (
              'جارٍ الدخول…'
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                دخول
              </>
            )}
          </button>

          {offline && onPreview && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
              <p className="text-[10px] text-amber-800 leading-relaxed">
                لا يمكن الوصول إلى الخادم من هذا الجهاز. يمكنك استعراض
                اللوحة الآن، لكن <strong>لن يُحفظ شيء</strong>.
              </p>
              <button
                type="button"
                onClick={onPreview}
                className="w-full bg-amber-500 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl hover:bg-amber-600 cursor-pointer"
              >
                استعراض اللوحة بدون خادم
              </button>
            </div>
          )}

          <p className="text-[10px] text-slate-400 text-center leading-relaxed flex items-center justify-center gap-1.5">
            <KeyRound className="w-3 h-3" />
            هذا الدخول للإدارة فقط — تطبيق الطالب لا يقبل حسابات الإدارة
          </p>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
