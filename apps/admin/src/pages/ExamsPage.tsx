import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, Plus, RotateCw, Trash2 } from 'lucide-react';
import { Badge, Button, Card, EmptyState, NotConnectedNote, Table } from '../components/ui';
import { getApiBase } from '../lib/serverUrl';
import { useSubjects } from '../hooks/useSubjects';

interface ExamRow { id: string; title: string; subjectId: string; subjectName: string; durationMinutes: number; questionsCount: number; status: string }
interface DraftQuestion { question: string; options: string[]; correctIndex: number; explanation: string }
const emptyQuestion = (): DraftQuestion => ({ question: '', options: ['', '', '', ''], correctIndex: 0, explanation: '' });

export const ExamsPage: React.FC = () => {
  const navigate = useNavigate();
  const { subjects } = useSubjects();
  const [rows, setRows] = React.useState<ExamRow[] | null>(null);
  const [offline, setOffline] = React.useState(false);
  const [dialog, setDialog] = React.useState(false);
  const [title, setTitle] = React.useState('');
  const [subjectId, setSubjectId] = React.useState('');
  const [durationMinutes, setDurationMinutes] = React.useState(30);
  const [questions, setQuestions] = React.useState<DraftQuestion[]>([emptyQuestion()]);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');

  const load = React.useCallback(async () => {
    try { const r = await fetch(`${getApiBase()}/api/exams`, { headers: { Accept: 'application/json' } }); if (!r.ok) throw new Error(); const data = await r.json() as { exams: ExamRow[] }; setRows(data.exams); setOffline(false); }
    catch { setRows(null); setOffline(true); }
  }, []);
  React.useEffect(() => { void load(); }, [load]);

  const openCreate = () => {
    setTitle(''); setSubjectId(subjects?.[0]?.id ?? ''); setDurationMinutes(30);
    setQuestions([emptyQuestion()]); setError(''); setDialog(true);
  };
  const updateQuestion = (index: number, update: Partial<DraftQuestion>) => setQuestions((current) => current.map((q, i) => i === index ? { ...q, ...update } : q));
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); if (saving) return; setSaving(true); setError('');
    try {
      const response = await fetch(`${getApiBase()}/api/admin/exams`, {
        method: 'POST', credentials: 'include', headers: { 'X-App': 'admin', 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ title, subjectId, durationMinutes, questions }),
      });
      const data = await response.json().catch(() => null) as { exam?: { id: string }; error?: string } | null;
      if (!response.ok || !data?.exam?.id) throw new Error(data?.error || 'تعذّر إنشاء الامتحان');
      setDialog(false); navigate(`/exams/${encodeURIComponent(data.exam.id)}`);
    } catch (e2) { setError(e2 instanceof Error ? e2.message : 'تعذّر إنشاء الامتحان'); }
    finally { setSaving(false); }
  };

  return <div className="space-y-5" dir="rtl">
    <header className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-xl font-black text-navy-800">الامتحانات</h1><p className="text-xs text-slate-500 mt-1">افتح أي امتحان لعرض أسئلته ومفتاح إجابته. النماذج الجديدة تدريبية وغير وزارية.</p></div><div className="flex gap-2"><button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 border border-slate-300 bg-white rounded-xl px-3 py-2 text-xs font-bold text-navy-800"><RotateCw className="w-3.5 h-3.5" /> تحديث</button><Button onClick={openCreate}><Plus className="w-4 h-4" /> إضافة امتحان</Button></div></header>
    {offline && <NotConnectedNote>تعذّر الوصول إلى الخادم لعرض الامتحانات.</NotConnectedNote>}
    <Card>{rows === null && !offline ? <div className="p-4 text-xs text-slate-500">جارٍ تحميل الامتحانات…</div> : rows?.length === 0 ? <EmptyState title="لا توجد امتحانات" description="أضف امتحاناً تدريبياً من الزر أعلى الصفحة." /> : rows && <Table head={['الامتحان', 'المادة', 'الأسئلة', 'المدة', 'التصنيف', '']}>
      {rows.map((e) => <tr key={e.id} className="hover:bg-slate-50/70"><td className="py-3 px-3 font-bold"><Link to={`/exams/${encodeURIComponent(e.id)}`} className="inline-flex items-center gap-1.5 text-navy-800 hover:text-gold-600"><Eye className="w-4 h-4" />{e.title}</Link></td><td className="py-3 px-3">{e.subjectName}</td><td className="py-3 px-3 nums">{e.questionsCount}</td><td className="py-3 px-3 nums">{e.durationMinutes} دقيقة</td><td className="py-3 px-3"><Badge tone={e.status === 'verified' ? 'green' : 'amber'}>{e.status === 'verified' ? 'مراجَع' : 'تدريبي — غير وزاري'}</Badge></td><td className="py-3 px-3"><Link to={`/exams/${encodeURIComponent(e.id)}`} className="text-xs font-bold text-navy-800">فتح <ArrowRight className="inline w-3.5 h-3.5" /></Link></td></tr>)}
    </Table>}</Card>
    <Link to="/activities" className="inline-flex items-center gap-1.5 rounded-xl border border-navy-200 px-4 py-2.5 text-xs font-extrabold text-navy-800"><ArrowRight className="w-4 h-4" /> محاولات الامتحانات والتقارير</Link>

    {dialog && <div className="fixed inset-0 z-[100] bg-slate-950/50 p-3 sm:p-5 grid place-items-center" dir="rtl"><form onSubmit={submit} className="w-full max-w-2xl max-h-[94vh] overflow-y-auto rounded-2xl bg-white shadow-2xl border border-slate-200">
      <div className="sticky top-0 bg-white z-10 p-4 border-b border-slate-100 flex items-center justify-between"><div><h2 className="font-black text-navy-800">إضافة امتحان</h2><p className="text-[10px] text-amber-700 mt-1">سيُسجّل تدريبياً وغير وزاري</p></div><button type="button" onClick={() => setDialog(false)} className="px-3 py-2 text-xs font-bold">إغلاق</button></div>
      <div className="p-4 space-y-4">
        <label className="block text-xs font-bold text-slate-600">عنوان الامتحان<input required minLength={3} value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-sm" /></label>
        <div className="grid sm:grid-cols-2 gap-3"><label className="block text-xs font-bold text-slate-600">المادة<select required value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-sm"><option value="">اختر المادة</option>{subjects?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label className="block text-xs font-bold text-slate-600">المدة (دقيقة)<input required type="number" min={5} max={180} value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-sm" /></label></div>
        <div className="flex items-center justify-between"><h3 className="text-sm font-black text-navy-800">الأسئلة ومفتاح الإجابة</h3><button type="button" onClick={() => setQuestions((q) => [...q, emptyQuestion()])} className="text-xs font-bold text-navy-800 border border-slate-300 rounded-lg px-3 py-2"><Plus className="inline w-3.5 h-3.5" /> سؤال</button></div>
        {questions.map((q, qi) => <section key={qi} className="rounded-xl border border-slate-200 p-3 space-y-3"><div className="flex justify-between items-center"><strong className="text-xs text-navy-800">السؤال {qi + 1}</strong>{questions.length > 1 && <button type="button" onClick={() => setQuestions((all) => all.filter((_, i) => i !== qi))} aria-label="حذف السؤال" className="text-rose-600"><Trash2 className="w-4 h-4" /></button>}</div><label className="block text-xs font-bold text-slate-600">نص السؤال<textarea required minLength={2} rows={2} value={q.question} onChange={(e) => updateQuestion(qi, { question: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm" /></label><div className="grid sm:grid-cols-2 gap-2">{q.options.map((option, oi) => <label key={oi} className="text-[11px] font-bold text-slate-600">الخيار {oi + 1}<div className="flex gap-2 mt-1"><input required value={option} onChange={(e) => updateQuestion(qi, { options: q.options.map((x, i) => i === oi ? e.target.value : x) })} className="min-w-0 flex-1 rounded-lg border border-slate-300 p-2 text-sm" /><input type="radio" name={`correct-${qi}`} aria-label={`الخيار الصحيح ${oi + 1}`} checked={q.correctIndex === oi} onChange={() => updateQuestion(qi, { correctIndex: oi })} /></div></label>)}</div><label className="block text-xs font-bold text-slate-600">تفسير الإجابة (اختياري)<textarea rows={2} value={q.explanation} onChange={(e) => updateQuestion(qi, { explanation: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm" /></label></section>)}
        {error && <p role="alert" className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700">{error}</p>}
      </div>
      <div className="sticky bottom-0 bg-white border-t border-slate-100 p-4 flex justify-end gap-2"><button type="button" onClick={() => setDialog(false)} className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold">إلغاء</button><button type="submit" disabled={saving || !subjectId} className="px-4 py-2 rounded-xl bg-navy-800 text-white text-xs font-bold disabled:opacity-50">{saving ? 'جارٍ الحفظ…' : 'حفظ الامتحان وفتحه'}</button></div>
    </form></div>}
  </div>;
};
