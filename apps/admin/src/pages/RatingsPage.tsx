import React from 'react';
import { Star } from 'lucide-react';
import { Card, EmptyState, NotConnectedNote, Table } from '../components/ui';
import { subjectEmoji } from '@shared/curriculum';
import { getApiBase } from '../lib/serverUrl';

interface RatingRow {
  id: string;
  title: string;
  subjectId: string;
  subjectName: string;
  average: number;
  total: number;
  emoji: string;
}

interface RatingsSummary {
  total: number;
  average: number;
  lessonsRated: number;
}

/**
 * شاشة تقييمات المحتوى — تقرأ من جدول LessonRating في قاعدة البيانات.
 * كانت تعرض أرقاماً ثابتة مضمّنة؛ والآن كل درس مُقيَّم يظهر بمتوسطه الحقيقي.
 */
export const RatingsPage: React.FC = () => {
  const [rows, setRows] = React.useState<RatingRow[] | null>(null);
  const [summary, setSummary] = React.useState<RatingsSummary | null>(null);
  const [offline, setOffline] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${getApiBase()}/api/admin/ratings`, {
          headers: { Accept: 'application/json', 'X-App': 'admin' },
          credentials: 'include',
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as {
          ratings: RatingRow[];
          summary: RatingsSummary;
        };
        if (!alive) return;
        setRows(data.ratings);
        setSummary(data.summary);
        setOffline(false);
      } catch {
        if (alive) { setRows(null); setOffline(true); }
      }
    })();
    return () => { alive = false; };
  }, []);

  const loading = rows === null && !offline;
  const rated = rows ?? [];
  const overall = summary?.average ?? null;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-black text-navy-800">تقييمات المحتوى</h1>
        <p className="text-xs text-slate-500 mt-1">
          متابعة جودة الشروحات — الطالب يقيّم الدرس ويترك ملاحظة من صفحة الدرس.
        </p>
      </header>

      {offline && (
        <NotConnectedNote>
          تعذّر الوصول إلى الخادم. احفظ عنوان الخادم الصحيح من صفحة{' '}
          <strong>الإعدادات</strong>.
        </NotConnectedNote>
      )}

      {/* ملخص */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[11px] text-slate-500 font-bold">دروس مقیّمة</p>
          <p className="text-2xl font-black mt-1 text-navy-800 nums">{summary?.lessonsRated ?? '—'}</p>
          <p className="text-[10px] text-slate-400 mt-1">من قاعدة البيانات</p>
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
            {summary?.total ?? '—'}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">تقييمات فعلية</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[11px] text-slate-500 font-bold">أعلى تقييم</p>
          <p className="text-2xl font-black mt-1 text-navy-800 nums">
            {rated.length ? `${rated[0].average.toFixed(1)} ${rated[0].emoji}` : '—'}
          </p>
          <p className="text-[10px] text-slate-400 mt-1 truncate">
            {rated.length ? rated[0].title : 'لا تقييمات بعد'}
          </p>
        </div>
      </div>

      {/* الجدول */}
      <Card title="تقييمات الدروس" subtitle="من جدول التقييمات — مرتَّبة من الأعلى">
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-10 rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : (rows ?? []).length === 0 ? (
          <EmptyState
            title="لا توجد دروس بعد"
            description="ستظهر تقييمات الدروس هنا بعد إضافة محتوى المنهج."
          />
        ) : (
          <Table head={['الدرس', 'المادة', 'المعدل', 'عدد التقييمات', 'الحالة']}>
            {(rows ?? []).map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/70">
                <td className="py-2.5 px-3 font-bold text-navy-800">{r.title}</td>
                <td className="py-2.5 px-3 text-slate-600">
                  <span className="ml-1">{subjectEmoji(r.subjectId)}</span>
                  {r.subjectName}
                </td>
                <td className="py-2.5 px-3">
                  <span className="inline-flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                    <span className="nums font-bold">{r.average.toFixed(1)}</span>
                    <span className="text-xs">{r.emoji}</span>
                  </span>
                </td>
                <td className="py-2.5 px-3 nums text-slate-500">{r.total}</td>
                <td className="py-2.5 px-3">
                  <span
                    className={
                      r.average >= 4
                        ? 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700'
                        : r.average >= 3
                          ? 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700'
                          : 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700'
                    }
                  >
                    {r.average >= 4 ? 'ممتاز' : r.average >= 3 ? 'جيد' : 'يحتاج مراجعة'}
                  </span>
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
