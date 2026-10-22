import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, BookOpen, Layers, Pencil } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  NotConnectedNote,
  StatusBadge,
  Table,
} from '../components/ui';
import { useSubjects } from '../hooks/useSubjects';
import { subjectEmoji, CONTENT_STATUS } from '@shared/curriculum';
import OfficialStructureCard from '../components/OfficialStructureCard';
import { EditDialog } from '../components/EditDialog';
import { api } from '../lib/contentApi';

/* ============================ قائمة المواد ============================ */

export const SubjectsPage: React.FC = () => {
  const { subjects, loading, offline, reload } = useSubjects();
  const [dialog, setDialog] = useState<null | { id?: string; values: Record<string, string> }>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fields = [{ name: 'id', label: 'معرّف بالإنجليزية', required: true }, { name: 'name', label: 'اسم المادة', required: true }, { name: 'nameEn', label: 'الاسم بالإنجليزية' }, { name: 'code', label: 'الرمز', required: true }, { name: 'category', label: 'التصنيف (core / optional)' }, { name: 'description', label: 'الوصف', multiline: true }];
  const openSubject = (s?: import('../hooks/useSubjects').Subject) => {
    setError('');
    setDialog(s ? { id: s.id, values: { id: s.id, name: s.name, nameEn: s.nameEn, code: s.code, category: s.category, description: s.description } } : { values: { id: '', name: '', nameEn: '', code: '', category: 'core', description: '' } });
  };
  const saveSubject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); if (!dialog || saving) return; setSaving(true); setError('');
    try { const { id, ...data } = dialog.values;
      if (dialog.id) await api.updateSubject(dialog.id, data as Parameters<typeof api.updateSubject>[1]);
      else await api.createSubject({ id: id.trim().toLowerCase().replace(/\s+/g, '-'), ...data } as Parameters<typeof api.createSubject>[0]);
      setDialog(null); reload();
    } catch (e2) { setError(e2 instanceof Error ? e2.message : 'تعذّر الحفظ'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      {offline && (
        <NotConnectedNote>
          تعذّر الوصول إلى الخادم — لا يمكن عرض المواد. احفظ عنوان الخادم
          الصحيح من صفحة <strong>الإعدادات</strong>.
        </NotConnectedNote>
      )}

      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-black text-navy-800">المواد والدروس</h1>
          <p className="text-xs text-slate-500 mt-1">
            هيكل المنهج من قاعدة البيانات — أضف المواد والوحدات، ثم أنشئ الدروس من إدارة المحتوى.
          </p>
        </div>
        <Button onClick={() => openSubject()}>إضافة مادة</Button>
      </header>

      <Card>
        {loading ? (
          <LoadingState label="جارٍ تحميل المواد…" />
        ) : (
          <Table head={['المادة', 'الكود', 'المقرَّر (كتاب)', 'شرحنا', 'الحالة', '']}>
            {(subjects ?? []).map((s) => {
              const lessons = s.units.reduce((a, u) => a + u.lessons.length, 0);
              return (
                <tr key={s.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">{subjectEmoji(s.id)}</span>
                      <div>
                        <p className="font-bold text-navy-800">{s.name}</p>
                        <p className="text-[10px] text-slate-500">{s.nameEn}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3 nums text-slate-500">{s.code}</td>
                  <td className="py-3 px-3 nums" title="ما يقرّره الكتاب الرسمي">
                    <span className="font-bold text-emerald-700">
                      {s.unitsCount} و / {s.lessonsCount}
                    </span>
                    {s.gradeWarning && (
                      <span className="block text-[9px] text-amber-600 font-bold">
                        كتاب صف آخر
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 nums text-amber-700" title="ما ألّفناه نحن">
                    {s.units.length} و / {lessons}
                  </td>
                  <td className="py-3 px-3">
                    <StatusBadge status={CONTENT_STATUS} />
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => openSubject(s)} className="inline-flex items-center gap-1 text-xs font-bold text-navy-800 py-2 px-1"><Pencil className="w-3.5 h-3.5" /> تعديل</button>
                      <Link to={`/subjects/${s.id}`} className="inline-flex items-center gap-1 text-xs font-bold text-navy-800 py-2 px-1">تفاصيل <ArrowRight className="w-3.5 h-3.5" /></Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>
      {dialog && <EditDialog title={dialog.id ? 'تعديل بيانات المادة' : 'إضافة مادة'} fields={fields.filter((f) => !dialog.id || f.name !== 'id')} values={dialog.values} onChange={(name, value) => setDialog((d) => d ? { ...d, values: { ...d.values, [name]: value } } : d)} onClose={() => setDialog(null)} onSubmit={saveSubject} saving={saving} error={error} />}
    </div>
  );
};

/* ============================ تفاصيل مادة ============================ */

export const SubjectDetailPage: React.FC = () => {
  const { subjectId } = useParams<{ subjectId: string }>();
  const { subjects, loading, offline, reload } = useSubjects();
  const subject = (subjects ?? []).find((s) => s.id === subjectId);
  const [unitDialog, setUnitDialog] = useState<null | { id?: string; values: Record<string, string> }>(null);
  const [unitSaving, setUnitSaving] = useState(false);
  const [unitError, setUnitError] = useState('');
  const [editSubject, setEditSubject] = useState(false);
  const [editSubjectValues, setEditSubjectValues] = useState<Record<string, string>>({});
  const [subjectSaving, setSubjectSaving] = useState(false);
  const [subjectError, setSubjectError] = useState('');
  const openUnit = (u?: { id: string; title: string; description: string; unitNumber: number }) => {
    setUnitError(''); setUnitDialog(u ? { id: u.id, values: { title: u.title, description: u.description, unitNumber: String(u.unitNumber) } } : { values: { title: '', description: '', unitNumber: String((subject?.units.length ?? 0) + 1) } });
  };
  const saveUnit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); if (!unitDialog || !subjectId || unitSaving) return; setUnitSaving(true); setUnitError('');
    try { const d = { title: unitDialog.values.title, description: unitDialog.values.description, unitNumber: Number(unitDialog.values.unitNumber) }; if (unitDialog.id) await api.updateUnit(unitDialog.id, d); else await api.createUnit(subjectId, d); setUnitDialog(null); reload(); }
    catch (e2) { setUnitError(e2 instanceof Error ? e2.message : 'تعذّر الحفظ'); } finally { setUnitSaving(false); }
  };
  const openSubjectEdit = () => {
    if (!subject) return;
    setSubjectError('');
    setEditSubjectValues({ name: subject.name, nameEn: subject.nameEn, code: subject.code, category: subject.category, description: subject.description });
    setEditSubject(true);
  };
  const saveSubjectEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); if (!subject || subjectSaving) return; setSubjectSaving(true); setSubjectError('');
    try { await api.updateSubject(subject.id, editSubjectValues as Parameters<typeof api.updateSubject>[1]); setEditSubject(false); reload(); }
    catch (e2) { setSubjectError(e2 instanceof Error ? e2.message : 'تعذّر الحفظ'); } finally { setSubjectSaving(false); }
  };

  if (loading) return <LoadingState label="جارٍ تحميل تفاصيل المادة…" />;
  if (offline) {
    return (
      <div className="space-y-5">
        <NotConnectedNote>
          تعذّر الوصول إلى الخادم — لا يمكن عرض تفاصيل المادة. احفظ عنوان
          الخادم الصحيح من صفحة <strong>الإعدادات</strong>.
        </NotConnectedNote>
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="space-y-4">
        <Link
          to="/subjects"
          className="inline-flex items-center text-xs font-bold text-navy-800 hover:text-gold-600 py-2.5 min-h-[36px]"
        >
          ← الرجوع للمواد
        </Link>
        <ErrorState
          title="المادة غير موجودة"
          description={`لم يتم العثور على مادة بالمعرف «${subjectId}». تأكد من الرابط أو اختر مادة من القائمة.`}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Link to="/subjects" className="inline-flex items-center text-xs font-bold text-navy-800 hover:text-gold-600 py-2.5 min-h-[36px]">
        ← الرجوع للمواد
      </Link>

      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{subjectEmoji(subject.id)}</span>
          <div>
            <h1 className="text-xl font-black text-navy-800">{subject.name}</h1>
            <p className="text-xs text-slate-500 mt-0.5">{subject.description}</p>
            {subject.curriculumRef && (
              <p className="text-[10px] text-slate-400 mt-1 max-w-xl leading-relaxed">
                {subject.curriculumRef}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2"><Button onClick={() => openUnit()}><Layers className="w-3.5 h-3.5" /> إضافة وحدة</Button><Button variant="outline" onClick={openSubjectEdit}><Pencil className="w-3.5 h-3.5" /> تعديل المادة</Button></div>
      </header>

      <OfficialStructureCard subject={subject} />

      {subject.units.length === 0 ? (
        <Card>
          <EmptyState title="لا توجد وحدات بعد" description="أضف أول وحدة لهذه المادة." />
          <div className="px-4 pb-4"><Button onClick={() => openUnit()}><Layers className="w-4 h-4" /> إضافة وحدة</Button></div>
        </Card>
      ) : (
        <div className="space-y-4">
          {subject.units.map((unit) => (
            <Card
              key={unit.id}
              title={unit.title}
              subtitle={unit.description}
              action={<div className="flex items-center gap-2"><Badge tone="navy"><Layers className="w-3 h-3" /> {unit.lessons.length} دروس</Badge><button type="button" onClick={() => openUnit(unit)} className="text-[11px] font-bold text-navy-800 border border-slate-200 rounded-lg px-2 py-1"><Pencil className="w-3 h-3 inline" /> تعديل الوحدة</button></div>}
            >
              {unit.lessons.length === 0 ? (
                <EmptyState
                  title="لا توجد دروس في هذه الوحدة"
                  description="يمكنك إنشاء درس من صفحة إدارة المحتوى بعد إضافة الوحدة."
                />
              ) : (
                <Table head={['#', 'الدرس', 'المدة', 'الأهداف', 'المرفقات', 'الحالة']}>
                  {unit.lessons.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 nums text-slate-500">{l.lessonNumber}</td>
                      <td className="py-2.5 px-3">
                        <Link to={`/content/${encodeURIComponent(l.id)}`} className="font-bold text-navy-800 hover:text-gold-600 hover:underline">{l.title}</Link>
                        <p className="text-[10px] text-slate-500 line-clamp-1">{l.summary}</p>
                      </td>
                      <td className="py-2.5 px-3 nums">{l.durationMinutes} د</td>
                      <td className="py-2.5 px-3 nums">{l.learningObjectives.length}</td>
                      <td className="py-2.5 px-3 nums">{l.attachments.length}</td>
                      <td className="py-2.5 px-3">
                        <StatusBadge status={CONTENT_STATUS} />
                      </td>
                    </tr>
                  ))}
                </Table>
              )}
            </Card>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 text-[11px] text-slate-500"><BookOpen className="w-4 h-4 text-navy-800" /><span>نفس البيانات معروضة في تطبيق الطالب عبر الحزمة المشتركة.</span></div>
      {unitDialog && <EditDialog title={unitDialog.id ? 'تعديل الوحدة' : 'إضافة وحدة'} fields={[{ name: 'title', label: 'عنوان الوحدة', required: true }, { name: 'unitNumber', label: 'رقم الوحدة', type: 'number', required: true }, { name: 'description', label: 'الوصف', multiline: true }]} values={unitDialog.values} onChange={(name, value) => setUnitDialog((d) => d ? { ...d, values: { ...d.values, [name]: value } } : d)} onClose={() => setUnitDialog(null)} onSubmit={saveUnit} saving={unitSaving} error={unitError} />}
      {editSubject && subject && <EditDialog title="تعديل بيانات المادة" fields={[{ name: 'name', label: 'اسم المادة', required: true }, { name: 'nameEn', label: 'الاسم بالإنجليزية' }, { name: 'code', label: 'الرمز', required: true }, { name: 'category', label: 'التصنيف' }, { name: 'description', label: 'الوصف', multiline: true }]} values={editSubjectValues} onChange={(name, value) => setEditSubjectValues((v) => ({ ...v, [name]: value }))} onClose={() => setEditSubject(false)} onSubmit={saveSubjectEdit} saving={subjectSaving} error={subjectError} />}
    </div>
  );
};
