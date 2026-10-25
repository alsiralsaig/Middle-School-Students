import React from 'react';
import { Clock, FileText, Link2, Loader2 } from 'lucide-react';
import { formatFileSize, listRecentMedia, MediaAsset } from '../lib/mediaUpload';

/**
 * «آخر ما أُضيف عبر النظام».
 *
 * كان كل قسم (مادة/وحدة/درس/مكتبة) يعرض وسائطه وحده، فمن يرفع رابطاً على وحدة
 * ثم يفتح المكتبة لا يجده ويظن أن الحفظ ضاع. هذه اللوحة تجمع آخر ٣٠ عنصراً من
 * كل الأقسام مع اسم القسم والتاريخ، حتى يُعرَف مصير كل ملف أو رابط.
 */
export const RecentMediaPanel: React.FC<{ refreshKey?: number }> = ({ refreshKey = 0 }) => {
  const [rows, setRows] = React.useState<Array<MediaAsset & { ownerLabel?: string }>>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  const load = React.useCallback(async () => {
    try {
      setRows(await listRecentMedia(30));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذّر تحميل آخر الوسائط');
    } finally {
      setLoading(false);
    }
  }, []);

  /* يتحدّث تلقائياً عند أي إضافة/حذف في نفس الصفحة — كان يبقى «لم يُضف شيء»
     بعد حفظ رابط جديد لأن التحميل حدث قبل الإضافة. */
  React.useEffect(() => { void load(); }, [load, refreshKey]);

  const when = (iso?: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return `${d.toLocaleDateString('ar-EG', { day: '2-digit', month: '2-digit' })} · ${d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <section dir="rtl" className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="inline-flex items-center gap-1.5 text-sm font-black text-navy-800">
          <Clock className="h-4 w-4" /> آخر ما أُضيف عبر النظام
        </h2>
        <button type="button" onClick={() => { setLoading(true); void load(); }} className="rounded-lg border border-slate-300 px-2.5 py-1 text-[11px] font-bold text-slate-700">
          تحديث
        </button>
      </div>

      {error && <p role="alert" className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}

      {loading ? (
        <p className="mt-2 inline-flex items-center gap-1 text-xs text-slate-400"><Loader2 className="h-3.5 w-3.5 animate-spin" /> جارٍ التحميل…</p>
      ) : rows.length === 0 ? (
        <p className="mt-2 text-xs text-slate-400">
          لم يُضَف أي ملف أو رابط بعد. ارفع ملفاً أو احفظ رابطاً من أي قسم ليظهر هنا مباشرة.
        </p>
      ) : (
        <ul className="mt-2 divide-y">
          {rows.map((a) => (
            <li key={a.id} className="flex items-start justify-between gap-2 py-2">
              <div className="min-w-0 flex-1">
                <a href={a.url} target="_blank" rel="noreferrer" className="break-all text-xs font-bold text-slate-900 underline">
                  {a.kind === 'link' ? <Link2 className="ml-1 inline h-3.5 w-3.5" /> : <FileText className="ml-1 inline h-3.5 w-3.5" />}
                  {a.title}
                </a>
                <p className="mt-0.5 text-[10px] text-slate-500">
                  {a.ownerLabel || a.kind}
                  {a.sizeBytes ? ` · ${formatFileSize(a.sizeBytes)}` : ''}
                  {a.createdAt ? ` · ${when(a.createdAt)}` : ''}
                </p>
              </div>
              <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                {a.kind === 'link' ? 'رابط' : 'ملف'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default RecentMediaPanel;
