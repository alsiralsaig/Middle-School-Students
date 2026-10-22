import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, FilePlus2, Loader2, Trash2 } from 'lucide-react';
import { put } from '@vercel/blob/client';
import { Badge, Card, EmptyState, ErrorState, LoadingState, NotConnectedNote } from '../components/ui';
import { getApiBase } from '../lib/serverUrl';

interface Question { id: string; question: string; options: string[]; correctIndex: number; explanation: string }
interface Attachment { id: string; title: string; fileType: string; fileSize: string; filePath: string | null }
interface ExamDetail { id: string; title: string; subjectName: string; durationMinutes: number; status: string; questions: Question[]; attachments: Attachment[] }

export const ExamDetailPage: React.FC = () => {
  const { examId = '' } = useParams();
  const [exam, setExam] = React.useState<ExamDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [offline, setOffline] = React.useState(false);
  const [error, setError] = React.useState('');
  const [uploading, setUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [fileError, setFileError] = React.useState('');

  const load = React.useCallback(async () => {
    setLoading(true); setError('');
    try {
      const response = await fetch(`${getApiBase()}/api/admin/exams/${encodeURIComponent(examId)}`, {
        headers: { Accept: 'application/json', 'X-App': 'admin' }, credentials: 'include',
      });
      const data = await response.json().catch(() => null) as { exam?: ExamDetail; error?: string } | null;
      if (!response.ok || !data?.exam) throw new Error(data?.error || 'تعذّر تحميل الامتحان');
      setExam(data.exam); setOffline(false);
    } catch (e) { setExam(null); setOffline(e instanceof TypeError); setError(e instanceof Error ? e.message : 'تعذّر تحميل الامتحان'); }
    finally { setLoading(false); }
  }, [examId]);
  React.useEffect(() => { void load(); }, [load]);

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { setFileError('حجم الملف أكبر من ٢٠ ميغابايت'); return; }
    setUploading(true); setFileError('');
    try {
      const extension = file.name.split('.').pop()?.toLowerCase() || '';
      const mimeByExtension: Record<string, string> = {
        pdf: 'application/pdf', doc: 'application/msword',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        txt: 'text/plain', csv: 'text/csv', jpg: 'image/jpeg', jpeg: 'image/jpeg',
        png: 'image/png', webp: 'image/webp',
      };
      const safeName = file.name.normalize('NFKD').replace(/[^\p{L}\p{N}._-]+/gu, '_').slice(-120) || `attachment.${extension}`;
      const pathname = `exam-attachments/${examId}/${safeName}`;
      const tokenResponse = await fetch(`${getApiBase()}/api/admin/exams/${encodeURIComponent(examId)}/attachments/client`, {
        method: 'POST', credentials: 'include',
        headers: { 'X-App': 'admin', 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          type: 'blob.generate-client-token',
          payload: {
            pathname,
            clientPayload: JSON.stringify({ fileName: file.name, sizeBytes: file.size }),
            multipart: false,
          },
        }),
      });
      const tokenData = await tokenResponse.json().catch(() => null) as { clientToken?: string; error?: string } | null;
      if (!tokenResponse.ok || !tokenData?.clientToken) {
        throw new Error(tokenData?.error || 'تعذّر إصدار إذن رفع الملف');
      }

      // التوكن مقيّد بالامتحان والحجم والنوع؛ البايتات تذهب من المتصفح إلى Blob مباشرة.
      const blob = await put(pathname, file, {
        access: 'public', token: tokenData.clientToken,
        contentType: mimeByExtension[extension] || file.type,
        onUploadProgress: ({ percentage }) => setUploadProgress(percentage),
      });

      // ينتظر ظهور سجل الإكمال الذي يحفظه callback الخادمي، لتجنب رفع الملف مرتين.
      let saved = false;
      for (let attempt = 0; attempt < 10; attempt++) {
        try {
          const check = await fetch(`${getApiBase()}/api/admin/exams/${encodeURIComponent(examId)}`, {
            headers: { Accept: 'application/json', 'X-App': 'admin' }, credentials: 'include',
          });
          const data = await check.json().catch(() => null) as { exam?: ExamDetail } | null;
          if (check.ok && data?.exam) {
            setExam(data.exam);
            if (data.exam.attachments.some((attachment) => attachment.filePath === blob.url)) {
              saved = true;
              break;
            }
          }
        } catch { /* نعيد المحاولة؛ الملف وصل إلى التخزين بالفعل */ }
        await new Promise((resolve) => window.setTimeout(resolve, 500));
      }
      if (!saved) {
        setFileError('تم رفع الملف إلى التخزين، لكن لم يصل تأكيد حفظه بعد. حدّث الصفحة بعد قليل قبل إعادة رفعه.');
      }
    } catch (e2) { setFileError(e2 instanceof Error ? e2.message : 'تعذّر رفع الملف'); }
    finally { setUploading(false); setUploadProgress(0); }
  };

  const removeAttachment = async (attachment: Attachment) => {
    if (!window.confirm(`حذف الملف «${attachment.title}» من هذا الامتحان؟`)) return;
    setFileError('');
    try {
      const response = await fetch(`${getApiBase()}/api/admin/exams/${encodeURIComponent(examId)}/attachments/${encodeURIComponent(attachment.id)}`, {
        method: 'DELETE', credentials: 'include', headers: { 'X-App': 'admin', Accept: 'application/json' },
      });
      const data = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(data?.error || 'تعذّر حذف الملف');
      await load();
    } catch (e) { setFileError(e instanceof Error ? e.message : 'تعذّر حذف الملف'); }
  };

  if (loading) return <div className="space-y-3" dir="rtl"><Link to="/exams" className="inline-flex items-center gap-1 text-xs font-bold text-navy-800"><ArrowRight className="w-4 h-4" /> رجوع للامتحانات</Link><LoadingState label="جارٍ تحميل الامتحان…" /></div>;
  if (!exam) return <div className="space-y-3" dir="rtl"><Link to="/exams" className="inline-flex items-center gap-1 text-xs font-bold text-navy-800"><ArrowRight className="w-4 h-4" /> رجوع للامتحانات</Link>{offline ? <NotConnectedNote>تعذّر الاتصال بالخادم.</NotConnectedNote> : <ErrorState title="تعذّر فتح الامتحان" description={error || 'الامتحان غير موجود'} />}</div>;

  return <div className="space-y-5" dir="rtl">
    <Link to="/exams" className="inline-flex items-center gap-1 text-xs font-bold text-navy-800"><ArrowRight className="w-4 h-4" /> رجوع للامتحانات</Link>
    <header className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-xl font-black text-navy-800">{exam.title}</h1><p className="text-xs text-slate-500 mt-1">{exam.subjectName} · {exam.questions.length} أسئلة · {exam.durationMinutes} دقيقة</p></div><Badge tone="amber">نموذج تدريبي — غير وزاري</Badge></header>

    <Card title="ملفات الامتحان" subtitle="PDF وWord وExcel وPowerPoint والنصوص والصور، حتى ٢٠ ميغابايت؛ دوام الملفات يتطلب خادماً بقرص دائم.">
      <div className="p-4 space-y-3">
        <label className="inline-flex items-center gap-2 cursor-pointer rounded-xl bg-navy-800 text-white px-4 py-2.5 text-xs font-bold hover:bg-navy-700">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FilePlus2 className="w-4 h-4" />}
          {uploading ? `جارٍ رفع الملف ${Math.round(uploadProgress)}٪…` : 'إضافة ملف'}
          <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/csv,image/jpeg,image/png,image/webp" onChange={upload} disabled={uploading} className="sr-only" />
        </label>
        {fileError && <p role="alert" className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{fileError}</p>}
        {exam.attachments.length === 0 ? <p className="text-xs text-slate-400">لا توجد ملفات مرفقة.</p> : <ul className="divide-y divide-slate-100">{exam.attachments.map((a) => <li key={a.id} className="flex items-center justify-between gap-3 py-2"><div className="min-w-0"><a href={a.filePath ? (a.filePath.startsWith('/') ? `${getApiBase()}${a.filePath}` : a.filePath) : '#'} target="_blank" rel="noreferrer" className="font-bold text-xs text-navy-800 hover:underline break-all">{a.title}</a><p className="text-[10px] text-slate-500">{a.fileType} · {a.fileSize}</p></div><button type="button" onClick={() => void removeAttachment(a)} aria-label="حذف المرفق" className="shrink-0 p-2 text-rose-600 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4" /></button></li>)}</ul>}
      </div>
    </Card>

    {exam.questions.length === 0 ? <Card><EmptyState title="لا توجد أسئلة بعد" description="هذا الامتحان لا يحتوي أسئلة مسجلة." /></Card> : exam.questions.map((q, index) => <Card key={q.id} title={`السؤال ${index + 1}`} subtitle={q.question}>
      <div className="p-4 space-y-2">{q.options.map((option, optionIndex) => <div key={optionIndex} className={`rounded-xl border px-3 py-2 text-sm ${optionIndex === q.correctIndex ? 'border-emerald-300 bg-emerald-50 text-emerald-800 font-bold' : 'border-slate-200 text-slate-700'}`}><span className="nums ml-2">{optionIndex + 1}.</span>{option}{optionIndex === q.correctIndex && <CheckCircle2 className="inline w-4 h-4 mr-2" />}</div>)}{q.explanation && <p className="text-xs text-slate-600 bg-slate-50 rounded-xl p-3">التفسير: {q.explanation}</p>}</div>
    </Card>)}
  </div>;
};
