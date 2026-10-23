import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Clock3, FileText, Pencil, Trash2, Upload } from 'lucide-react';
import { Badge, Card, EmptyState, ErrorState, LoadingState, NotConnectedNote } from '../components/ui';
import { api, type LessonRecord } from '../lib/contentApi';
import { getApiBase } from '../lib/serverUrl';
import { uploadLessonAttachmentBlob } from '../lib/lessonBlobUpload';

interface LessonFile { id?: string; title?: string; name?: string; url?: string; path?: string; filePath?: string; type?: string; fileType?: string; fileSize?: string }
type FullLesson = LessonRecord & { attachments: LessonFile[] };

export const LessonDetailPage: React.FC = () => {
  const { lessonId = '' } = useParams();
  const navigate = useNavigate();
  const [lesson, setLesson] = React.useState<FullLesson | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [offline, setOffline] = React.useState(false);
  const [error, setError] = React.useState('');
  const [deleting, setDeleting] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [deletingFile, setDeletingFile] = React.useState<string | null>(null);
  const fileInput = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true); setError('');
      try { const data = await api.getLesson(lessonId) as FullLesson; if (alive) { setLesson({ ...data, attachments: Array.isArray(data.attachments) ? data.attachments : [] }); setOffline(false); } }
      catch (e) { if (alive) { setLesson(null); setOffline(api.isOffline(e)); setError(e instanceof Error ? e.message : 'تعذّر تحميل الدرس'); } }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [lessonId]);

  const uploadAttachment = async (file?: File) => {
    if (fileInput.current) fileInput.current.value = '';
    if (!file || !lesson || uploading) return;
    setUploading(true); setUploadProgress(0); setError('');
    try {
      const blob = await uploadLessonAttachmentBlob(lesson.id, file, setUploadProgress);
      // سجل المرفق يكتبه callback الخادمي بعد إتمام الرفع؛ ننتظره قبل تأكيد النجاح.
      let saved = false;
      for (let attempt = 0; attempt < 10; attempt++) {
        try {
          const fresh = await api.getLesson(lesson.id) as FullLesson;
          const attachments = Array.isArray(fresh.attachments) ? fresh.attachments : [];
          setLesson({ ...fresh, attachments });
          if (attachments.some((attachment) => attachment.filePath === blob.url || attachment.url === blob.url)) {
            saved = true;
            break;
          }
        } catch { /* أعد المحاولة؛ الملف وصل إلى Blob بالفعل */ }
        await new Promise((resolve) => window.setTimeout(resolve, 500));
      }
      if (!saved) setError('تم رفع الملف إلى التخزين، لكن لم يصل تأكيد حفظه بعد. حدّث الصفحة بعد قليل قبل إعادة رفعه.');
    } catch (e) { setError(e instanceof Error ? e.message : 'تعذّر رفع الملف'); }
    finally { setUploading(false); setUploadProgress(0); }
  };

  const removeAttachment = async (file: LessonFile) => {
    if (!lesson || !file.id || deletingFile) return;
    if (!window.confirm(`حذف المرفق «${file.title ?? file.name ?? 'ملف'}»؟`)) return;
    setDeletingFile(file.id); setError('');
    try {
      const response = await fetch(`${getApiBase()}/api/admin/lessons/${encodeURIComponent(lesson.id)}/attachments/${encodeURIComponent(file.id)}`, {
        method: 'DELETE', credentials: 'include', headers: { 'X-App': 'admin', Accept: 'application/json' },
      });
      const data = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(data?.error || 'تعذّر حذف المرفق');
      setLesson((current) => current ? { ...current, attachments: current.attachments.filter((x) => x.id !== file.id) } : current);
    } catch (e) { setError(e instanceof Error ? e.message : 'تعذّر حذف المرفق'); }
    finally { setDeletingFile(null); }
  };

  const removeLesson = async () => {
    if (!lesson || deleting) return;
    if (!window.confirm(`حذف «${lesson.title}»؟ لن تُحذف تقدّمات الطلاب أو تقييماتهم؛ إذا كان للدرس سجلات طلابية سيمنع الخادم حذفه.`)) return;
    setDeleting(true); setError('');
    try {
      const response = await fetch(`${getApiBase()}/api/admin/lessons/${encodeURIComponent(lesson.id)}`, { method: 'DELETE', credentials: 'include', headers: { 'X-App': 'admin', Accept: 'application/json' } });
      const data = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(data?.error || 'تعذّر حذف الدرس');
      navigate('/content', { replace: true });
    } catch (e) { setError(e instanceof Error ? e.message : 'تعذّر حذف الدرس'); }
    finally { setDeleting(false); }
  };

  if (loading) return <div className="space-y-3" dir="rtl"><Link to="/content" className="inline-flex items-center gap-1 text-xs font-bold text-navy-800"><ArrowRight className="w-4 h-4" /> رجوع للدروس</Link><LoadingState label="جارٍ تحميل الدرس كاملاً…" /></div>;
  if (!lesson) return <div className="space-y-3" dir="rtl"><Link to="/content" className="inline-flex items-center gap-1 text-xs font-bold text-navy-800"><ArrowRight className="w-4 h-4" /> رجوع للدروس</Link>{offline ? <NotConnectedNote>تعذّر الاتصال بالخادم.</NotConnectedNote> : <ErrorState title="تعذّر فتح الدرس" description={error || 'الدرس غير موجود'} />}</div>;

  return <div className="space-y-5" dir="rtl">
    <Link to="/content" className="inline-flex items-center gap-1 text-xs font-bold text-navy-800"><ArrowRight className="w-4 h-4" /> رجوع للدروس</Link>
    <header className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-xl font-black text-navy-800">{lesson.title}</h1><p className="text-xs text-slate-500 mt-1 flex items-center gap-2"><Clock3 className="w-3.5 h-3.5" /> الدرس {lesson.lessonNumber} · {lesson.durationMinutes} دقيقة · {lesson.subjectId}</p></div><div className="flex items-center gap-2"><Badge tone={lesson.status === 'verified' ? 'green' : 'amber'}>{lesson.status === 'verified' ? 'مراجَع' : 'تجريبي'}</Badge><Link to={`/content/${encodeURIComponent(lesson.id)}/edit`} className="inline-flex items-center gap-1.5 rounded-xl bg-navy-800 px-3 py-2 text-xs font-bold text-white"><Pencil className="w-3.5 h-3.5" /> تعديل</Link><button type="button" onClick={() => void removeLesson()} disabled={deleting} className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 disabled:opacity-60"><Trash2 className="w-3.5 h-3.5" />{deleting ? 'جارٍ الحذف…' : 'حذف'}</button></div></header>
    {error && <p role="alert" className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700">{error}</p>}
    <Card title="ملخص الدرس"><div className="p-4 text-sm leading-8 text-slate-700 whitespace-pre-wrap">{lesson.summary || 'لا يوجد ملخص بعد.'}</div></Card>
    <Card title="الأهداف التعليمية">{lesson.learningObjectives.length ? <ul className="p-4 list-disc list-inside space-y-2 text-sm text-slate-700">{lesson.learningObjectives.map((x, i) => <li key={i}>{x}</li>)}</ul> : <EmptyState title="لا توجد أهداف مسجلة" description="لم تُسجل أهداف تعليمية لهذا الدرس بعد." />}</Card>
    <Card title="الشرح الكامل">{lesson.sections.length ? <div className="p-4 space-y-4">{lesson.sections.map((s, i) => <section key={i} className="border-b border-slate-100 pb-4 last:border-0"><h3 className="font-black text-navy-800 mb-2">{s.heading}</h3><p className="text-sm leading-8 text-slate-700 whitespace-pre-wrap">{s.body}</p></section>)}</div> : <EmptyState title="لا توجد أقسام شرح بعد" description="لا يحتوي الدرس على أقسام شرح حتى الآن." />}</Card>
    <div className="grid md:grid-cols-2 gap-4"><Card title="القواعد الأساسية">{lesson.keyRules.length ? <ul className="p-4 list-disc list-inside space-y-2 text-sm leading-7">{lesson.keyRules.map((x,i)=><li key={i}>{x}</li>)}</ul> : <div className="p-4 text-xs text-slate-400">لا توجد قواعد مسجلة.</div>}</Card><Card title="نصائح الامتحان">{lesson.examTips.length ? <ul className="p-4 list-disc list-inside space-y-2 text-sm leading-7">{lesson.examTips.map((x,i)=><li key={i}>{x}</li>)}</ul> : <div className="p-4 text-xs text-slate-400">لا توجد نصائح مسجلة.</div>}</Card></div>
    <Card title="أسئلة شائعة">{lesson.faq.length ? <div className="p-4 space-y-3">{lesson.faq.map((f,i)=><div key={i}><h3 className="font-bold text-navy-800">{f.q}</h3><p className="text-sm text-slate-600 mt-1">{f.a}</p></div>)}</div> : <div className="p-4 text-xs text-slate-400">لا توجد أسئلة شائعة.</div>}</Card>
    <Card title="مرفقات الدرس">
      <div className="p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-500">PDF وWord وExcel وPowerPoint وTXT وCSV والصور، حتى 20 ميغابايت للملف.</p>
          <input ref={fileInput} type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.webp" onChange={(event) => void uploadAttachment(event.currentTarget.files?.[0])} />
          <button type="button" onClick={() => fileInput.current?.click()} disabled={uploading} className="inline-flex items-center gap-2 rounded-xl bg-navy-800 px-3 py-2 text-xs font-bold text-white disabled:opacity-60">
            <Upload className="w-3.5 h-3.5" />{uploading ? `جارٍ الرفع ${Math.round(uploadProgress)}٪…` : 'رفع ملف'}
          </button>
        </div>
        {lesson.attachments.length === 0 ? <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">لا توجد مرفقات لهذا الدرس بعد.</p> :
          <ul className="space-y-2">{lesson.attachments.map((f, i) => {
            const url = f.url ?? f.filePath ?? f.path;
            return <li key={f.id ?? i} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3">
              <div className="flex min-w-0 items-center gap-2"><FileText className="h-4 w-4 shrink-0 text-navy-700" /><div className="min-w-0">
                {url ? <a href={url.startsWith('/') ? `${getApiBase()}${url}` : url} target="_blank" rel="noreferrer" className="block truncate text-sm font-bold text-navy-800 underline">{f.title ?? f.name ?? 'مرفق'}</a> : <span className="text-sm">{f.title ?? f.name ?? 'مرفق'}</span>}
                <span className="text-[11px] text-slate-400">{[f.fileType ?? f.type, f.fileSize].filter(Boolean).join(' · ')}</span>
              </div></div>
              {f.id && <button type="button" aria-label="حذف المرفق" onClick={() => void removeAttachment(f)} disabled={deletingFile === f.id} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 disabled:opacity-50"><Trash2 className="h-4 w-4" /></button>}
            </li>;
          })}</ul>}
      </div>
    </Card>
  </div>;
};
