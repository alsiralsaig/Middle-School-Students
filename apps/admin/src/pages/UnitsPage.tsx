import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Pencil } from 'lucide-react';
import { Button, Card, LoadingState, NotConnectedNote, Table } from '../components/ui';
import { EditDialog } from '../components/EditDialog';
import { useSubjects } from '../hooks/useSubjects';
import { api } from '../lib/contentApi';

export const UnitsPage: React.FC = () => {
  const { subjects, loading, offline, reload } = useSubjects();
  const [selected, setSelected] = React.useState<null | { id: string; values: Record<string, string> }>(null);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const units = (subjects ?? []).flatMap((subject) => subject.units.map((unit) => ({ ...unit, subjectId: subject.id, subjectName: subject.name })));
  const edit = (unit: (typeof units)[number]) => { setError(''); setSelected({ id: unit.id, values: { title: unit.title, description: unit.description, unitNumber: String(unit.unitNumber) } }); };
  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); if (!selected || saving) return; setSaving(true); setError('');
    try { await api.updateUnit(selected.id, { title: selected.values.title, description: selected.values.description, unitNumber: Number(selected.values.unitNumber) }); setSelected(null); reload(); }
    catch (e2) { setError(e2 instanceof Error ? e2.message : 'تعذّر تعديل الوحدة'); }
    finally { setSaving(false); }
  };
  return <div className="space-y-5" dir="rtl">
    <header className="flex items-start justify-between gap-3"><div><h1 className="text-xl font-black text-navy-800">الوحدات</h1><p className="text-xs text-slate-500 mt-1">عرض وحدات المواد وتعديل أسمائها وأوصافها وأرقامها.</p></div><Link to="/subjects" className="inline-flex items-center gap-1.5 border border-navy-200 rounded-xl px-3 py-2 text-xs font-bold text-navy-800"><ArrowRight className="w-4 h-4" /> المواد</Link></header>
    {offline && <NotConnectedNote>تعذّر الوصول إلى قاعدة البيانات لعرض الوحدات.</NotConnectedNote>}
    <Card>{loading ? <LoadingState label="جارٍ تحميل الوحدات…" /> : units.length === 0 ? <div className="p-4 text-sm text-slate-500">لا توجد وحدات بعد. افتح المادة المطلوبة وأضف وحدة.</div> : <Table head={['رقم', 'الوحدة', 'المادة', 'الدروس', '']}>{units.map((u) => <tr key={u.id} className="hover:bg-slate-50/70"><td className="py-3 px-3 nums">{u.unitNumber}</td><td className="py-3 px-3"><span className="font-bold text-navy-800">{u.title}</span><span className="block text-[10px] text-slate-500">{u.description}</span></td><td className="py-3 px-3"><Link to={`/subjects/${u.subjectId}`} className="text-navy-800 hover:underline">{u.subjectName}</Link></td><td className="py-3 px-3 nums">{u.lessons.length}</td><td className="py-3 px-3"><Button variant="outline" onClick={() => edit(u)}><Pencil className="w-3.5 h-3.5" /> تعديل</Button></td></tr>)}</Table>}</Card>
    {selected && <EditDialog title="تعديل الوحدة" fields={[{ name: 'title', label: 'عنوان الوحدة', required: true }, { name: 'unitNumber', label: 'رقم الوحدة', type: 'number', required: true }, { name: 'description', label: 'الوصف', multiline: true }]} values={selected.values} onChange={(name, value) => setSelected((s) => s ? { ...s, values: { ...s.values, [name]: value } } : s)} onClose={() => setSelected(null)} onSubmit={save} saving={saving} error={error} />}
  </div>;
};
