import React from 'react';
import { FileText, Link2, Loader2, Tag, Trash2, Upload } from 'lucide-react';
import { addMediaLink, deleteMediaAsset, formatFileSize, listMediaAssets, MediaAsset, MediaCategory, MediaOwnerType, updateMediaCategory, uploadMediaAsset, validateFile } from '../lib/mediaUpload';

const ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.webp,.gif,.mp3,.m4a,.aac,.wav,.ogg,.opus,.flac,.mp4,.webm,.mov';

/**
 * أنواع الملفات كما يراها الطالب في التطبيق:
 *   • كتاب/مذكرة → تبويب «الكتب»
 *   • امتحان/نموذج → تبويب «الامتحانات»
 *   • غير محدَّد → يوزّعها التطبيق تلقائياً حسب عنوان الملف
 *
 * قبل هذا الاختيار كان التطبيق يخمّن النوع من العنوان، وكان ممكن يحط نموذج
 * امتحان داخل «الكتب» لو العنوان ما فيه كلمة «امتحان». الآن الإدارة تحدّد.
 */
const CATEGORIES: Array<{ value: MediaCategory; label: string }> = [
  { value: '', label: 'تلقائي (حسب العنوان)' },
  { value: 'textbook', label: 'كتاب / مذكرة' },
  { value: 'exam', label: 'امتحان / نموذج' },
  { value: 'notes', label: 'ملاحظات / ورقة عمل' },
];

