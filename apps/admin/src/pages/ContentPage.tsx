import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Paperclip, Plus, Search } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  LoadingState,
  NotConnectedNote,
  StatusBadge,
  Table,
} from '../components/ui';
import { useSimulatedData } from '../hooks/useSimulatedData';
import { allLessons } from '@shared/sampleContent';

export const ContentPage: React.FC = () => {
  const { data: lessons, loading } = useSimulatedData(allLessons());
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'all' | 'sample' | 'verified'>('all');

  const filtered = useMemo(() => {
    const list = lessons ?? [];
    return list.filter((l) => {
      const matchQ = !q.trim() || l.title.includes(q.trim()) || l.summary.includes(q.trim());
      const matchS = status === 'all' || l.status === status;
      return matchQ && matchS;
    });
  }, [lessons, q, status]);

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-black text-navy-800">إدارة المحتوى</h1>
          <p className="text-xs text-slate-500 mt-1">
            كل الدروس في مكان واحد — للمراجعة والتحضير قبل اعتماد المحتوى الرسمي.
          </p>
        </div>
        <Button disabled title="الحفظ يتطلب قاعدة بيانات (المرحلة القادمة)">
          <Plus className="w-4 h-4" />
          درس جديد
        </Button>
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
          <div className="flex gap-2">
            {(['all', 'sample', 'verified'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`px-3 py-2 rounded-xl text-[11px] font-bold border transition-colors ${
                  status === s
                    ? 'bg-navy-800 text-white border-navy-800'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {s === 'all' ? 'الكل' : s === 'sample' ? 'تجريبي' : 'معتمد'}
              </button>
            ))}
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
            <Table head={['الدرس', 'المادة', 'الوحدة', 'المدة', 'أقسام', 'مرفقات', 'الحالة']}>
              {filtered.map((l) => (
                <tr key={`${l.subjectId}-${l.id}`} className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-3">
                    <p className="font-bold text-navy-800">{l.title}</p>
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
                    <StatusBadge status={l.status} />
                  </td>
                </tr>
              ))}
            </Table>
            <p className="text-[10px] text-slate-400 mt-3">
              عدد النتائج: <span className="nums">{filtered.length}</span> من{' '}
              <span className="nums">{(lessons ?? []).length}</span>
            </p>
          </>
        )}
      </Card>

      <NotConnectedNote>
        الحفظ والتحرير والنشر <strong>غير مُفعّلة</strong> في هذه المرحلة (لا قاعدة بيانات). الواجهة
        معدة لاستقبالها لاحقاً دون تغيير التصميم.
      </NotConnectedNote>

      <div className="flex flex-wrap gap-2">
        <Link
          to="/subjects"
          className="inline-flex items-center gap-1.5 text-xs font-extrabold border border-navy-200 text-navy-800 px-4 py-2.5 rounded-xl hover:bg-navy-50"
        >
          <BookOpen className="w-4 h-4" />
          عرض حسب المادة
        </Link>
        <Badge tone="gold">المرحلة الأولى — واجهة فقط</Badge>
      </div>
    </div>
  );
};
