import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Loader2, Save, WifiOff } from 'lucide-react';
import { Badge, Card, ErrorState, LoadingState } from '../components/ui';
import { api } from '../lib/contentApi';

interface Section {
  heading: string;
  body: string;
}
interface Faq {
  q: string;
  a: string;
}
interface Lesson {
  id: string;
  title: string;
  summary: string;
  status: string;
  lessonNumber: number;
  durationMinutes: number;
  subjectId: string;
  unitId: string;
  learningObjectives: string[];
  sections: Section[];
  keyRules: string[];
  examTips: string[];
  faq: Faq[];
}

/**
 * محرّر الدرس — أول شاشة في اللوحة تكتب فعلاً في قاعدة البيانات.
 *
 * كل ما سبق كان يعرض بيانات تجريبية لا تُحفظ. هذه الشاشة تحفظ
 * عبر `PUT /api/admin/lessons/:id`، فتظهر تعديلاتها للطلاب فوراً.
 */
const LessonEditorPage: React.FC = () => {
  const { lessonId = '' } = useParams();
  const navigate = useNavigate();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLesson(null);
    try {
      setLesson(await api.getLesson(lessonId));
      setOffline(false);
      setError('');
    } catch (e) {
      setOffline(api.isOffline(e));
      setError(e instanceof Error ? e.message : 'تعذّر تحميل الدرس');
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lesson || saving) return;
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const updated = await api.saveLesson(lesson.id, {
        title: lesson.title,
        summary: lesson.summary,
        durationMinutes: lesson.durationMinutes,
        learningObjectives: lesson.learningObjectives,
        sections: lesson.sections,
        keyRules: lesson.keyRules,
        examTips: lesson.examTips,
        faq: lesson.faq,
        status: lesson.status,
      });
      setLesson(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2600);
    } catch (e2) {
      setOffline(api.isOffline(e2));
      setError(e2 instanceof Error ? e2.message : 'تعذّر الحفظ');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="space-y-3" dir="rtl"><button onClick={() => navigate(`/content/${encodeURIComponent(lessonId)}`)} className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-navy-800"><ArrowRight className="w-3.5 h-3.5" /> رجوع إلى عرض الدرس</button><LoadingState label="جارٍ تحميل الدرس…" /></div>;
  if (!lesson) {
    return (
      <div className="p-4">
        <ErrorState title="تعذّر تحميل الدرس" description={error || 'الدرس غير موجود'} />
        <button
          onClick={() => navigate(`/content/${encodeURIComponent(lessonId)}`)}
          className="mt-3 text-xs font-bold text-navy-800 border border-slate-300 rounded-xl px-3 py-2"
        >
          رجوع
        </button>
      </div>
    );
  }

  const setField = <K extends keyof Lesson>(key: K, value: Lesson[K]) =>
    setLesson((l) => (l ? { ...l, [key]: value } : l));

  const setList = (key: 'learningObjectives' | 'keyRules' | 'examTips', v: string) =>
    setField(key, v.split('\n') as never);

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <button
            onClick={() => navigate(`/content/${encodeURIComponent(lessonId)}`)}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-navy-800 mb-1"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            رجوع إلى عرض الدرس
          </button>
          <h1 className="text-lg font-black text-navy-800">تحرير الدرس</h1>
          <p className="text-[11px] text-slate-500 mt-0.5 nums">
            الدرس {lesson.lessonNumber} · {lesson.durationMinutes} دقيقة · الكود{' '}
            <span className="font-mono">{lesson.id}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saved && <Badge tone="green">✓ حُفظ</Badge>}
          <Badge tone={lesson.status === 'verified' ? 'green' : 'amber'}>
            {lesson.status === 'verified' ? 'معتمد' : 'تجريبي'}
          </Badge>
        </div>
      </div>

      {offline && (
        <p className="flex items-center gap-2 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          <WifiOff className="w-3.5 h-3.5 shrink-0" />
          لا يمكن الوصول إلى الخادم — لن يُحفظ شيء الآن
        </p>
      )}
      {error && !offline && (
        <p className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      <form onSubmit={save} className="space-y-4">
        <Card title="الأساسيّات">
          <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="md:col-span-2 block">
              <span className="text-[11px] font-bold text-slate-600">عنوان الدرس</span>
              <input
                value={lesson.title}
                onChange={(e) => setField('title', e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-navy-800 focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-bold text-slate-600">المدة (دقيقة)</span>
              <input
                type="number"
                min={5}
                max={180}
                value={lesson.durationMinutes}
                onChange={(e) => setField('durationMinutes', Number(e.target.value) || 30)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm nums focus:border-navy-800 focus:outline-none"
              />
            </label>
            <label className="md:col-span-3 block">
              <span className="text-[11px] font-bold text-slate-600">الملخّص</span>
              <textarea
                rows={3}
                value={lesson.summary}
                onChange={(e) => setField('summary', e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm leading-relaxed focus:border-navy-800 focus:outline-none"
              />
            </label>
          </div>
        </Card>

        <Card
          title="أقسام الشرح"
          subtitle="النص الذي يقرأه الطالب — أضف قسماً لكل فكرة"
          action={
            <button
              type="button"
              onClick={() =>
                setField('sections', [
                  ...lesson.sections,
                  { heading: 'عنوان جديد', body: '' },
                ])
              }
              className="text-[11px] font-bold text-navy-800 border border-slate-300 rounded-lg px-2.5 py-1 hover:bg-slate-50"
            >
              + قسم
            </button>
          }
        >
          <div className="p-4 space-y-3">
            {lesson.sections.length === 0 && (
              <p className="text-[11px] text-slate-400">لا أقسام بعد — أضف أول قسم</p>
            )}
            {lesson.sections.map((s, i) => (
              <div key={i} className="rounded-xl border border-slate-200 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    value={s.heading}
                    onChange={(e) =>
                      setField(
                        'sections',
                        lesson.sections.map((x, j) =>
                          j === i ? { ...x, heading: e.target.value } : x
                        )
                      )
                    }
                    placeholder="عنوان القسم"
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-bold focus:border-navy-800 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setField(
                        'sections',
                        lesson.sections.filter((_, j) => j !== i)
                      )
                    }
                    className="text-rose-500 hover:bg-rose-50 px-2 py-1 rounded-lg text-xs font-bold"
                  >
                    حذف
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={s.body}
                  onChange={(e) =>
                    setField(
                      'sections',
                      lesson.sections.map((x, j) =>
                        j === i ? { ...x, body: e.target.value } : x
                      )
                    )
                  }
                  placeholder="نص الشرح…"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm leading-relaxed focus:border-navy-800 focus:outline-none"
                />
              </div>
            ))}
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card title="الأهداف" subtitle="سطر لكل هدف">
            <div className="p-4">
              <textarea
                rows={6}
                value={lesson.learningObjectives.join('\n')}
                onChange={(e) => setList('learningObjectives', e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm leading-relaxed focus:border-navy-800 focus:outline-none"
              />
            </div>
          </Card>
          <Card title="القواعد الأساسية" subtitle="سطر لكل قاعدة">
            <div className="p-4">
              <textarea
                rows={6}
                value={lesson.keyRules.join('\n')}
                onChange={(e) => setList('keyRules', e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm leading-relaxed focus:border-navy-800 focus:outline-none"
              />
            </div>
          </Card>
          <Card title="نصائح للامتحان" subtitle="سطر لكل نصيحة">
            <div className="p-4">
              <textarea
                rows={5}
                value={lesson.examTips.join('\n')}
                onChange={(e) => setList('examTips', e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm leading-relaxed focus:border-navy-800 focus:outline-none"
              />
            </div>
          </Card>
          <Card title="الحالة">
            <div className="p-4 space-y-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="status"
                  checked={lesson.status === 'sample'}
                  onChange={() => setField('status', 'sample')}
                />
                <span>
                  <strong className="text-amber-700">تجريبي</strong>
                  <span className="block text-[10px] text-slate-500">
                    لم تُراجَع بعد — الوضع الآمن
                  </span>
                </span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="status"
                  checked={lesson.status === 'verified'}
                  onChange={() => setField('status', 'verified')}
                />
                <span>
                  <strong className="text-emerald-700">معتمد</strong>
                  <span className="block text-[10px] text-slate-500">
                    بعد مراجعتك — لا تُعلّمه إلا بعد التأكد
                  </span>
                </span>
              </label>
            </div>
          </Card>
        </div>

        <div className="flex items-center gap-3 pb-6">
          <button
            type="submit"
            disabled={saving || offline}
            className="inline-flex items-center gap-2 bg-navy-800 text-white font-extrabold text-sm px-5 py-3 rounded-xl hover:bg-navy-700 disabled:opacity-60 cursor-pointer"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'جارٍ الحفظ…' : 'حفظ في قاعدة البيانات'}
          </button>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            الحفظ يذهب إلى قاعدة البيانات مباشرة، ويراه الطلاب فور تحميلهم المنهج.
          </p>
        </div>
      </form>
    </div>
  );
};

export default LessonEditorPage;
