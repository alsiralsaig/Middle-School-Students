import React, { useEffect, useState } from 'react';
import { X, Server, CheckCircle2, RotateCcw, Loader2, AlertTriangle } from 'lucide-react';
import {
  getApiBase,
  setApiBase,
  clearApiBase,
  hasCustomApiBase,
  getDefaultApiBase,
} from '../utils/serverUrl';

/**
 * نافذة ضبط عنوان الخادم.
 *
 * تفتح في حالتين:
 *   ١. داخل حزمة APK ولم يضبط المستخدم العنوان بعد (تلقائياً عند أول تشغيل)
 *   ٢. بزيارة الرابط `#server`
 *
 * لماذا؟ حزمة APK تُبنى مرة واحدة، وعنوان الخادم يُعرف بعد النشر.
 * هذه النافذة تغني عن إعادة بناء الحزمة كلما تغيّر العنوان.
 */

/** داخل الحزمة يُحمَّل التطبيق من نطاق محلي وهمي */
const isApkBundle =
  typeof window !== 'undefined' && window.location.hostname === 'app.local';

type TestState = 'idle' | 'testing' | 'ok' | 'fail';

export const ServerSetupDialog: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [test, setTest] = useState<TestState>('idle');
  const [message, setMessage] = useState('');

  // فتح تلقائي داخل الحزمة عند أول تشغيل
  useEffect(() => {
    if (isApkBundle && !hasCustomApiBase()) setOpen(true);
  }, []);

  // فتح عبر الرابط #server
  useEffect(() => {
    const onHash = () => {
      if (window.location.hash === '#server') setOpen(true);
    };
    onHash();
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    if (open) {
      setValue(hasCustomApiBase() ? getApiBase() : '');
      setTest('idle');
      setMessage('');
    }
  }, [open]);

  const close = () => {
    setOpen(false);
    if (window.location.hash === '#server') {
      window.history.replaceState(null, '', window.location.pathname);
    }
  };

  const testConnection = async () => {
    const base = value.trim().replace(/\/+$/, '');
    if (!base) {
      setTest('fail');
      setMessage('اكتب عنوان الخادم أولاً');
      return;
    }
    setTest('testing');
    setMessage('');
    try {
      const res = await fetch(`${base}/api/subjects`, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { subjects?: unknown[] };
      setTest('ok');
      setMessage(
        `✅ الاتصال ناجح — ${data.subjects?.length ?? 0} مادة في قاعدة البيانات`,
      );
    } catch {
      setTest('fail');
      setMessage('❌ تعذّر الوصول. تأكد من العنوان وأن الخادم يعمل.');
    }
  };

  const save = () => {
    setApiBase(value);
    setTest('idle');
    setMessage('✅ حُفظ العنوان');
    window.setTimeout(close, 700);
  };

  const reset = () => {
    clearApiBase();
    setValue('');
    setTest('idle');
    setMessage('أُعيد العنوان إلى الافتراضي');
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="ضبط عنوان الخادم"
    >
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
        <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-navy-800" />
            <h2 className="text-base font-black text-navy-800">
              عنوان الخادم
            </h2>
          </div>
          <button
            onClick={close}
            aria-label="إغلاق"
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="p-5 space-y-4">
          <p className="text-xs leading-relaxed text-slate-600">
            {isApkBundle
              ? 'هذه نسخة مثبّتة على جهازك. اكتب عنوان الخادم مرة واحدة وسيُحفظ — لن تحتاج إلى إعادة تثبيت التطبيق عند تغييره.'
              : 'اترك الحقل فارغاً لاستخدام العنوان الافتراضي.'}
          </p>

          <div>
            <label
              htmlFor="apiBase"
              className="block text-xs font-bold text-slate-700 mb-1.5"
            >
              العنوان الكامل للخادم
            </label>
            <input
              id="apiBase"
              type="url"
              dir="ltr"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setTest('idle');
                setMessage('');
              }}
              placeholder="https://my-api.onrender.com"
              className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-gold-500 focus:border-gold-500 outline-none text-left"
            />
            <p className="mt-1.5 text-[11px] text-slate-400">
              الافتراضي الآن:{' '}
              <span dir="ltr" className="font-mono">
                {getDefaultApiBase()}
              </span>
            </p>
          </div>

          {message && (
            <p
              className={`text-xs font-bold ${
                test === 'fail' ? 'text-red-600' : 'text-emerald-700'
              }`}
            >
              {message}
            </p>
          )}

          {test === 'fail' && (
            <div className="flex items-start gap-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                إن كنت تستضيف الخادم على Render، فالنسخة المجانية تنام بعد
                ١٥ دقيقة — قد يستغرق أول اتصال نحو دقيقة.
              </span>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={testConnection}
              disabled={test === 'testing'}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-navy-800 text-navy-800 text-sm font-bold hover:bg-navy-50 disabled:opacity-50"
            >
              {test === 'testing' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              اختبار الاتصال
            </button>
            <button
              onClick={reset}
              aria-label="إعادة العنوان الافتراضي"
              className="px-3 py-2.5 rounded-xl border border-slate-300 text-slate-500 hover:bg-slate-50"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={save}
            className="w-full py-3 rounded-xl bg-navy-800 text-white font-black text-sm hover:bg-navy-700"
          >
            حفظ العنوان
          </button>
        </div>
      </div>
    </div>
  );
};
