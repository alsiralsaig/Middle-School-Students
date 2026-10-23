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
}
interface SubjectOption { id: string; name: string }

const CATEGORY_LABEL: Record<ResourceCategory, string> = {
  all: 'الكل',
  notes: 'مذكرات',
  textbook: 'كتاب مقرر',
  worksheets: 'أوراق عمل',
  past_exams: 'امتحانات سابقة',
};
const CATEGORIES: ResourceCategory[] = ['all', 'notes', 'textbook', 'worksheets', 'past_exams'];
const UPLOAD_CATEGORIES = CATEGORIES.filter((category) => category !== 'all');
const ACCEPTED_FILES = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.webp';
const MAX_SIZE = 20 * 1024 * 1024;
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
  const [summary, setSummary] = useState<{ total: number; verified: number; downloads: number } | null>(null);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [offline, setOffline] = useState(false);
  const [category, setCategory] = useState<ResourceCategory>('all');
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [file, setFile] = useState<File | null>(null);
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
        summary: { total: number; verified: number; downloads: number };
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

  const resetUploadForm = () => {
    setFile(null); setTitle(''); setUploadCategory('textbook'); setSubjectId('');
    setAuthor(''); setPublishYear(''); setPageCount(''); setDescription(''); setUploadError('');
  };

  const uploadResource = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file || uploading) return;
    if (file.size > MAX_SIZE) { setUploadError('حجم الملف أكبر من ٢٠ ميغابايت'); return; }
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
            تُرفع الكتب والملفات مباشرة إلى التخزين، ويُحفظ سجلها في المكتبة بعد تأكيد الخادم.
          </p>
        </div>
        <button type="button" onClick={() => { setUploadError(''); setShowUpload(true); }} className="inline-flex items-center gap-2 rounded-xl bg-navy-800 px-4 py-2.5 text-xs font-bold text-white hover:bg-navy-700">
          <Upload className="w-4 h-4" /> رفع كتاب أو ملف
        </button>
      </header>
      <MediaManager ownerType="library" ownerId="shared-library" title="ملفات وروابط المكتبة عبر النظام المشترك" />

      {summary && (
        <div className="grid grid-cols-3 gap-3">
          {[
            ['إجمالي العناصر', summary.total],
            ['موثَّقة', summary.verified],
            ['مرّات التحميل', summary.downloads],
          ].map(([label, value]) => (
            <div key={label as string} className="bg-white border border-slate-200 rounded-2xl p-3">
              <div className="text-lg font-black text-navy-800 nums">{value}</div>
              <div className="text-[11px] text-slate-500">{label}</div>
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

        {loading ? (
          <LoadingState label="جارٍ تحميل عناصر المكتبة…" />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="لا عناصر في هذا التصنيف"
            description="لم تُضف أي عناصر بعد. استخدم زر رفع كتاب أو ملف لإضافة أول عنصر."
          />
        ) : (
          <Table head={['العنوان', 'المادة', 'النوع', 'الصفحات', 'الحجم', 'التوفر', 'الحالة']}>
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
                <td className="py-2.5 px-3 nums text-slate-500">{r.pageCount}</td>
                <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">{r.fileSize}</td>
                <td className="py-2.5 px-3 nums text-slate-500">{r.downloadCount} تحميل</td>
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
            <div><h2 id="library-upload-title" className="font-black text-navy-800">رفع كتاب أو ملف للمكتبة</h2><p className="mt-1 text-[11px] text-slate-500">الرفع مباشر إلى التخزين، بحد أقصى ٢٠ ميغابايت.</p></div>
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
            <label className="block space-y-1 text-xs font-bold text-slate-700">الملف
              <input required type="file" accept={ACCEPTED_FILES} onChange={(event) => setFile(event.target.files?.[0] ?? null)} disabled={uploading} className="block w-full rounded-xl border border-slate-200 p-2 text-xs font-normal file:ml-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2" />
              <span className="block text-[10px] font-normal text-slate-400">PDF، ملفات Office، TXT/CSV أو صور. الحد الأقصى ٢٠ ميغابايت.{file ? ` الملف المحدد: ${file.name} (${(file.size / (1024 * 1024)).toFixed(1)} MB)` : ''}</span>
            </label>
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
