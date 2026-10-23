import React from 'react';
import { CheckCircle2, Download, Loader2, Trash2 } from 'lucide-react';

/**
 * صف ملف واحد — زر «فتح» يعرض الملف داخل التطبيق، وزر التحميل يخزّنه
 * للاستخدام بدون إنترنت. الشكل مستوحى من تطبيق الثانوي: صف واضح،
 * عنوان كبير، وزرين فقط حتى لا يحتار الطالب.
 */
interface Props {
  title: string;
  subtitle?: string;
  badge?: string;
  accent: string;
  offline?: boolean;
  downloading?: boolean;
  progress?: number;
  onOpen: () => void;
  onDownload?: () => void;
  onRemove?: () => void;
}

export const SubjectFileRow: React.FC<Props> = ({
  title,
  subtitle,
  badge,
  accent,
  offline = false,
  downloading = false,
  progress = 0,
  onOpen,
  onDownload,
  onRemove,
}) => {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 dark:border-[#1C3A62] dark:bg-[#0D1F35]">
      <div className="min-w-0 flex-1 text-right">
        <p className="text-[13px] font-extrabold leading-snug text-slate-900 dark:text-white">{title}</p>
        <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[10.5px] font-semibold text-slate-500 dark:text-slate-400">
          {badge && (
            <span
              className="rounded-md px-1.5 py-0.5 text-[10px] font-black"
              style={{ backgroundColor: `${accent}22`, color: accent }}
            >
              {badge}
            </span>
          )}
          {subtitle && <span>{subtitle}</span>}
          {offline && (
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-emerald-600 dark:text-emerald-300">
              <CheckCircle2 className="h-3 w-3" /> محمّل بدون نت
            </span>
          )}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={onOpen}
          className="min-h-[42px] rounded-xl bg-emerald-500 px-4 text-[13px] font-black text-white active:scale-95"
        >
          فتح
        </button>

        {onDownload && !offline && (
          <button
            type="button"
            onClick={onDownload}
            disabled={downloading}
            className="inline-flex min-h-[42px] min-w-[42px] items-center justify-center rounded-xl bg-blue-600 px-3 text-white active:scale-95 disabled:opacity-70"
            aria-label={`تحميل ${title} للاستخدام بدون إنترنت`}
          >
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          </button>
        )}

        {offline && onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex min-h-[42px] min-w-[42px] items-center justify-center rounded-xl border border-rose-300 bg-rose-50 px-3 text-rose-600 active:scale-95 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300"
            aria-label={`حذف ${title} من الملفات المحمّلة`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {downloading && (
        <div className="pointer-events-none absolute" aria-hidden="true" data-progress={progress} />
      )}
    </div>
  );
};

export default SubjectFileRow;
