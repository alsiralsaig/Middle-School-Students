import React, { useEffect, useState } from 'react';
import { Download, Share, X, MoreVertical, CheckCircle2 } from 'lucide-react';

declare global {
  interface Window {
    __sspDeferredPrompt?: any;
  }
}

/**
 * تثبيت التطبيق على الجوال (مثل حاسبة الذهب تماماً):
 * يلتقط حدث التثبيت المبكر من المتصفح ليعمل التثبيت بنقرة واحدة في كروم،
 * ويعرض خطوات واضحة للآيفون أو المتصفحات الأخرى، ويختفي تلقائياً بعد التثبيت أو داخل الـAPK.
 */
export const InstallAppBanner: React.FC = () => {
  const [promptEvent, setPromptEvent] = useState<any>(() =>
    typeof window !== 'undefined' ? window.__sspDeferredPrompt ?? null : null
  );
  const [showGuide, setShowGuide] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);

  useEffect(() => {
    const isApkWrapper = /SSPApp\//i.test(window.navigator.userAgent);
    const standalone =
      isApkWrapper ||
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (standalone) {
      setInstalled(true);
      return;
    }

    try {
      if (sessionStorage.getItem('ssp.install.hide') === '1') setHidden(true);
    } catch {
      /* تجاهل */
    }

    if (window.__sspDeferredPrompt) {
      setPromptEvent(window.__sspDeferredPrompt);
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      window.__sspDeferredPrompt = e;
      setPromptEvent(e);
    };
    const onInstalled = () => {
      window.__sspDeferredPrompt = null;
      setPromptEvent(null);
      setJustInstalled(true);
      setTimeout(() => setInstalled(true), 2500);
    };

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed || hidden) return null;

  const isIOS =
    typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);

  const install = async () => {
    if (isIOS) {
      setShowGuide((v) => !v);
      return;
    }
    const deferred = promptEvent || window.__sspDeferredPrompt;
    if (deferred?.prompt) {
      try {
        await deferred.prompt();
        const choice = await deferred.userChoice.catch(() => null);
        if (choice?.outcome === 'accepted') {
          window.__sspDeferredPrompt = null;
          setPromptEvent(null);
          setJustInstalled(true);
          setTimeout(() => setInstalled(true), 2500);
          return;
        }
      } catch {
        /* نكمل لعرض الإرشاد اليدوي */
      }
    }
    setShowGuide((v) => !v);
  };

  const dismiss = () => {
    setHidden(true);
    try {
      sessionStorage.setItem('ssp.install.hide', '1');
    } catch {
      /* تجاهل */
    }
  };

  return (
    <div className="px-3 py-2 border-b border-[var(--ssp-border)] bg-[var(--ssp-card)]">
      <div className="max-w-7xl mx-auto flex items-center gap-2">
        {justInstalled ? (
          <div className="flex-1 min-h-[44px] rounded-xl bg-emerald-600 text-white font-black text-[13px] flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            تم تثبيت التطبيق على شاشة جوالك بنجاح!
          </div>
        ) : (
          <button
            type="button"
            onClick={install}
            className="flex-1 min-h-[44px] rounded-xl bg-[#F1AC12] hover:bg-[#ffc433] text-[#071322] font-black text-[13px] flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            {promptEvent ? 'تثبيت التطبيق بنقرة واحدة الآن' : 'تثبيت التطبيق على الجوال'}
          </button>
        )}
        <button
          type="button"
          onClick={dismiss}
          className="min-h-[44px] min-w-[44px] rounded-xl border border-[var(--ssp-border)] text-[var(--ssp-muted)] flex items-center justify-center cursor-pointer"
          aria-label="إخفاء"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      {showGuide && !justInstalled && (
        <div className="max-w-7xl mx-auto mt-2 rounded-xl border border-[var(--ssp-border)] bg-[var(--ssp-bg)] px-3 py-2.5 text-[12px] font-bold text-[var(--ssp-text)] leading-relaxed">
          {isIOS ? (
            <p>
              من متصفح Safari اضغط زر المشاركة <Share className="inline w-3.5 h-3.5 mx-0.5" /> ثم اختر{' '}
              <span className="underline">«إضافة إلى الشاشة الرئيسية»</span>.
            </p>
          ) : (
            <p>
              اضغط قائمة المتصفح <MoreVertical className="inline w-3.5 h-3.5 mx-0.5" /> (النقاط الثلاث أعلى الشاشة) ثم اختر{' '}
              <span className="underline">«تثبيت التطبيق»</span> أو{' '}
              <span className="underline">«إضافة إلى الشاشة الرئيسية»</span>.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
