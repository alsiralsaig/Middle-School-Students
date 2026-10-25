import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, FileText, Loader2, Paperclip, Plus, Search, SquarePen } from 'lucide-react';
import {
  Button,
  Card,
  EmptyState,
  LoadingState,
  NotConnectedNote,
  StatusBadge,
  Table,
} from '../components/ui';
import { api, type LessonRecord } from '../lib/contentApi';
import { uploadLessonAttachmentBlob } from '../lib/lessonBlobUpload';
import { useSubjects } from '../hooks/useSubjects';
import { CONTENT_STATUS } from '@shared/curriculum';
import { allLessons } from '@shared/contentData';

interface LessonRow {
  id: string;
  title: string;
  summary: string;
  subjectId: string;
  subjectName: string;
  unitTitle: string;
  durationMinutes: number;
  sections: unknown[];
  attachments: unknown[];
  status: string;
}

const SUBJECT_NAMES: Record<string, string> = {
  arabic: 'اللغة العربية',
  civics: 'التربية الوطنية',
  english: 'الإنجليزية',
  ict: 'تكنولوجيا المعلومات',
  islamic: 'التربية الإسلامية',
  math: 'الرياضيات',
  science: 'العلوم',
  social: 'الاجتماعيات',
};

export const ContentPage: React.FC = () => {
  const navigate = useNavigate();
  const { subjects } = useSubjects();
  const [newLesson, setNewLesson] = useState(false);
  const [subjectId, setSubjectId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newSummary, setNewSummary] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [newAttachment, setNewAttachment] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [createdLessonId, setCreatedLessonId] = useState('');
  const [createdBlobUrl, setCreatedBlobUrl] = useState('');
  const availableUnits = subjects?.find((s) => s.id === subjectId)?.units ?? [];
  const openNewLesson = () => { const first = subjects?.[0]; setSubjectId(first?.id ?? ''); setUnitId(first?.units[0]?.id ?? ''); setNewTitle(''); setNewSummary(''); setNewAttachment(null); setUploadProgress(0); setCreatedLessonId(''); setCreatedBlobUrl(''); setCreateError(''); setNewLesson(true); };
  const waitForLessonAttachment = async (lessonId: string, blobUrl: string): Promise<boolean> => {
    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        const lesson = await api.getLesson(lessonId) as LessonRecord & { attachments?: Array<{ filePath?: string; url?: string }> };
        if (Array.isArray(lesson.attachments) && lesson.attachments.some((item) => item.filePath === blobUrl || item.url === blobUrl)) return true;
      } catch { /* نعيد المحاولة؛ callback الخادمي قد يكون ما زال يحفظ السجل */ }
      await new Promise((resolve) => window.setTimeout(resolve, 500));
    }
    return false;
  };
  const openCreatedLesson = (id = createdLessonId) => {
    setNewLesson(false);
    navigate(`/content/${encodeURIComponent(id)}`);
  };
  const submitNewLesson = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (creating || createdLessonId) return;
    setCreating(true); setCreateError(''); setUploadProgress(0);
    let createdId = '';
    try {
      const lesson = await api.createLesson({ subjectId, unitId, title: newTitle.trim(), summary: newSummary.trim() });
      createdId = lesson.id;
      setCreatedLessonId(lesson.id);
      if (newAttachment) {
        try {
          const blob = await uploadLessonAttachmentBlob(lesson.id, newAttachment, setUploadProgress);
          setCreatedBlobUrl(blob.url);
          if (!await waitForLessonAttachment(lesson.id, blob.url)) {
            setCreateError('تم إنشاء الدرس ورفع الملف، لكن لم يصل تأكيد حفظ المرفق بعد. استخدم «تحقق من حفظ الملف» ولا ترفع نسخة أخرى الآن.');
            return;
          }
        } catch (uploadError) {
          setCreateError(`تم إنشاء الدرس، لكن تعذّر إكمال رفع المرفق: ${uploadError instanceof Error ? uploadError.message : 'خطأ غير معروف'}`);
          return;
        }
      }
      openCreatedLesson(lesson.id);
    } catch (e2) {
      if (createdId) {
        setCreatedLessonId(createdId);
        setCreateError(e2 instanceof Error ? e2.message : 'تم إنشاء الدرس لكن تعذّر تأكيد اكتمال العملية.');
      } else {
        setCreateError(e2 instanceof Error ? e2.message : 'تعذّر إنشاء الدرس');
      }
    } finally { setCreating(false); setUploadProgress(0); }
  };
  const retryOrVerifyAttachment = async () => {
    if (!createdLessonId || !newAttachment || creating) return;
    setCreating(true); setCreateError(''); setUploadProgress(0);
    try {
      let blobUrl = createdBlobUrl;
      if (blobUrl) {
        // الرفع وصل إلى Blob بالفعل؛ نتحقق من callback فقط لتجنب إنشاء نسخة مكررة.
        if (await waitForLessonAttachment(createdLessonId, blobUrl)) { openCreatedLesson(); return; }
        setCreateError('لم يتأكد حفظ المرفق بعد. افتح الدرس وتحقق من قائمة المرفقات قبل محاولة رفع الملف مرة أخرى.');
        return;
      }
      const blob = await uploadLessonAttachmentBlob(createdLessonId, newAttachment, setUploadProgress);
      blobUrl = blob.url;
      setCreatedBlobUrl(blobUrl);
      if (await waitForLessonAttachment(createdLessonId, blobUrl)) { openCreatedLesson(); return; }
      setCreateError('تم رفع الملف، لكن لم يصل تأكيد حفظ المرفق بعد. اضغط «تحقق من حفظ الملف» لاحقاً، ولا ترفع نسخة أخرى الآن.');
    } catch (error) {
      setCreateError(`الدرس محفوظ، لكن تعذّر رفع المرفق: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
    } finally { setCreating(false); setUploadProgress(0); }
  };

  /* الدروس من **قاعدة البيانات** — والملفات المضمّنة ملاذ أخير إن غاب الخادم */
  const [rows, setRows] = useState<LessonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [q, setQ] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const { lessons } = await api.listLessons();
        if (!alive) return;
        setRows(
          lessons.map((l) => ({
            id: l.id,
            title: l.title,
            summary: l.summary,
            subjectId: l.subjectId,
            subjectName: SUBJECT_NAMES[l.subjectId] ?? l.subjectId,
            unitTitle: l.unit?.title ?? '—',
            durationMinutes: l.durationMinutes,
            sections: [],
            attachments: [],
            status: l.status,
          }))
        );
        setOffline(false);
      } catch (e) {
        if (!alive) return;
        setOffline(api.isOffline(e));
        // لا خادم → نعرض الملفات المضمّنة للاستعراض فقط
        setRows(allLessons() as unknown as LessonRow[]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const list = rows;
    return list.filter((l) => {
      const term = q.trim();
      if (!term) return true;
      return (
        l.title.includes(term) ||
        l.summary.includes(term) ||
        l.subjectName.includes(term) ||
        l.unitTitle.includes(term)
      );
    });
  }, [rows, q]);

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-black text-navy-800">إدارة المحتوى</h1>
          <p className="text-xs text-slate-500 mt-1">
            كل الدروس في مكان واحد — للمراجعة والتحضير قبل اعتماد المحتوى الرسمي.
          </p>
        </div>
        <Button onClick={openNewLesson}><Plus className="w-4 h-4" /> درس جديد</Button>
      </header>

      <Card>
        {/* أدوات الفلترة */}
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث بعنوان الدرس…"
              className="w-full pr-9 pl-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-navy-800 focus:ring-2 focus:ring-navy-100 outline-none bg-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500">حالة كل المحتوى:</span>
            <StatusBadge status={CONTENT_STATUS} />
          </div>
        </div>

        {loading ? (
          <LoadingState label="جارٍ تحميل الدروس…" />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="لا نتائج مطابقة"
            description="لم نجد دروساً تطابق البحث أو الفلترة الحالية."
            hint="جرّب تعديل كلمة البحث أو اختيار «الكل»."
          />
        ) : (
          <>
            <Table head={['الدرس', 'المادة', 'الوحدة', 'المدة', 'أقسام', 'مرفقات', 'الحالة', '']}>
              {filtered.map((l) => (
                <tr key={`${l.subjectId}-${l.id}`} className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-3">
                    <Link to={`/content/${encodeURIComponent(l.id)}`} className="font-bold text-navy-800 hover:text-gold-600 hover:underline">{l.title}</Link>
                    <p className="text-[10px] text-slate-500 line-clamp-1">{l.summary}</p>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">{l.subjectName}</td>
                  <td className="py-2.5 px-3 text-slate-600">{l.unitTitle}</td>
                  <td className="py-2.5 px-3 nums">{l.durationMinutes} د</td>
                  <td className="py-2.5 px-3 nums">{l.sections.length}</td>
                  <td className="py-2.5 px-3">
                    <span className="inline-flex items-center gap-1 nums text-slate-500">
                      <Paperclip className="w-3 h-3" />
                      {l.attachments.length}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <StatusBadge status={l.status as never} />
                  </td>
                  <td className="py-2.5 px-3 text-left">
                    <Link
                      to={`/content/${encodeURIComponent(l.id)}/edit`}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-navy-800 hover:text-gold-600"
                    >
                      <SquarePen className="w-3.5 h-3.5" />
                      تحرير
                    </Link>
                  </td>
                </tr>
              ))}
            </Table>
            <p className="text-[10px] text-slate-400 mt-3">
              عدد النتائج: <span className="nums">{filtered.length}</span> من{' '}
              <span className="nums">{rows.length}</span>
            </p>
          </>
        )}
      </Card>

      {offline ? (
        <NotConnectedNote>
          لا يمكن الوصول إلى الخادم، فتُعرض الملفات المضمّنة <strong>للاستعراض فقط</strong>.
          شغّل الخادم لتحرير المحتوى وحفظه في قاعدة البيانات.
        </NotConnectedNote>
      ) : (
        <p className="text-[10px] text-slate-400 leading-relaxed px-1">
          هذه الدروس مقروءة من <strong>قاعدة البيانات</strong> — أي تعديل تحفظه يراه الطلاب فور تحميلهم المنهج.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Link
          to="/subjects"
          className="inline-flex items-center gap-1.5 text-xs font-extrabold border border-navy-200 text-navy-800 px-4 py-2.5 rounded-xl hover:bg-navy-50"
        >
          <BookOpen className="w-4 h-4" />
          عرض حسب المادة
        </Link>
      </div>
      {newLesson && <div className="fixed inset-0 z-[100] bg-slate-950/50 p-4 grid place-items-center" dir="rtl">
        <form onSubmit={submitNewLesson} className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl bg-white shadow-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between"><h2 className="font-black text-navy-800">إنشاء درس جديد</h2><button type="button" disabled={creating} onClick={() => setNewLesson(false)} className="text-slate-500 px-2 py-1 disabled:opacity-50">إغلاق</button></div>
          {createdLessonId ? <>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs leading-6 text-emerald-800">
              تم إنشاء الدرس. {newAttachment ? 'نعالج الآن مرفقه.' : 'يمكنك فتحه وإضافة مرفقات من صفحة تفاصيل الدرس.'}
            </div>
            {newAttachment && <div className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-xs text-slate-600"><FileText className="h-4 w-4 shrink-0 text-navy-700" /><span className="min-w-0 truncate">{newAttachment.name}</span><span className="shrink-0 text-slate-400">{(newAttachment.size / (1024 * 1024)).toFixed(1)} MB</span></div>}
            {createError && <p role="alert" className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700">{createError}</p>}
            <div className="flex flex-wrap justify-end gap-2">
              {newAttachment && <button type="button" onClick={() => void retryOrVerifyAttachment()} disabled={creating} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-navy-800 text-white text-xs font-bold disabled:opacity-50">
                {creating ? <><Loader2 className="h-4 w-4 animate-spin" /> {createdBlobUrl ? 'جارٍ التحقق…' : `جارٍ الرفع ${Math.round(uploadProgress)}٪…`}</> : createdBlobUrl ? 'تحقق من حفظ الملف' : 'إعادة محاولة رفع الملف'}
              </button>}
              <button type="button" onClick={() => openCreatedLesson()} className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold">فتح الدرس</button>
            </div>
          </> : <>
            <label className="block text-xs font-bold text-slate-600">المادة<select required value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setUnitId(subjects?.find((s) => s.id === e.target.value)?.units[0]?.id ?? ''); }} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white"><option value="">اختر المادة</option>{subjects?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
            <label className="block text-xs font-bold text-slate-600">الوحدة<select required value={unitId} onChange={(e) => setUnitId(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white"><option value="">اختر الوحدة</option>{availableUnits.map((u) => <option key={u.id} value={u.id}>{u.title}</option>)}</select></label>
            <label className="block text-xs font-bold text-slate-600">عنوان الدرس<input required minLength={2} value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" /></label>
            <label className="block text-xs font-bold text-slate-600">ملخص اختياري<textarea rows={3} value={newSummary} onChange={(e) => setNewSummary(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" /></label>
            <label className="block text-xs font-bold text-slate-600">ملف مرفق اختياري
              <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.webp" disabled={creating} onChange={(e) => { const selected = e.target.files?.[0] ?? null; if (selected && selected.size > 60 * 1024 * 1024) { setNewAttachment(null); setCreateError('حجم الملف أكبر من ٦٠ ميغابايت'); e.target.value = ''; } else { setNewAttachment(selected); setCreateError(''); } }} className="mt-1 block w-full rounded-xl border border-slate-300 p-2 text-xs file:ml-2 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2" />
              <span className="mt-1 block text-[10px] font-normal text-slate-400">PDF وWord وExcel وPowerPoint وTXT وCSV والصور؛ حتى ٦٠ ميغابايت.</span>
            </label>
            {newAttachment && <div className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-xs text-slate-600"><FileText className="h-4 w-4 shrink-0 text-navy-700" /><span className="min-w-0 truncate">{newAttachment.name}</span><span className="shrink-0 text-slate-400">{(newAttachment.size / (1024 * 1024)).toFixed(1)} MB</span></div>}
            {createError && <p role="alert" className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700">{createError}</p>}
            <div className="flex justify-end gap-2"><button type="button" disabled={creating} onClick={() => setNewLesson(false)} className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold disabled:opacity-50">إلغاء</button><button type="submit" disabled={creating || !subjectId || !unitId} className="px-4 py-2 rounded-xl bg-navy-800 text-white text-xs font-bold disabled:opacity-50">{creating ? newAttachment ? `جارٍ الإنشاء والرفع ${Math.round(uploadProgress)}٪…` : 'جارٍ الإنشاء…' : newAttachment ? 'إنشاء الدرس ورفع الملف' : 'إنشاء وفتح المحرر'}</button></div>
          </>}
        </form>
      </div>}
    </div>
  );
};
