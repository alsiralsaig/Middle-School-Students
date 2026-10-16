import React, { useEffect, useMemo, useState } from 'react';
import { Clock3, Flame, Star, Target, Timer } from 'lucide-react';
import { SESSION_MINUTES, focusStats, getFocusLog } from '../utils/focusStore';
import { getAllFeedback, subscribeFeedback } from '../utils/ratingStore';
import { allLessons } from '@shared/curriculum';

const FOCUS_EVENT = 'ssp:focus-changed';

/**
 * بطاقات «رؤى مذاكرتي» في لوحة تحكم الطالب:
 *  - إحصائيات التركيز (جلسات البومودورو + رسم ٧ أيام)
 *  - تقييماتي وملاحظاتي على الدروس
 *
 * كلها محلية (localStorage) وتُحدَّث لحظياً عند إضافة جلسة أو تقييم.
 */
export const StudyInsights: React.FC = () => {
  const [log, setLog] = useState(getFocusLog);
  const [feedback, setFeedback] = useState(() => getAllFeedback());

  useEffect(() => {
    const reload = () => setLog(getFocusLog());
    window.addEventListener(FOCUS_EVENT, reload);
    window.addEventListener('storage', reload);
    const unsub = subscribeFeedback(() => setFeedback(getAllFeedback()));
    return () => {
      window.removeEventListener(FOCUS_EVENT, reload);
      window.removeEventListener('storage', reload);
      unsub();
    };
  }, []);

  const stats = useMemo(() => focusStats(log), [log]);
  const lessonIndex = useMemo(() => {
    const map = new Map<string, { title: string; subjectName: string }>();
    allLessons().forEach((l) => map.set(l.id, { title: l.title, subjectName: l.subjectName }));
    return map;
  }, []);

  const ratings = useMemo(
    () =>
      Object.values(feedback)
        .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
        .slice(0, 4)
        .map((f) => ({
          ...f,
          lessonTitle: lessonIndex.get(f.lessonId)?.title ?? f.lessonId,
          subjectName: lessonIndex.get(f.lessonId)?.subjectName ?? '',
        })),
    [feedback, lessonIndex],
  );

  const maxDay = Math.max(1, ...stats.last7.map((d) => d.sessions));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* ============ إحصائيات التركيز ============ */}
      <section className="bg-white dark:bg-[#0D1F35] rounded-3xl border border-slate-200 dark:border-[#1C3A62] p-5 sm:p-6 shadow-sm text-right space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#002368]/10 text-[#002368] dark:text-amber-400 grid place-items-center shrink-0">
            <Timer className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              إحصائيات التركيز
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              جلسات بومودورو المكتملة ({SESSION_MINUTES} دقيقة لكل جلسة)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'اليوم', value: stats.today, icon: Target },
            { label: '٧ أيام', value: stats.week, icon: Clock3 },
            { label: 'المجموع', value: stats.total, icon: Timer },
            { label: 'دقيقة', value: stats.totalMinutes, icon: Flame },
          ].map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="bg-slate-50 dark:bg-[#0A1B30] border border-slate-200 dark:border-[#1C3A62] rounded-xl p-2.5 text-center"
            >
              <Icon className="w-3.5 h-3.5 mx-auto text-amber-500 mb-1" />
              <p className="text-base font-black text-slate-900 dark:text-white nums">{value}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">{label}</p>
            </div>
          ))}
        </div>

        {/* رسم ٧ أيام */}
        <div>
          <div className="flex items-end justify-between gap-1.5 h-20">
            {stats.last7.map((d) => (
              <div key={d.key} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex-1 flex items-end">
                  <div
                    className={`w-full rounded-t-md transition-all ${
                      d.sessions > 0 ? 'bg-[#002368] dark:bg-amber-400' : 'bg-slate-200 dark:bg-[#1C3A62]'
                    }`}
                    style={{ height: `${Math.max(8, (d.sessions / maxDay) * 100)}%` }}
                    title={`${d.sessions} جلسة`}
                  />
                </div>
                <span className="text-[9px] text-slate-400">{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        {stats.today === 0 ? (
          <p className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-[#0A1B30] border border-slate-200 dark:border-[#1C3A62] rounded-xl p-3 leading-relaxed">
            ما أتممت أي جلسة تركيز اليوم. افتح درساً واضغط «وضع التركيز» لتبدأ جلسة{' '}
            {SESSION_MINUTES} دقيقة بلا مشتتات.
          </p>
        ) : (
          <p className="text-[11px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-700/50 rounded-xl p-3 leading-relaxed">
            أحسنت! {stats.today} {stats.today === 1 ? 'جلسة' : 'جلسات'} اليوم
            {stats.streak > 1 ? ` وسلسلة ${stats.streak} أيام متتالية 🔥` : ''}.
          </p>
        )}
      </section>

      {/* ============ تقييماتي وملاحظاتي ============ */}
      <section className="bg-white dark:bg-[#0D1F35] rounded-3xl border border-slate-200 dark:border-[#1C3A62] p-5 sm:p-6 shadow-sm text-right space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 grid place-items-center shrink-0">
            <Star className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              تقييماتي وملاحظاتي
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              الدروس التي قيّمتها لمساعدتنا على تحسين الشرح
            </p>
          </div>
        </div>

        {ratings.length === 0 ? (
          <p className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-[#0A1B30] border border-slate-200 dark:border-[#1C3A62] rounded-xl p-3 leading-relaxed">
            لم تُقيّم أي درس بعد. افتح درساً واختر النجوم، واترك ملاحظة تساعدنا على تحسين الشرح.
          </p>
        ) : (
          <ul className="space-y-2">
            {ratings.map((f) => (
              <li
                key={f.lessonId}
                className="bg-slate-50 dark:bg-[#0A1B30] border border-slate-200 dark:border-[#1C3A62] rounded-xl p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                    {f.lessonTitle}
                  </p>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        className={`w-3 h-3 ${
                          i <= f.rating
                            ? 'text-amber-500 fill-amber-400'
                            : 'text-slate-200 dark:text-slate-600'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                {f.subjectName && (
                  <p className="text-[10px] text-slate-400 mt-0.5">{f.subjectName}</p>
                )}
                {f.comment && (
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed line-clamp-2">
                    «{f.comment}»
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}

        <p className="text-[10px] text-slate-400 leading-relaxed">
          محفوظة في جهازك في هذه المرحلة — ستُرسل تلقائياً لتحسين المحتوى عند ربط قاعدة البيانات.
        </p>
      </section>
    </div>
  );
};
