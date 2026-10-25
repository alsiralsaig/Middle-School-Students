import React, { useCallback, useMemo, useState } from 'react';
import { FileText, Loader2, Paperclip, Upload, X } from 'lucide-react';
import {
  Badge,
  Card,
  EmptyState,
  LoadingState,
  NotConnectedNote,
  Table,
} from '../components/ui';
import type { ResourceCategory } from '@shared/curriculumTypes';
import { getApiBase } from '../lib/serverUrl';
import { MediaManager } from '../components/MediaManager';
import { RecentMediaPanel } from '../components/RecentMediaPanel';
import { uploadMediaAsset } from '../lib/mediaUpload';

interface LibraryRow {
  id: string;
  title: string;
  category: string;
  fileType: string;
  fileSize: string;
  pageCount: number;
  author: string | null;
  publishYear: string | null;
  description: string;
  status: string;
  downloadCount: number;
  isVerifiedCurriculum: boolean;
  subjectId: string | null;
  subjectName: string;
  filePath?: string;
  externalUrl?: string | null;
  hasBody?: boolean;
  bodyChars?: number;
  isPublished: boolean;
  publishedAt?: string | null;
}
interface SubjectOption { id: string; name: string }

const CATEGORY_LABEL: Record<ResourceCategory, string> = {
  all: 'الكل',
  notes: 'مذكرات',
  textbook: 'كتاب مقرر',
  worksheets: 'أوراق عمل',
  past_exams: 'امتحانات سابقة',
  interactive_exams: 'اختبارات تفاعلية',
};
const CATEGORIES: ResourceCategory[] = ['all', 'notes', 'textbook', 'worksheets', 'past_exams', 'interactive_exams'];
const UPLOAD_CATEGORIES = CATEGORIES.filter((category) => category !== 'all');
const ACCEPTED_FILES = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.webp';
const MAX_SIZE = 60 * 1024 * 1024;
const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf', doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain', csv: 'text/csv', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  png: 'image/png', webp: 'image/webp',
};

