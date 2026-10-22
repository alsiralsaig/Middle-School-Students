import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Badge, Card, EmptyState, ErrorState, LoadingState, NotConnectedNote } from '../components/ui';
import { getApiBase } from '../lib/serverUrl';

interface Question { id: string; question: string; options: string[]; correctIndex: number; explanation: string }
interface ExamDetail { id: string; title: string; subjectName: string; durationMinutes: number; status: string; questions: Question[] }

export const ExamDetailPage: React.FC = () => {
  const { examId = '' } = useParams();
  const [exam, setExam] = React.useState<ExamDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [offline, setOffline] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true); setError('');
      try {
        const response = await fetch(`${getApiBase()}/api/admin/exams/${encodeURIComponent(examId)}`, {
          headers: { Accept: 'application/json', 'X-App': 'admin' }, credentials: 'include',
        });
        const data = await response.json().catch(() => null) as { exam?: ExamDetail; error?: string } | null;
        if (!response.ok || !data?.exam) throw new Error(data?.error || 'تعذّر تحميل الامتحان');
        if (alive) { setExam(data.exam); setOffline(false); }
      } catch (e) {
        if (alive) { setExam(null); setOffline(e instanceof TypeError); setError(e instanceof Error ? e.message : 'تعذّر تحميل الامتحان'); }
      } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [examId]);

  if (loading) return <div className="space-y-3" dir="rtl"><Link to="/exams" className="inline-flex items-center gap-1 text-xs font-bold text-navy-800"><ArrowRight className="w-4 h-4" /> رجوع للامتحانات</Link><LoadingState label="جارٍ تحميل الامتحان…" /></div>;
  if (!exam) return <div className="space-y-3" dir="rtl"><Link to="/exams" className="inline-flex items-center gap-1 text-xs font-bold text-navy-800"><ArrowRight className="w-4 h-4" /> رجوع للامتحانات</Link>{offline ? <NotConnectedNote>تعذّر الاتصال بالخادم.</NotConnectedNote> : <ErrorState title="تعذّر فتح الامتحان" description={error || 'الامتحان غير موجود'} />}</div>;

  return <div className="space-y-5" dir="rtl">
    <Link to="/exams" className="inline-flex items-center gap-1 text-xs font-bold text-navy-800"><ArrowRight className="w-4 h-4" /> رجوع للامتحانات</Link>
    <header className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-xl font-black text-navy-800">{exam.title}</h1><p className="text-xs text-slate-500 mt-1">{exam.subjectName} · {exam.questions.length} أسئلة · {exam.durationMinutes} دقيقة</p></div><Badge tone="amber">نموذج تدريبي — غير وزاري</Badge></header>
    {exam.questions.length === 0 ? <Card><EmptyState title="لا توجد أسئلة بعد" description="هذا الامتحان لا يحتوي أسئلة مسجلة." /></Card> : exam.questions.map((q, index) => <Card key={q.id} title={`السؤال ${index + 1}`} subtitle={q.question}>
      <div className="p-4 space-y-2">{q.options.map((option, optionIndex) => <div key={optionIndex} className={`rounded-xl border px-3 py-2 text-sm ${optionIndex === q.correctIndex ? 'border-emerald-300 bg-emerald-50 text-emerald-800 font-bold' : 'border-slate-200 text-slate-700'}`}><span className="nums ml-2">{optionIndex + 1}.</span>{option}{optionIndex === q.correctIndex && <CheckCircle2 className="inline w-4 h-4 mr-2" />}</div>)}
        {q.explanation && <p className="text-xs text-slate-600 bg-slate-50 rounded-xl p-3">التفسير: {q.explanation}</p>}
      </div>
    </Card>)}
  </div>;
};
