/**
 * محرّك عرض PDF — يُحمَّل مرة واحدة ويُخزَّن للاستخدام بدون إنترنت.
 *
 * لماذا ملف مستقل؟ لأن محرّك pdf.js حزمة ثقيلة (~316 كيلوبايت) لا يصح
 * تحميلها مع أول فتح للتطبيق. لكن لو حمّلناها **لحظة فتح الملف** والطالب
 * بلا إنترنت، سيفشل العرض. لذلك نُسخّن المحرّك (warm) في وقتين:
 *   ١. بعد نجاح تحميل أي ملف — لأن الطالب سيقرأه لاحقاً بلا إنترنت.
 *   ٢. في وقت فراغ المتصفح عند فتح صفحة المادة (requestIdleCallback).
 * والتخزين يتم تلقائياً عبر الـ Service Worker (كاش الأصول).
 */

let enginePromise: Promise<any> | null = null;

async function boot(): Promise<any> {
  const pdfjs: any = await import('pdfjs-dist');
  const workerSrc = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
  return pdfjs;
}

/** يُرجع محرّك pdf.js جاهزاً (مُخزَّن بعد أول تحميل) */
export function loadPdfEngine(): Promise<any> {
  if (!enginePromise) enginePromise = boot();
  return enginePromise;
}

/**
 * تحميل استباقي في الخلفية حتى يعمل العرض لاحقاً بدون إنترنت.
 * لا يرمي استثناءً ولا يعطّل الواجهة.
 */
export function warmPdfEngine(): void {
  const run = () => {
    loadPdfEngine()
      .then(async (pdfjs) => {
        const src = pdfjs?.GlobalWorkerOptions?.workerSrc;
        // تنزيل ملف الـ worker نفسه إلى كاش المتصفح
        if (src) await fetch(src, { cache: 'force-cache' }).catch(() => undefined);
      })
      .catch(() => undefined);
  };

  const idle = (window as any).requestIdleCallback as
    | ((cb: () => void, opts?: { timeout: number }) => void)
    | undefined;

  if (typeof window !== 'undefined' && idle) idle(run, { timeout: 4000 });
  else setTimeout(run, 1200);
}
