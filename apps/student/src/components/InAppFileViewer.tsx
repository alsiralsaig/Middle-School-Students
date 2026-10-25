import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, Download, ExternalLink, Loader2, Maximize2, Minus, MoveVertical, Plus } from 'lucide-react';
import { getApiBase } from '../utils/serverUrl';
import { formatBytes, getOfflineObjectUrl, guessMime } from '../utils/offlineFiles';
import { loadPdfEngine } from '../utils/pdfEngine';

/**
 * عارض الملفات **داخل التطبيق**.
 *
 * المشكلة التي يحلّها: سابقاً كان رابط الـPDF يفتح في تاب خارجي، فلا يرجع
 * الطالب للتطبيق إلا بعد إغلاقه من قائمة التابات. الآن الملف يفتح في شاشة
 * كاملة داخل التطبيق، وفي أعلاها زر «رجوع» يرجّعه لنفس المكان.
 *
 * PDF يُرسم بـ pdf.js على Canvas (لا iframe) لسببين:
 *   • يعمل بنفس الشكل على أندرويد وiOS (متصفح iOS لا يعرض إلا الصفحة الأولى في iframe).
 *   • يعمل للملفات المحفوظة بدون إنترنت أيضاً (blob محلي).
 */

export interface ViewerFile {
  title: string;
  url: string;
  mimeType?: string | null;
  kind?: string | null;
  sizeLabel?: string | null;
  bytes?: number | null;
}

interface Props {
  file: ViewerFile;
  onClose: () => void;
}

/** يحوّل العنوان النسبي إلى عنوان كامل على الخادم */
export function resolveFileUrl(url: string): string {
  if (!url) return '';
  if (/^(https?:|blob:|data:)/i.test(url)) return url;
  return `${getApiBase()}${url.startsWith('/') ? '' : '/'}${url}`;
}