export const MediaManager: React.FC<{
  ownerType: MediaOwnerType;
  ownerId: string;
  title?: string;
  allowFiles?: boolean;
  metadata?: Record<string, unknown>;
  onChanged?: () => void;
}> = ({ ownerType, ownerId, title = 'الملفات والوسائط', allowFiles = true, metadata, onChanged }) => {
  const [assets, setAssets] = React.useState<MediaAsset[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [progress, setProgress] = React.useState(0);
  const [error, setError] = React.useState('');
  /** رسالة نجاح صريحة بعد الرفع — «تم» وحدها ما كانت كافية، المستخدم يحتاج يعرف أي ملف وحجمه */
  const [notice, setNotice] = React.useState('');
  /** ما اختاره المستخدم قبل الرفع: الاسم والحجم الحقيقي — يبان حتى لو رُفض */
  const [picked, setPicked] = React.useState('');
  const [linkMode, setLinkMode] = React.useState(false);
  const [linkTitle, setLinkTitle] = React.useState('');
  const [linkUrl, setLinkUrl] = React.useState('');
  const [category, setCategory] = React.useState<MediaCategory>('');

  const refresh = React.useCallback(async () => {
    try {
      setAssets(await listMediaAssets(ownerType, ownerId));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذّر تحميل الوسائط');
    } finally {
      setLoading(false);
    }
  }, [ownerType, ownerId]);

  React.useEffect(() => { void refresh(); }, [refresh]);

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    e.currentTarget.value = '';
    if (!file || busy) return;
    setBusy(true); setProgress(0); setError(''); setNotice(''); setPicked('');
    const facts = `${file.name} · ${formatFileSize(file.size)} · ${file.type || 'نوع غير معلوم من الجهاز'}`;
    setPicked(facts);
    /* فحص مبكر: لو الملف فارغ أو صيغته غير مدعومة نوقف قبل أي اتصال بالخادم
       ونقول السبب بحجمه الفعلي بدل رسالة «تجاوز ٢٠ ميغابايت» المضلّلة. */
    const pre = validateFile(file);
    if (!pre.ok) {
      setError(pre.reason);
      setBusy(false);
      return;
    }
    try {
      const old = new Set(assets.map((x) => x.id));
      await uploadMediaAsset({ ownerType, ownerId, file, metadata: { ...(metadata || {}), category }, onProgress: setProgress });
      let found = false;
      for (let n = 0; n < 12; n++) {
        await new Promise((r) => setTimeout(r, 350));
        const rows = await listMediaAssets(ownerType, ownerId);
        setAssets(rows);
        if (rows.some((a) => !old.has(a.id) && a.originalName === file.name)) { found = true; break; }
      }
      if (!found) {
        setError(`اكتمل الرفع لكن التسجيل لم يظهر بعد (${facts}). لا تعاود الرفع قبل التحقق.`);
      } else {
        setNotice(`تم حفظ «${file.name}» (${formatFileSize(file.size)}) — ظاهر الآن في القائمة أدناه وفي تطبيق الطالب.`);
        onChanged?.();
      }
    } catch (e2) {
      setError(`${e2 instanceof Error ? e2.message : 'تعذّر رفع الملف'} (الملف: ${facts})`);
    } finally {
      setBusy(false); setProgress(0);
    }
  };

  const link = async (e: React.FormEvent) => {
    e.preventDefault();
    /* تحقّق صريح بدل الاعتماد على `required`/`type=url` — متصفح أندرويد داخل
       التطبيق لا يُظهر فقاعة الخطأ أحياناً فيبدو الزر «ما يعمل». */
    const t = linkTitle.trim();
    const u = linkUrl.trim();
    if (!t) { setError('اكتب عنوان الرابط أولاً (مثال: اختبار الوحدة الأولى).'); return; }
    if (!/^https?:\/\//i.test(u)) { setError('الرابط لازم يبدأ بـ https:// — انسخه كاملاً من المتصفح.'); return; }
    setBusy(true); setError('');
    try {
      const saved = await addMediaLink(ownerType, ownerId, t, u, category);
      setLinkMode(false); setPicked('');
      setNotice(`تم حفظ الرابط «${saved.title}» — ظاهر الآن في قائمة الوسائط أدناه${ownerType === 'lesson' ? ' وفي تبويب المرفقات داخل الدرس' : ownerType === 'subject' ? ' وفي تبويب الكتب للمادة' : ownerType === 'library' ? ' وفي المكتبة' : ''}.`);
      setLinkTitle(''); setLinkUrl('');
      await refresh(); onChanged?.();
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : 'تعذّر حفظ الرابط');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (a: MediaAsset) => {
    if (!confirm(`حذف «${a.title}»؟`)) return;
    try {
      await deleteMediaAsset(a.id);
      setAssets((r) => r.filter((x) => x.id !== a.id));
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذّر الحذف');
    }
  };

  const recategorize = async (a: MediaAsset, next: MediaCategory) => {
    const prev = a.category || '';
    setAssets((rows) => rows.map((r) => (r.id === a.id ? { ...r, category: next } : r)));
    try {
      await updateMediaCategory(a.id, next);
      onChanged?.();
    } catch (e) {
      setAssets((rows) => rows.map((r) => (r.id === a.id ? { ...r, category: prev } : r)));
      setError(e instanceof Error ? e.message : 'تعذّر تغيير التصنيف');
    }
  };

  /* «آخر ما أُضيف»: الترتيب الافتراضي تصاعدي (ما يغيّر ترتيب الأقدم)،
     فنعرض شريطاً مستقلاً بأحدث عنصرين حتى لا يسأل المستخدم «وين راح الرابط؟» */
  const newest = React.useMemo(
    () =>
      [...assets]
        .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
        .slice(0, 2),
    [assets],
  );
  const when = (iso?: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return `${d.toLocaleDateString('ar-EG', { day: '2-digit', month: '2-digit' })} ${d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <section dir="rtl" className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-black text-slate-900">{title}</h3>
        <div className="flex flex-wrap items-center gap-2">
          {/* اختيار النوع — أهم إضافة: التطبيق ما عاد يخمّن */}
          <label className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-slate-50 px-2 py-1.5 text-[11px] font-bold text-slate-700">
            <Tag className="h-3.5 w-3.5" />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as MediaCategory)}
              className="bg-transparent text-[11px] font-bold text-slate-800 outline-none"
              aria-label="نوع الملف"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value || 'auto'} value={c.value}>{c.label}</option>
              ))}
            </select>
          </label>

          {allowFiles && (
            <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-[11px] font-bold text-white">
              {busy ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />{Math.round(progress)}٪</> : <><Upload className="h-3.5 w-3.5" />رفع ملف</>}
              <input className="sr-only" type="file" accept={ACCEPT} disabled={busy} onChange={(e) => void upload(e)} />
            </label>
          )}

          <button
            type="button"
            onClick={() => setLinkMode((v) => !v)}
            className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-[11px] font-bold"
          >
            <Link2 className="h-3.5 w-3.5" />رابط خارجي
          </button>
        </div>
      </div>

      <p className="text-[10px] leading-relaxed text-slate-500">
        الحد الأقصى: مستند أو صورة <b>٢٠ ميغابايت</b> · صوت ٥٠ · فيديو ١٠٠. الملفات الكبيرة تُرفع على دفعات تلقائياً.
      </p>

      {picked && (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-700">
          الملف المختار: {picked}
        </p>
      )}

      {linkMode && (
        <form onSubmit={(e) => void link(e)} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
          <input required value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} placeholder="عنوان الرابط" className="rounded-lg border px-3 py-2 text-xs" />
          <input required type="url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://…" className="rounded-lg border px-3 py-2 text-xs" />
          <button disabled={busy} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white">حفظ الرابط</button>
          <p className="text-[10px] text-slate-500 sm:col-span-3">
            املأ الحقلين: العنوان + الرابط كاملاً (يبدأ بـ https://). بعد الحفظ يظهر تأكيد أخضر وتجده في القائمة أسفل النموذج.
          </p>
        </form>
      )}

      {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">{notice}</p>}
      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs leading-relaxed text-rose-700">{error}</p>}

      {newest.length > 0 && (
        <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2">
          <p className="text-[10px] font-black text-sky-900">آخر ما أُضيف ({assets.length} عنصراً في هذا القسم)</p>
          <ul className="mt-1 space-y-0.5">
            {newest.map((a) => (
              <li key={a.id} className="truncate text-[11px] text-sky-900">
                • {a.kind === 'link' ? 'رابط' : 'ملف'} — {a.title} {when(a.createdAt) && `(${when(a.createdAt)})`}
              </li>
            ))}
          </ul>
        </div>
      )}

      {loading ? (
        <p className="text-xs text-slate-400">جارٍ التحميل…</p>
      ) : assets.length === 0 ? (
        <p className="text-xs text-slate-400">لا توجد وسائط مرتبطة.</p>
      ) : (
        <ul className="divide-y">
          {assets.map((a) => (
            <li key={a.id} className="flex items-start justify-between gap-3 py-2">
              <div className="min-w-0 flex-1">
                <a href={a.url} target="_blank" rel="noreferrer" className="break-all text-xs font-bold text-slate-900 underline">
                  <FileText className="ml-1 inline h-3.5 w-3.5" />{a.title}
                </a>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
                  <select
                    value={a.category || ''}
                    onChange={(e) => void recategorize(a, e.target.value as MediaCategory)}
                    aria-label={`تصنيف «${a.title}»`}
                    className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-800"
                    title="غيّر التصنيف بدون إعادة رفع"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value || 'auto'} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                  <span>
                    {a.kind === 'link' ? 'رابط خارجي' : a.kind}
                    {a.sizeBytes ? ` · ${formatFileSize(a.sizeBytes)}` : ''}
                    {a.createdAt ? ` · ${when(a.createdAt)}` : ''}
                  </span>
                </div>
                {a.kind === 'audio' && <audio controls src={a.url} className="mt-2 w-full" />}
                {a.kind === 'video' && <video controls src={a.url} className="mt-2 max-h-48 w-full rounded-lg" />}
                {a.kind === 'image' && <img src={a.url} alt={a.title} className="mt-2 max-h-36 rounded-lg" />}
              </div>
              <button type="button" onClick={() => void remove(a)} aria-label="حذف الوسيط" className="rounded-lg p-2 text-rose-600">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default MediaManager;
