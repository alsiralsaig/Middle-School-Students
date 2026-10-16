import React, { useMemo } from 'react';
import { Star } from 'lucide-react';
import { Card, EmptyState, NotConnectedNote, StatusBadge, Table } from '../components/ui';
import { useSimulatedData } from '../hooks/useSimulatedData';
import { SAMPLE_RATING_STATS, allLessons, subjectEmoji, CONTENT_STATUS } from '@shared/curriculum';

/**
 * شاشة تقييمات المحتوى في لوحة الإدارة.
 *
 * تعرض الأرقام التجريبية الأساسية (من الحزمة المشتركة) مع تنبيه واضح بأن
 * تقييمات الطلاب الحقيقية محفوظة في أجهزتهم فقط حتى يتم ربط قاعدة البيانات.
 */
export const RatingsPage: React.FC = () => {
  const { data: lessons, loading } = useSimulatedData(allLessons());

  const rows = useMemo(() => {
    return (lessons ?? []).map((l) => {
      const stats = SAMPLE_RATING_STATS[l.id];
      return {
        id: l.id,
        title: l.title,
        subjectName: l.subjectName,
        emoji: subjectEmoji(l.subjectId),
        average: stats?.average ?? null,
        total: stats?.total ?? 0,
      };
    });
  }, [lessons]);

  const rated = rows.filter((r) => r.average !== null);
  const overall = rated.length
    ? Math.round((rated.reduce((a, r) => a + (r.average ?? 0), 0) / rated.length) * 10) / 10
    : null;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-black text-navy-800">تقييمات المحتوى</h1>
        <p className="text-xs text-slate-500 mt-1">
          متابعة جودة الشروحات — الطالب يقيّم الدرس ويترك ملاحظة من صفحة الدرس.
        </p>
      </header>

      <NotConnectedNote>
        الأرقام أدناه <strong>تجريبية للعرض</strong>. تقييمات الطلاب وملاحظاتهم الحقيقية محفوظة في
        أجهزتهم (localStorage) في هذه المرحلة، وستُجمع تلقائياً هنا بعد ربط قاعدة البيانات.
      </NotConnectedNote>

      {/* ملخص */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[11px] text-slate-500 font-bold">دروس مقیّمة</p>
          <p className="text-2xl font-black mt-1 text-navy-800 nums">{rated.length}</p>
          <p className="text-[10px] text-slate-400 mt-1">من {rows.length} درس</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[11px] text-slate-500 font-bold">المعدل العام</p>
          <p className="text-2xl font-black mt-1 text-navy-800 nums">
            {overall ? overall.toFixed(1) : '—'}
          </p>
          <div className="flex items-center gap-0.5 mt-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                className={`w-3 h-3 ${
                  overall && i <= Math.round(overall)
                    ? 'text-amber-500 fill-amber-400'
                    : 'text-slate-200'
                }`}
              />
            ))}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[11px] text-slate-500 font-bold">إجمالي التقييمات</p>
          <p className="text-2xl font-black mt-1 text-navy-800 nums">
            {rated.reduce((a, r) => a + r.total, 0)}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">أرقام تجريبية</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[11px] text-slate-500 font-bold">حالة المحتوى</p>
          <div className="mt-2">
            <StatusBadge status={CONTENT_STATUS} />
          </div>
        </div>
      </div>

      {/* الجدول */}
      <Card title="تقييمات الدروس" subtitle="المصدر: shared/curriculum.ts — SAMPLE_RATING_STATS">
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-10 rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            title="لا توجد دروس بعد"
            description="ستظهر تقييمات الدروس هنا بعد إضافة محتوى المنهج."
          />
        ) : (
          <Table head={['الدرس', 'المادة', 'المعدل', 'عدد التقييمات', 'الحالة']}>
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/70">
                <td className="py-2.5 px-3 font-bold text-navy-800">{r.title}</td>
                <td className="py-2.5 px-3 text-slate-600">
                  <span className="ml-1">{r.emoji}</span>
                  {r.subjectName}
                </td>
                <td className="py-2.5 px-3">
                  {r.average === null ? (
                    <span className="text-slate-400 text-[11px]">لا يوجد</span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                      <span className="nums font-bold">{r.average.toFixed(1)}</span>
                    </span>
                  )}
                </td>
                <td className="py-2.5 px-3 nums text-slate-500">{r.total}</td>
                <td className="py-2.5 px-3">
                  <StatusBadge status={CONTENT_STATUS} />
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <p className="text-[11px] text-slate-400 leading-relaxed">
        في المرحلة القادمة: تجميع ملاحظات الطلاب النصية، وترتيب الدروس حسب أقل تقييم لتحسين الشرح
        أولاً بأول.
      </p>
    </div>
  );
};