/** هل الرابط صفحة/اختبار خارجي وليس ملفاً قابلاً للعرض؟ */
export function isExternalPage(file: { url: string; kind?: string | null }): boolean {
  if (file.kind === 'link') return true;
  if (!/^https?:/i.test(file.url)) return false;
  return !/\.(pdf|png|jpe?g|webp|gif|mp3|wav|m4a|mp4|docx?|xlsx?|pptx?)(\?|#|$)/i.test(file.url);
}

export const InAppFileViewer: React.FC<Props> = ({ file, onClose }) => {
  const mime = guessMime(file.url, file.mimeType);
  const externalPage = isExternalPage(file);
  const [src, setSrc] = useState<string>(() => resolveFileUrl(file.url));
  const [usingOfflineCopy, setUsingOfflineCopy] = useState(false);
  const [error, setError] = useState('');

  // PDF state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pdfRef = useRef<any>(null);
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  /* وضع العرض: «عرض» = الصفحة بعرض الشاشة | «صفحة» = الصفحة كاملة في الشاشة بلا فراغ */
  const [fit, setFit] = useState<'width' | 'page'>('width');
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [pdfLoading, setPdfLoading] = useState(mime === 'application/pdf');

  const isPdf = mime === 'application/pdf' && !externalPage;
  const isImage = mime.startsWith('image/');
  const isAudio = mime.startsWith('audio/');
  const isVideo = mime.startsWith('video/');

  /** منع تمرير الصفحة خلف العارض + إغلاق بزر Escape */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (isPdf && e.key === 'ArrowLeft') setPage((p) => Math.min(numPages || 1, p + 1));
      if (isPdf && e.key === 'ArrowRight') setPage((p) => Math.max(1, p - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [isPdf, numPages, onClose]);

  /** لو الملف محمّل بدون نت، الأولوية للنسخة المحلية حتى يفتح بسرعة وبدون شبكة */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const local = await getOfflineObjectUrl(resolveFileUrl(file.url));
      if (!cancelled && local) {
        setSrc(local);
        setUsingOfflineCopy(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file.url]);

  /** تحميل مستند PDF */
  useEffect(() => {
    if (!isPdf) return;
    let cancelled = false;
    setPdfLoading(true);
    setError('');
    (async () => {
      try {
        const pdfjs = await loadPdfEngine();
        const doc = await pdfjs.getDocument({ url: src, isEvalSupported: false }).promise;
        if (cancelled) {
          doc.destroy?.();
          return;
        }
        pdfRef.current = doc;
        setNumPages(doc.numPages);
        setPage(1);
        setPdfLoading(false);
      } catch (e) {
        console.error('[viewer] pdf load failed', e);
        if (!cancelled) {
          setPdfLoading(false);
          setError('الملف ده ما بينعرض جوه التطبيق — تقدر تفتحه في المتصفح أو تنزّله.');
        }
      }
    })();
    return () => {
      cancelled = true;
      pdfRef.current?.destroy?.();
      pdfRef.current = null;
    };
  }, [isPdf, src]);

  /** قياس مساحة العرض — عشان «ملء الصفحة» تعرف طول الشاشة وتتكيّف مع الدوران */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    window.addEventListener('orientationchange', measure);
    window.addEventListener('resize', measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener('orientationchange', measure);
      window.removeEventListener('resize', measure);
    };
  }, [isPdf]);

  /** رسم الصفحة الحالية */
  const paint = useCallback(async () => {
    const doc = pdfRef.current;
    const canvas = canvasRef.current;
    if (!doc || !canvas) return;
    try {
      const pdfPage = await doc.getPage(page);
      const base = pdfPage.getViewport({ scale: 1 });
      const availW = box.w || window.innerWidth;
      const availH = box.h || window.innerHeight * 0.7;
      /* «عرض»: الصفحة بعرض الشاشة (تمرير رأسي) | «صفحة»: الصفحة كلها داخل الشاشة */
      const fitScale = fit === 'page'
        ? Math.min(availW / base.width, availH / base.height)
        : availW / base.width;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const scale = (fitScale * zoom * dpr) as number;
      const viewport = pdfPage.getViewport({ scale });
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${viewport.width / dpr}px`;
      canvas.style.height = `${viewport.height / dpr}px`;
      await pdfPage.render({ canvasContext: ctx, viewport, canvas }).promise;
    } catch {
      setError('تعذّر رسم الصفحة. جرّب زر التنزيل.');
    }
  }, [page, zoom, fit, box.w, box.h]);

  useEffect(() => {
    if (isPdf && !pdfLoading && numPages > 0) void paint();
  }, [isPdf, pdfLoading, numPages, paint]);

  const download = () => {
    const a = document.createElement('a');
    a.href = src;
    a.download = file.title || 'ملف';
    a.target = '_blank';
    a.rel = 'noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const meta = file.sizeLabel || formatBytes(file.bytes) || '';

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[120] flex flex-col bg-[#061220] text-white"
      role="dialog"
      aria-modal="true"
      aria-label={`عارض الملف: ${file.title}`}
    >
      {/* الشريط العلوي — زر الرجوع هو أول ما تقع عليه العين */}
      <header className="flex items-center gap-2 border-b border-[#1C3A62] bg-[#0B1E36] px-3 py-2.5">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-amber-400 px-3 py-2 text-[13px] font-black text-slate-950 active:scale-95"
        >
          <ArrowRight className="h-4 w-4" />
          رجوع
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-bold leading-tight">{file.title}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-slate-400">
            <span>{meta}</span>
            {usingOfflineCopy && (
              <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 font-bold text-emerald-300">بدون نت ✓</span>
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={download}
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[#24476F] bg-[#122844] px-3 text-[12px] font-bold text-slate-100 active:scale-95"
          aria-label="تنزيل الملف"
        >
          <Download className="h-4 w-4" />
        </button>
      </header>

      {/* المحتوى */}
      <div ref={wrapRef} className="relative flex-1 overflow-auto overscroll-contain bg-[#0A1626]">
        {isPdf && (
          <>
            {pdfLoading && (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-300">
                <Loader2 className="h-7 w-7 animate-spin text-amber-400" />
                <p className="text-xs font-bold">جارٍ تحضير الملف…</p>
              </div>
            )}
            {!pdfLoading && error && (
              <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
                <p className="text-sm font-bold text-rose-300">{error}</p>
                <div className="flex flex-wrap justify-center gap-2">
                  <a
                    href={src}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white"
                  >
                    <ExternalLink className="h-4 w-4" /> افتح في المتصفح
                  </a>
                  <button
                    onClick={download}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white"
                  >
                    <Download className="h-4 w-4" /> تنزيل الملف
                  </button>
                </div>
              </div>
            )}
            <div className={pdfLoading || error ? 'hidden' : `flex justify-center p-0 ${fit === 'page' ? 'min-h-full items-center' : ''}`}>
              <canvas ref={canvasRef} className="bg-white" />
            </div>
          </>
        )}

        {isImage && (
          <div className="flex h-full items-center justify-center p-3">
            <img src={src} alt={file.title} className="max-h-full max-w-full rounded-lg object-contain" />
          </div>
        )}

        {isAudio && (
          <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
            <div className="text-5xl">🎧</div>
            <audio src={src} controls autoPlay className="w-full max-w-md" />
          </div>
        )}

        {isVideo && (
          <div className="flex h-full items-center justify-center bg-black p-1">
            <video src={src} controls autoPlay playsInline className="max-h-full w-full rounded-lg" />
          </div>
        )}

        {externalPage && (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="text-5xl">🌐</div>
            <p className="text-sm font-bold text-slate-100">هذا اختبار تفاعلي على موقع خارجي.</p>
            <p className="max-w-sm text-xs text-slate-400">
              بيتفتح في المتصفح — رجّع للتطبيق بأول ما تخلص منه.
            </p>
            <a
              href={src}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white"
            >
              <ExternalLink className="h-4 w-4" /> افتح الاختبار
            </a>
          </div>
        )}

        {!externalPage && !isPdf && !isImage && !isAudio && !isVideo && (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="text-5xl">📄</div>
            <p className="text-sm font-bold">هذا النوع لا يُعرض داخل التطبيق.</p>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                onClick={download}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white"
              >
                <Download className="h-4 w-4" /> تنزيل
              </button>
              <a
                href={src}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-[#24476F] bg-[#122844] px-4 py-2.5 text-sm font-bold text-slate-100"
              >
                <ExternalLink className="h-4 w-4" /> فتح خارجي
              </a>
            </div>
          </div>
        )}
      </div>

      {/* شريط التحكم في PDF — تنقّل + تكبير */}
      {isPdf && !pdfLoading && !error && numPages > 0 && (
        <footer className="flex items-center justify-between gap-2 border-t border-[#1C3A62] bg-[#0B1E36] px-3 py-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.2).toFixed(2)))}
              className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-[#24476F] bg-[#122844]"
              aria-label="تصغير"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-11 text-center text-[11px] font-bold text-slate-300">{Math.round(zoom * 100)}٪</span>
            <button
              type="button"
              onClick={() => {
                setFit((f) => (f === 'page' ? 'width' : 'page'));
                setZoom(1);
              }}
              className="inline-flex min-h-[40px] items-center gap-1 rounded-lg border border-[#24476F] bg-[#122844] px-2.5 text-[11px] font-bold text-slate-100 active:scale-95"
              aria-label="طريقة العرض"
            >
              {fit === 'page' ? <Maximize2 className="h-3.5 w-3.5" /> : <MoveVertical className="h-3.5 w-3.5" />}
              {fit === 'page' ? 'ملء العرض' : 'ملء الصفحة'}
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(3, +(z + 0.2).toFixed(2)))}
              className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-[#24476F] bg-[#122844]"
              aria-label="تكبير"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page >= numPages}
              onClick={() => setPage((p) => Math.min(numPages, p + 1))}
              className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-[#24476F] bg-[#122844] disabled:opacity-40"
              aria-label="الصفحة التالية"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[74px] text-center text-[12px] font-bold text-white">
              {page} / {numPages}
            </span>
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-[#24476F] bg-[#122844] disabled:opacity-40"
              aria-label="الصفحة السابقة"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </footer>
      )}
    </div>
  );
};

export default InAppFileViewer;
