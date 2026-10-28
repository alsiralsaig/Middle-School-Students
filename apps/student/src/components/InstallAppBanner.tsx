import React, { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';

/**
 * تثبيت زي حاسبة الذهب: كروم يعرض «إضافة للشاشة الرئيسية»،
 * والآيفون يرشد للمشاركة ثم إضافة.
 */
export const InstallAppBanner: React.FC = () => {
  const [promptEvent, setPromptEvent] = useState<any>(null);
  const [iosHint, setIosHint] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const standalone =
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

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed || hidden) return null;

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  const install = async () => {
    if (isIOS) {
      setIosHint(true);
      return;
    }
    if (promptEvent?.prompt) {
      promptEvent.prompt();
      const choice = await promptEvent.userChoice.catch(() => null);
      if (choice?.outcome === 'accepted') setInstalled(true);
      setPromptEvent(null);
      return;
    }
    /* كروم أحياناً ما يطلق الحدث — نرشد للإضافة اليدوية */
    setIosHint(true);
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
        <button
          type="button"
          onClick={install}
          className="flex-1 min-h-[44px] rounded-xl bg-[#F1AC12] text-[#071322] font-black text-[13px] flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" />
          تثبيت التطبيق على الجوال
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="min-h-[44px] min-w-[44px] rounded-xl border border-[var(--ssp-border)] text-[var(--ssp-muted)] flex items-center justify-center"
          aria-label="إخفاء"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      {iosHint && (
        <p className="max-w-7xl mx-auto mt-2 text-[12px] font-bold text-[var(--ssp-text)] leading-relaxed">
          {isIOS ? (
            <>
              من Safari اضغط مشاركة <Share className="inline w-3.5 h-3.5" /> ثم «إضافة إلى الشاشة الرئيسية».
            </>
          ) : (
            <>من قائمة كروم (⋮) اختر «إضافة إلى الشاشة الرئيسية» أو «تثبيت التطبيق».</>
          )}
        </p>
      )}
    </div>
  );
};