export const LibraryPage: React.FC = () => {
  const [items, setItems] = useState<LibraryRow[] | null>(null);
  /** يزيد مع كل إضافة/حذف حتى تتحدّث لوحة «آخر ما أُضيف» فوراً */
  const [mediaVersion, setMediaVersion] = useState(0);
  const [summary, setSummary] = useState<{
    total: number; verified: number; downloads: number;
    published?: number; hidden?: number; interactive?: number;
    pastExams?: number; textbooks?: number; notes?: number;
    lessonQuizzes?: number; exams?: number;
  } | null>(null);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [offline, setOffline] = useState(false);
  const [category, setCategory] = useState<ResourceCategory>('all');
  const [busyId, setBusyId] = useState('');
  const [importing, setImporting] = useState(false);
  const [importNote, setImportNote] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [file, setFile] = useState<File | null>(null);
  /** رابط بديل عن الملف (اختبار خارجي أو ملف مستضاف) */
  const [linkUrl, setLinkUrl] = useState('');
  const [title, setTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState<ResourceCategory>('textbook');
  const [subjectId, setSubjectId] = useState('');
  const [author, setAuthor] = useState('');
  const [publishYear, setPublishYear] = useState('');
  const [pageCount, setPageCount] = useState('');
  const [description, setDescription] = useState('');

  const refreshLibrary = useCallback(async (): Promise<LibraryRow[] | null> => {
    try {
      const res = await fetch(`${getApiBase()}/api/admin/library`, {
        headers: { Accept: 'application/json', 'X-App': 'admin' }, credentials: 'include',
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json() as {
        resources: LibraryRow[];
        summary: {
          total: number; verified: number; downloads: number;
          published?: number; hidden?: number; interactive?: number;
          pastExams?: number; textbooks?: number; notes?: number;
          lessonQuizzes?: number; exams?: number;
        };
      };
      setItems(data.resources);
      setSummary(data.summary);
      setOffline(false);
      return data.resources;
    } catch {
      setItems(null);
      setOffline(true);
      return null;
    }
  }, []);

  React.useEffect(() => {
    void refreshLibrary();
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${getApiBase()}/api/admin/library/subjects`, {
          headers: { Accept: 'application/json', 'X-App': 'admin' }, credentials: 'include',
        });
        const data = await res.json().catch(() => null) as { subjects?: SubjectOption[] } | null;
        if (alive && res.ok && data?.subjects) setSubjects(data.subjects);
      } catch { /* صفحة الرفع تعرض الحقول الأخرى حتى يتاح الخادم */ }
    })();
    return () => { alive = false; };
  }, [refreshLibrary]);

  const loading = items === null && !offline;
  const filtered = useMemo(
    () => (items ?? []).filter((r) => category === 'all' || r.category === category),
    [items, category],
  );

  /** قرار الإدارة على عنصر واحد: يظهر في تطبيق الطالب أو يُسحب */
  const togglePublish = async (row: LibraryRow) => {
    if (busyId) return;
    setBusyId(row.id);
    try {
      const res = await fetch(`${getApiBase()}/api/admin/library/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-App': 'admin' },
        credentials: 'include',
        body: JSON.stringify({ isPublished: !row.isPublished }),
      });
      if (!res.ok) throw new Error(String(res.status));
      await refreshLibrary();
    } catch {
      setImportNote('تعذّر تغيير حالة النشر — تحقّق من الاتصال بالخادم.');
    } finally {
      setBusyId('');
    }
  };

  /** نشر أو سحب كل ما يظهر في التصنيف الحالي */
  const publishVisible = async (isPublished: boolean) => {
    const ids = filtered.filter((row) => row.isPublished !== isPublished).map((row) => row.id);
    if (!ids.length) { setImportNote('كل العناصر المعروضة في الحالة المطلوبة أصلاً.'); return; }
    setBusyId('bulk');
    try {
      const res = await fetch(`${getApiBase()}/api/admin/library`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-App': 'admin' },
        credentials: 'include',
        body: JSON.stringify({ ids, isPublished }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setImportNote(isPublished ? `نُشر ${ids.length} عنصراً للطلاب.` : `سُحب ${ids.length} عنصراً من تطبيق الطالب.`);
      await refreshLibrary();
    } catch {
      setImportNote('تعذّر تحديث الدفعة — تحقّق من الاتصال بالخادم.');
    } finally {
      setBusyId('');
    }
  };

  /** استيراد المكتبة النصية المرفقة مع الخادم — تُنشأ غير منشورة حتى تراجعها الإدارة */
  const importBundledLibrary = async () => {
    if (importing) return;
    setImporting(true);
    setImportNote('');
    try {
      const res = await fetch(`${getApiBase()}/api/admin/library/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-App': 'admin' },
        credentials: 'include',
        body: JSON.stringify({ source: 'bundled' }),
      });
      const data = await res.json().catch(() => null) as { created?: number; updated?: number; error?: string } | null;
      if (!res.ok) throw new Error(data?.error || String(res.status));
      setImportNote(`تم الاستيراد: ${data?.created ?? 0} جديد، ${data?.updated ?? 0} محدَّث. كلها غير منشورة حتى تعتمدها.`);
      await refreshLibrary();
    } catch {
      setImportNote('تعذّر الاستيراد — تأكّد أن الخادم محدَّث وأن ملف المكتبة موجود.');
    } finally {
      setImporting(false);
    }
  };

  const resetUploadForm = () => {
    setFile(null); setTitle(''); setUploadCategory('textbook'); setSubjectId('');
    setAuthor(''); setPublishYear(''); setPageCount(''); setDescription(''); setUploadError(''); setLinkUrl('');
  };

  /**
   * إضافة عنصر **برابط** بدل رفع ملف.
   *
   * ليه: رفع الملف يحتاج منتقي ملفات من النظام، وفي بعض المتصفحات/أغلفة
   * الأندرويد القديمة ما يفتح. الرابط يشتغل في كل الحالات، ومفيد كذلك
   * للاختبارات التفاعلية المستضافة على موقع خارجي.
   */
  const addByLink = async () => {
    const url = linkUrl.trim();
    if (!url || !/^https?:\/\//i.test(url)) {
      setUploadError('اكتب رابطاً يبدأ بـ https://');
      return;
    }
    if (!title.trim()) {
      setUploadError('اكتب اسم العنصر');
      return;
    }
    setUploading(true);
    setUploadError('');
    try {
      const subjectName = subjects.find((s2) => s2.id === subjectId)?.name || '';
      const res = await fetch(`${getApiBase()}/api/admin/library/import`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-App': 'admin', Accept: 'application/json' },
        body: JSON.stringify({
          publish: true,
          items: [
            {
              id: `lib-link-${Date.now()}`,
              title: title.trim(),
              category: uploadCategory,
              subject: subjectName,
              description: description.trim(),
              externalUrl: url,
              isPublished: true,
            },
          ],
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'تعذّر إضافة الرابط');
      await refreshLibrary();
      resetUploadForm();
      setShowUpload(false);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'تعذّر إضافة الرابط');
    } finally {
      setUploading(false);
    }
  };

  const uploadResource = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file || uploading) return;
    if (file.size > MAX_SIZE) { setUploadError(`حجم الملف ${(file.size / 1048576).toFixed(1)} ميغابايت — الحد ٦٠ ميغابايت`); return; }
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    if (!MIME_BY_EXTENSION[extension]) { setUploadError('نوع الملف غير مدعوم'); return; }
    setUploading(true); setUploadProgress(0); setUploadError('');
    try {
      const uploaded = await uploadMediaAsset({
        ownerType: 'library', ownerId: 'shared-library', file,
        title: title.trim() || file.name, description: description.trim(),
        metadata: { category: uploadCategory, subjectId, author: author.trim(), publishYear: publishYear.trim(), pageCount: Number(pageCount) || 0 },
        onProgress: setUploadProgress,
      });

      // لا نضيف سجلاً من المتصفح؛ callback الخادم ينشئه بعد تحقق Blob من الرفع.
      let saved = false;
      for (let attempt = 0; attempt < 10; attempt++) {
        const rows = await refreshLibrary();
        if (rows?.some((row) => row.filePath === uploaded.url)) { saved = true; break; }
        await new Promise((resolve) => window.setTimeout(resolve, 500));
      }
      if (!saved) {
        setUploadError('تم رفع الملف إلى التخزين، لكن لم يصل تأكيد حفظه بعد. حدّث المكتبة بعد قليل قبل إعادة الرفع.');
        return;
      }
      resetUploadForm();
      setShowUpload(false);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'تعذّر رفع الملف');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-black text-navy-800">المكتبة</h1>
          <p className="text-xs text-slate-500 mt-1">
            كل عنصر هنا تحت سيطرة الإدارة: ما تُنشره يظهر في تطبيق الطالب، وما تسحبه يختفي فوراً دون حذف المحتوى.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void importBundledLibrary()} disabled={importing} className="inline-flex items-center gap-2 rounded-xl border border-navy-800 px-4 py-2.5 text-xs font-bold text-navy-800 hover:bg-navy-50 disabled:opacity-50">
            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} استيراد المكتبة النصية
          </button>
          <button type="button" onClick={() => { setUploadError(''); setShowUpload(true); }} className="inline-flex items-center gap-2 rounded-xl bg-navy-800 px-4 py-2.5 text-xs font-bold text-white hover:bg-navy-700">
            <Upload className="w-4 h-4" /> رفع كتاب أو ملف
          </button>
        </div>
      </header>
      <MediaManager
        ownerType="library"
        ownerId="shared-library"
        title="ملفات وروابط المكتبة عبر النظام المشترك"
        onChanged={() => setMediaVersion((v) => v + 1)}
      />

      {/* أين ذهب الرابط الذي حفظته؟ هذه اللوحة تجمع آخر ٣٠ عنصراً من كل الأقسام */}
      <RecentMediaPanel refreshKey={mediaVersion} />

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {([
            { label: 'إجمالي العناصر', value: summary.total, hint: 'كل ما في المكتبة' },
            { label: 'منشور للطلاب', value: summary.published ?? '—', hint: 'يظهر في تطبيق الطالب' },
            {
              label: 'غير منشور',
              value: summary.hidden ?? '—',
              hint: summary.hidden === 0 ? 'لا شيء مخفي — الكل ظاهر' : 'مسحوب من التطبيق',
            },
            {
              label: 'كتب مدرسية',
              value: summary.textbooks ?? '—',
              hint: 'روابط PDF للكتب الرسمية',
            },
            {
              label: 'اختبارات تفاعلية',
              value: summary.interactive ?? '—',
              hint:
                summary.lessonQuizzes != null
                  ? `+ ${summary.lessonQuizzes} اختباراً داخل الدروس · ${summary.pastExams ?? 0} امتحاناً سابقاً`
                  : 'روابط اختبارات في المكتبة',
            },
          ] as Array<{ label: string; value: number | string; hint: string }>).map((c) => (
            <div key={c.label} className="bg-white border border-slate-200 rounded-2xl p-3">
              <div className="text-lg font-black text-navy-800 nums">{c.value}</div>
              <div className="text-[11px] text-slate-500">{c.label}</div>
              <div className="mt-0.5 text-[10px] leading-tight text-slate-400">{c.hint}</div>
            </div>
          ))}
        </div>
      )}

      {offline && (
        <NotConnectedNote>
          تعذّر الوصول إلى الخادم. احفظ عنوان الخادم الصحيح من صفحة{' '}
          <strong>الإعدادات</strong>.
        </NotConnectedNote>
      )}

      <Card>
        <div className="flex gap-2 flex-wrap mb-4">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-3.5 py-2 rounded-full text-[11px] font-bold border transition-colors min-h-[36px] inline-flex items-center ${
                category === c
                  ? 'bg-navy-800 text-white border-navy-800'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {CATEGORY_LABEL[c]}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4 rounded-xl bg-slate-50 border border-slate-200 p-3">
          <span className="text-[11px] font-bold text-slate-600">قرار النشر على المعروض ({filtered.length}):</span>
          <button type="button" onClick={() => void publishVisible(true)} disabled={busyId !== ''} className="rounded-lg bg-emerald-600 px-3 py-2 text-[11px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50">انشر للطلاب</button>
          <button type="button" onClick={() => void publishVisible(false)} disabled={busyId !== ''} className="rounded-lg bg-slate-600 px-3 py-2 text-[11px] font-bold text-white hover:bg-slate-700 disabled:opacity-50">اسحب من التطبيق</button>
        </div>

        {importNote && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-900">{importNote}</div>
        )}

        {loading ? (
          <LoadingState label="جارٍ تحميل عناصر المكتبة…" />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="لا عناصر في هذا التصنيف"
            description="لم تُضف أي عناصر بعد. استخدم زر رفع كتاب أو ملف لإضافة أول عنصر."
          />
        ) : (
          <Table head={['العنوان', 'المادة', 'النوع', 'المحتوى', 'الحجم', 'في تطبيق الطالب', 'الحالة']}>
            {filtered.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/70">
                <td className="py-2.5 px-3">
                  <div className="flex items-start gap-2">
                    <FileText className="w-4 h-4 text-navy-800 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="font-bold text-navy-800">{r.title}</p>
                      <p className="text-[10px] text-slate-400 line-clamp-1">{r.description}</p>
                    </div>
                  </div>
                </td>
                <td className="py-2.5 px-3 text-slate-600">{r.subjectName}</td>
                <td className="py-2.5 px-3"><Badge tone="navy">{r.fileType}</Badge></td>
                <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                  {r.externalUrl ? 'اختبار تفاعلي' : r.hasBody ? `${Math.round((r.bodyChars ?? 0) / 1000)} ألف حرف` : `${r.pageCount} صفحة`}
                </td>
                <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">{r.fileSize}</td>
                <td className="py-2.5 px-3">
                  <button
                    type="button"
                    onClick={() => void togglePublish(r)}
                    disabled={busyId !== ''}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold border transition-colors disabled:opacity-50 ${
                      r.isPublished
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {busyId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    {r.isPublished ? 'ظاهر للطلاب' : 'مسحوب'}
                  </button>
                </td>
                <td className="py-2.5 px-3">
                  {r.isVerifiedCurriculum ? <Badge tone="green">موثَّق</Badge> : <Badge tone="slate">{r.status === 'sample' ? 'تجريبي' : r.status}</Badge>}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <div className="flex items-center gap-2 text-[11px] text-slate-500">
        <Paperclip className="w-4 h-4 text-navy-800" />
        <span>كل عنصر مقروء من جدول المكتبة في قاعدة البيانات.</span>
      </div>

      {showUpload && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !uploading) setShowUpload(false); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="library-upload-title" dir="rtl" className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
          <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-100 bg-white p-4">
            <div><h2 id="library-upload-title" className="font-black text-navy-800">رفع كتاب أو ملف للمكتبة</h2><p className="mt-1 text-[11px] text-slate-500">الرفع مباشر إلى التخزين، بحد أقصى ٦٠ ميغابايت (كتب PDF الرسمية مقبولة).</p></div>
            <button type="button" aria-label="إغلاق" disabled={uploading} onClick={() => setShowUpload(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40"><X className="h-4 w-4" /></button>
          </header>
          <form onSubmit={(event) => void uploadResource(event)} className="space-y-3 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-xs font-bold text-slate-700">اسم الكتاب أو الملف
                <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={150} placeholder="يُستخدم اسم الملف إن تُرك فارغاً" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-navy-500" />
              </label>
              <label className="space-y-1 text-xs font-bold text-slate-700">التصنيف
                <select value={uploadCategory} onChange={(event) => setUploadCategory(event.target.value as ResourceCategory)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal">
                  {UPLOAD_CATEGORIES.map((value) => <option key={value} value={value}>{CATEGORY_LABEL[value]}</option>)}
                </select>
              </label>
              <label className="space-y-1 text-xs font-bold text-slate-700">المادة
                <select value={subjectId} onChange={(event) => setSubjectId(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal">
                  <option value="">بدون تحديد مادة</option>
                  {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
                </select>
              </label>
              <label className="space-y-1 text-xs font-bold text-slate-700">المؤلف (اختياري)
                <input value={author} onChange={(event) => setAuthor(event.target.value)} maxLength={80} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal" />
              </label>
              <label className="space-y-1 text-xs font-bold text-slate-700">سنة النشر (اختياري)
                <input value={publishYear} onChange={(event) => setPublishYear(event.target.value)} maxLength={9} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal" />
              </label>
              <label className="space-y-1 text-xs font-bold text-slate-700">عدد الصفحات (اختياري)
                <input type="number" min="0" max="10000" value={pageCount} onChange={(event) => setPageCount(event.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal" />
              </label>
            </div>
            <label className="block space-y-1 text-xs font-bold text-slate-700">وصف مختصر (اختياري)
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={600} rows={2} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal" />
            </label>
            {/* اختيار الملف: زر حقيقي بدل عنصر المتصفح الافتراضي */}
            <div className="space-y-2 rounded-xl border border-dashed border-slate-300 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-700">ملف من الجهاز</span>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-navy-800 px-4 py-2.5 text-xs font-bold text-white active:scale-95">
                  <Upload className="h-4 w-4" />
                  {file ? 'تغيير الملف' : 'اختيار ملف'}
                  <input
                    type="file"
                    accept={ACCEPTED_FILES}
                    disabled={uploading}
                    onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-[10px] font-normal text-slate-500">
                {file
                  ? `${file.name} — ${(file.size / (1024 * 1024)).toFixed(1)} MB`
                  : 'PDF أو Office أو صورة — حتى ٦٠ ميغابايت'}
              </p>
            </div>

            {/* أو رابط جاهز — لا يحتاج منتقي ملفات */}
            <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <span className="text-xs font-bold text-slate-700">أو رابط ملف/اختبار جاهز</span>
              <input
                value={linkUrl}
                onChange={(event) => setLinkUrl(event.target.value)}
                dir="ltr"
                placeholder="https://…"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-normal outline-none focus:border-navy-500"
              />
              <button
                type="button"
                disabled={uploading || !linkUrl.trim() || !title.trim()}
                onClick={() => void addByLink()}
                className="w-full rounded-xl border border-navy-800 px-4 py-2.5 text-xs font-bold text-navy-800 disabled:opacity-40"
              >
                أضف هذا الرابط للمكتبة
              </button>
            </div>

            {uploadError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{uploadError}</p>}
            <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <button type="button" disabled={uploading} onClick={() => setShowUpload(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 disabled:opacity-50">إلغاء</button>
              <button type="submit" disabled={uploading || !file} className="inline-flex items-center gap-2 rounded-xl bg-navy-800 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">
                {uploading ? <><Loader2 className="h-4 w-4 animate-spin" /> جارٍ الرفع {Math.round(uploadProgress)}٪</> : <><Upload className="h-4 w-4" /> رفع وحفظ</>}
              </button>
            </footer>
          </form>
        </section>
      </div>}
    </div>
  );
};
