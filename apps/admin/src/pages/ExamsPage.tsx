import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, RotateCw } from 'lucide-react';
import { Badge, Card, EmptyState, NotConnectedNote, Table } from '../components/ui';
import { getApiBase } from '../lib/serverUrl';

interface ExamRow { id: string; title: string; subjectId: string; subjectName: string; durationMinutes: number; questionsCount: number; status: string }
export const ExamsPage: React.FC = () => {
  const [rows, setRows] = React.useState<ExamRow[] | null>(null);
  const [offline, setOffline] = React.useState(false);
  const load = React.useCallback(async () => {
    try { const r = await fetch(`${getApiBase()}/api/exams`, { headers: { Accept: 'application/json' } }); if (!r.ok) throw new Error(); const data = await r.json() as { exams: ExamRow[] }; setRows(data.exams); setOffline(false); }
    catch { setRows(null); setOffline(true); }
  }, []);
  React.useEffect(() => { void load(); }, [load]);
  return <div className="space-y-5" dir="rtl">
    <header className="flex items-start justify-between gap-3"><div><h1 className="text-xl font-black text-navy-800">الامتحانات</h1><p className="text-xs text-slate-500 mt-1">الامتحانات المخزّنة وأسئلتها، مع تمييز النماذج التدريبية.</p></div><button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 border border-slate-300 bg-white rounded-xl px-3 py-2 text-xs font-bold text-navy-800"><RotateCw className="w-3.5 h-3.5" /> تحديث</button></header>
    {offline && <NotConnectedNote>تعذّر الوصول إلى الخادم لعرض الامتحانات.</NotConnectedNote>}
    <Card>{rows === null && !offline ? <div className="p-4 text-xs text-slate-500">جارٍ تحميل الامتحانات…</div> : rows?.length === 0 ? <EmptyState title="لا توجد امتحانات" description="ستظهر الامتحانات هنا بعد إضافتها إلى قاعدة البيانات." /> : rows && <Table head={['الامتحان', 'المادة', 'الأسئلة', 'المدة', 'التصنيف']}>{rows.map((e) => <tr key={e.id} className="hover:bg-slate-50/70"><td className="py-3 px-3 font-bold text-navy-800">{e.title}</td><td className="py-3 px-3">{e.subjectName}</td><td className="py-3 px-3 nums">{e.questionsCount}</td><td className="py-3 px-3 nums">{e.durationMinutes} دقيقة</td><td className="py-3 px-3"><Badge tone={e.status === 'verified' ? 'green' : 'amber'}>{e.status === 'verified' ? 'مراجَع' : 'تدريبي — غير وزاري'}</Badge></td></tr>)}</Table>}</Card>
    <Link to="/activities" className="inline-flex items-center gap-1.5 rounded-xl border border-navy-200 px-4 py-2.5 text-xs font-extrabold text-navy-800"><ArrowRight className="w-4 h-4" /> محاولات الامتحانات والتقارير</Link>
  </div>;
};
