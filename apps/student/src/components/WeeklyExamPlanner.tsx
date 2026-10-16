import React, { useEffect, useMemo, useState } from 'react';
import { CalendarPlus, Clock3, GraduationCap, Repeat, Trash2 } from 'lucide-react';
import { SUBJECTS_DATA } from '../data/curriculumData';
import { PlannerEvent, addEvents, getAllEvents, removeGroup, subscribePlanner } from '../utils/plannerStore';
import { showToast } from '../utils/toastBus';
import { relativeArabic } from '../utils/toastBus';

const DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

const pad = (n: number) => String(n).padStart(2, '0');
const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** أول تاريخ قادم ليوم الأسبوع المطلوب (بدءاً من الغد) */
function nextWeekday(weekday: number, from = new Date()): Date {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  d.setDate(d.getDate() + 1);
  while (d.getDay() !== weekday) d.setDate(d.getDate() + 1);
  return d;
}

/**
 * مجدول الاختبارات التجريبية الأسبوعية — داخل لوحة تحكم الطالب.
 *
 * يختار الطالب المادة + يوم الأسبوع + الوقت + عدد الأسابيع،
 * فتُضاف المواعيد إلى التقويم الدراسي، ويبدأ محرّك التنبيهات
 * بإرسال Toast + إشعار قبل كل موعد بـ ٢٤ ساعة.
 *
 * ملاحظة: البيانات تجريبية للعرض (المرحلة الأولى) — لا يوجد خادم أو حفظ سحابي،
 * والمواعيد تُحفظ محلياً في متصفح الطالب فقط.
 */
export const WeeklyExamPlanner: React.FC = () => {
  const [subjectId, setSubjectId] = useState(SUBJECTS_DATA[0]?.id ?? 'math');
  const [weekday, setWeekday] = useState<number>(new Date().getDay());
  const [time, setTime] = useState('19:00');
  const [weeks, setWeeks] = useState(4);
  const [events, setEvents] = useState<PlannerEvent[]>(getAllEvents);

  useEffect(() => subscribePlanner(() => setEvents(getAllEvents())), []);

  const scheduled = useMemo(
    () => events.filter((e) => e.type === 'trial_exam' && e.status === 'user'),
    [events],
  );

  const groups = useMemo(() => {
    const map = new Map<string, PlannerEvent[]>();
    scheduled.forEach((e) => {
      const gid = e.recurring?.groupId ?? e.id;
      map.set(gid, [...(map.get(gid) ?? []), e]);
    });
    return [...map.entries()].sort((a, b) => a[1][0].date.localeCompare(b[1][0].date));
  }, [scheduled]);

  const handleSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = SUBJECTS_DATA.find((s) => s.id === subjectId);
    if (!subject) return;

    const groupId = `trial-${Date.now()}`;
    const start = nextWeekday(weekday);
    const list: PlannerEvent[] = [];

    for (let i = 0; i < weeks; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i * 7);
      list.push({
        id: `${groupId}-${i}`,
        title: `اختبار تجريبي — ${subject.name}`,
        titleEn: `Trial exam — ${subject.nameEn}`,
        type: 'trial_exam',
        date: toISO(d),
        time,
        subjectName: subject.name,
        description: `اختبار تجريبي أسبوعي جدوله الطالب بنفسه (${weeks} أسابيع). المحتوى تجريبي للمرحلة الأولى وليس امتحاناً رسمياً.`,
        link: undefined,
        status: 'user',
        recurring: { weekday, time, groupId },
      });
    }

    addEvents(list);
    showToast({
      title: 'تم جدولة الاختبارات التجريبية',
      message: `${weeks} مواعيد لمادة ${subject.name} — كل ${DAYS[weekday]} الساعة ${time}، وستصلك تذكيرات قبلها.`,
      tone: 'success',
    });
  };

  return (
    <section className="bg-white dark:bg-[#0D1F35] rounded-3xl border border-slate-200 dark:border-[#1C3A62] p-5 sm:p-6 text-right shadow-sm space-y-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 grid place-items-center shrink-0">
          <GraduationCap className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            جدولة اختبارات تجريبية أسبوعية
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
            اختَر المادة واليوم والوقت، وسنضيف المواعيد إلى تقويمك الدراسي مع تذكير قبل كل موعد
            بـ ٢٤ ساعة. المواعيد تجريبية ومحفوظة في جهازك فقط.
          </p>
        </div>
      </div>

      <form onSubmit={handleSchedule} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 space-y-1">
          المادة
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="w-full mt-1 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-[#24406B] bg-white dark:bg-[#0A1B30] text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none"
          >
            {SUBJECTS_DATA.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 space-y-1">
          اليوم
          <select
            value={weekday}
            onChange={(e) => setWeekday(Number(e.target.value))}
            className="w-full mt-1 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-[#24406B] bg-white dark:bg-[#0A1B30] text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none"
          >
            {DAYS.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </select>
        </label>

        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 space-y-1">
          الوقت
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full mt-1 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-[#24406B] bg-white dark:bg-[#0A1B30] text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none"
          />
        </label>

        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 space-y-1">
          عدد الأسابيع
          <select
            value={weeks}
            onChange={(e) => setWeeks(Number(e.target.value))}
            className="w-full mt-1 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-[#24406B] bg-white dark:bg-[#0A1B30] text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none"
          >
            {[2, 4, 6, 8].map((w) => (
              <option key={w} value={w}>
                {w} أسابيع
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          className="col-span-2 sm:col-span-4 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold transition-colors"
        >
          <CalendarPlus className="w-4 h-4" />
          أضف المواعيد إلى تقويمي
        </button>
      </form>

      {/* المواعيد المجدولة */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            <Repeat className="w-3.5 h-3.5 text-amber-500" />
            اختباراتي المجدولة ({scheduled.length})
          </h4>
        </div>

        {groups.length === 0 ? (
          <p className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-[#0A1B30] border border-slate-200 dark:border-[#1C3A62] rounded-xl p-3 leading-relaxed">
            لا توجد اختبارات تجريبية مجدولة بعد. استخدم النموذج أعلاه لإضافة مواعيد أسبوعية.
          </p>
        ) : (
          <ul className="space-y-2">
            {groups.map(([groupId, list]) => {
              const first = list[0];
              const nextDate = new Date(`${first.date}T${first.time}:00`);
              const diff = nextDate.getTime() - Date.now();
              return (
                <li
                  key={groupId}
                  className="flex items-center justify-between gap-3 bg-slate-50 dark:bg-[#0A1B30] border border-slate-200 dark:border-[#1C3A62] rounded-xl p-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                      {first.subjectName}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1 flex-wrap">
                      <Clock3 className="w-3 h-3" />
                      {DAYS[first.recurring?.weekday ?? 0]} · {first.time} · {list.length} مواعيد
                      {diff > 0 && (
                        <span className="text-amber-600 dark:text-amber-400 font-bold">
                          · القادم {relativeArabic(diff)}
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      removeGroup(groupId);
                      showToast({ title: 'تم حذف المواعيد', tone: 'info' });
                    }}
                    aria-label={`حذف مواعيد ${first.subjectName}`}
                    className="p-2 rounded-lg text-rose-500 hover:bg-rose-500/10 border border-rose-500/30 transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
};
