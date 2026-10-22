import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Clock3, Pencil, Trash2 } from 'lucide-react';
import { Badge, Card, EmptyState, ErrorState, LoadingState, NotConnectedNote } from '../components/ui';
import { api, type LessonRecord } from '../lib/contentApi';
import { getApiBase } from '../lib/serverUrl';

interface LessonFile { title?: string; name?: string; url?: string; path?: string; filePath?: string; type?: string }
type FullLesson = LessonRecord & { attachments: LessonFile[] };

export const LessonDetailPage: React.FC = () => {
  const { lessonId = '' } = useParams();
  const navigate = useNavigate();
  const [lesson, setLesson] = React.useState<FullLesson | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [offline, setOffline] = React.useState(false);
  const [error, setError] = React.useState('');
  const [deleting, setDeleting] = React.useState(false);

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
    {lesson.attachments.length > 0 && <Card title="مرفقات الدرس"><ul className="p-4 space-y-2">{lesson.attachments.map((f,i)=>{const url=f.url ?? f.filePath ?? f.path; return <li key={i}>{url ? <a href={url.startsWith('/') ? `${getApiBase()}${url}` : url} target="_blank" rel="noreferrer" className="text-sm text-navy-800 underline">{f.title ?? f.name ?? url}</a> : <span className="text-sm">{f.title ?? f.name ?? 'مرفق'}</span>}</li>;})}</ul></Card>}
  </div>;
};
