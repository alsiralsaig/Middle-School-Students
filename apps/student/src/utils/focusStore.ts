/**
 * مخزن جلسات التركيز (Focus Sessions)
 *
 * يسجّل عدد جلسات البومودورو المكتملة لكل يوم،
 * لعرضها في لوحة تحكم الطالب (إحصائيات التركيز).
 * محفوظ محلياً حتى يتوفر حساب وقاعدة بيانات في المرحلة القادمة.
 */

const LOG_KEY = 'ssp_focus_log_v1';
const LEGACY_KEY = 'ssp_focus_sessions_v1';
export const SESSION_MINUTES = 25;

const pad = (n: number) => String(n).padStart(2, '0');
export const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export type FocusLog = Record<string, number>;

export function getFocusLog(): FocusLog {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    if (raw) return JSON.parse(raw) as FocusLog;
    // ترحيل العدّاد القديم إن وُجد
    const legacy = Number(localStorage.getItem(LEGACY_KEY) || 0);
    if (legacy > 0) {
      const migrated: FocusLog = { [dayKey(new Date())]: legacy };
      localStorage.setItem(LOG_KEY, JSON.stringify(migrated));
      return migrated;
    }
  } catch {
    /* تجاهل */
  }
  return {};
}

export function addFocusSession(date = new Date()): FocusLog {
  try {
    const log = getFocusLog();
    const key = dayKey(date);
    log[key] = (log[key] ?? 0) + 1;
    localStorage.setItem(LOG_KEY, JSON.stringify(log));
    localStorage.setItem(LEGACY_KEY, String(Object.values(log).reduce((a, b) => a + b, 0)));
    return log;
  } catch {
    return getFocusLog();
  }
}

export interface FocusStats {
  today: number;
  week: number;
  total: number;
  totalMinutes: number;
  streak: number;
  last7: { key: string; label: string; sessions: number }[];
}

const AR_DAYS_SHORT = ['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'];

export function focusStats(log: FocusLog = getFocusLog()): FocusStats {
  const today = dayKey(new Date());
  const total = Object.values(log).reduce((a, b) => a + b, 0);

  const last7 = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = dayKey(d);
    return { key, label: AR_DAYS_SHORT[d.getDay()], sessions: log[key] ?? 0 };
  });

  const week = last7.reduce((a, d) => a + d.sessions, 0);

  // سلسلة الأيام المتتالية (من اليوم أو الأمس)
  let streak = 0;
  for (let i = 0; i < 60; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = dayKey(d);
    const has = (log[key] ?? 0) > 0;
    if (has) streak++;
    else if (i > 0) break; // أول يوم (اليوم) مسموح أن يكون صفراً
    else if (i === 0 && (log[dayKey(new Date(Date.now() - 86400000))] ?? 0) === 0) break;
  }

  return {
    today: log[today] ?? 0,
    week,
    total,
    totalMinutes: total * SESSION_MINUTES,
    streak,
    last7,
  };
}
