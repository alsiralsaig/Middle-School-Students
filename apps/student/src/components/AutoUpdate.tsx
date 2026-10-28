import React, { useEffect, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';

/**
 * تحديث تلقائي للتطبيق (مثل حاسبة الذهب):
 * يفحص وجود نسخة جديدة من Service Worker عند الفتح وعند العودة للتطبيق وكل دقيقتين،
 * ويفعّل النسخة الجديدة ويعيد تحميل الصفحة تلقائياً مرة واحدة ليفك أي كاش قديم.
 */
export const AutoUpdate: React.FC = () => {
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    let reloaded = false;
    let registration: ServiceWorkerRegistration | null = null;

    const reloadOnce = () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    };

    const activateWaiting = () => {
      const waiting = registration?.waiting;
      if (waiting) {
        setUpdating(true);
        waiting.postMessage('skip-waiting');
        setTimeout(reloadOnce, 400);
      }
    };

    const watchInstalling = (reg: ServiceWorkerRegistration) => {
      const installing = reg.installing;
      if (!installing) return;
      installing.addEventListener('statechange', () => {
        if (installing.state === 'installed' && navigator.serviceWorker.controller) {
          activateWaiting();
        }
      });
    };

    // فقط إذا كان هناك متحكّم سابق (تحديث فوق نسخة قديمة، وليس أول زيارة)
    const hadController = Boolean(navigator.serviceWorker.controller);
    const onControllerChange = () => {
      if (hadController) reloadOnce();
    };

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    let interval: ReturnType<typeof setInterval> | undefined;
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        registration?.update().catch(() => undefined);
        setTimeout(activateWaiting, 300);
      }
    };

    void (async () => {
      try {
        registration = await navigator.serviceWorker.ready;
        await registration.update().catch(() => undefined);
        if (registration.waiting) activateWaiting();
        registration.addEventListener('updatefound', () => {
          if (registration) watchInstalling(registration);
        });
        interval = setInterval(() => {
          registration?.update().catch(() => undefined);
        }, 120_000);
        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('focus', onVisible);
      } catch {
        /* تجاهل */
      }
    })();

    return () => {
      if (interval) clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  if (!updating) return null;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[120] bg-[#F1AC12] text-[#071322] font-black text-xs px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2">
      <Download className="w-4 h-4 animate-bounce" />
      <span>جارٍ تحديث المنصة للنسخة الجديدة...</span>
      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
    </div>
  );
};
