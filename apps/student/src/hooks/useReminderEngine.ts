import { useEffect, useRef } from 'react';
import { StudyReminder } from '../types';
import {
  arabicDayName,
  markFired,
  minutesSinceMidnight,
  normalizeAr,
  pushNotification,
  relativeArabic,
  showToast,
  toHHMM,
  wasFired,
} from '../utils/toastBus';
import { eventDate, getAllEvents, typeLabelAr } from '../utils/plannerStore';

const REMINDERS_KEY = 'sudanese_platform_study_reminders';

export interface PendingLesson {
  id: string;
  title: string;
  subjectName: string;
}

interface Options {
  /** دروس في قائمة المتابعة ولم تكتمل بعد */
  pendingLessons: PendingLesson[];
  enabled?: boolean;
}

function readReminders(): StudyReminder[] {
  try {
    const raw = localStorage.getItem(REMINDERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StudyReminder[]) : [];
  } catch {
    return [];
  }
}

function fireBrowserNotification(title: string, body: string): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, icon: '/brand/logo.png' });
  } catch {
    /* بعض المتصفحات ترفض الإشعارات بدون تفاعل المستخدم */
  }
}

/**
 * محرّك التنبيهات المحلي — يعمل كل 60 ثانية ويتحقّق من ثلاثة أمور:
 *   1. تذكيرات المذاكرة (حسب الوقت والأيام المحددة في جدول الطالب)
 *   2. مواعيد التقويم القادمة (اختبار / مراجعة / اختبار تجريبي) خلال ٢٤ ساعة
 *   3. دروس لم تكتمل وفي قائمة المتابعة (تذكير مرة واحدة يومياً مساءً)
 *
 * كل تنبيه يُرسل مرة واحدة فقط يومياً، ويظهر كـ Toast + إشعار في مركز التنبيهات
 * + إشعار متصفح (إن منح الطالب الإذن).
 */
export function useReminderEngine({ pendingLessons, enabled = true }: Options): void {
  const pendingRef = useRef<PendingLesson[]>(pendingLessons);
  pendingRef.current = pendingLessons;

  useEffect(() => {
    if (!enabled) return;

    const tick = () => {
      const now = new Date();
      const today = now.toDateString();
      const nowMin = minutesSinceMidnight(now);
      const todayAr = normalizeAr(arabicDayName(now));

      /* ---------- 1) تذكيرات المذاكرة ---------- */
      readReminders()
        .filter((r) => r.isEnabled)
        .forEach((r) => {
          const [hh, mm] = (r.time || '00:00').split(':').map(Number);
          const targetMin = (hh || 0) * 60 + (mm || 0);
          const diff = nowMin - targetMin;
          if (diff < 0 || diff > 2) return; // نافذة سمتها دقيقتان
          // ملاحظة: يجب تطبيع الطرفين — normalizeAr تُحوّل الياء إلى ألف
          const daily = normalizeAr('يومياً');
          const dayOk =
            r.days.some((d) => normalizeAr(d) === daily) ||
            r.days.some((d) => normalizeAr(d) === todayAr);
          if (!dayOk) return;

          const key = `reminder:${r.id}:${today}`;
          if (wasFired(key)) return;
          markFired(key);

          const title = `تذكير مذاكرة: ${r.subjectName}`;
          const body = `${r.label} — حان موعدك (${r.time})`;
          showToast({ title, message: body, tone: 'warning' });
          if (r.notifyBrowser) fireBrowserNotification(`📚 ${title}`, body);
          pushNotification({
            title,
            titleEn: `Study reminder: ${r.subjectName}`,
            message: body,
            messageEn: body,
            type: 'system',
            targetView: 'student-dashboard',
          });
        });

      /* ---------- 2) مواعيد التقويم القادمة ---------- */
      getAllEvents().forEach((e) => {
        const at = eventDate(e).getTime();
        const diff = at - now.getTime();
        if (diff <= 0 || diff > 24 * 3600000) return;

        const key = `event:${e.id}:${today}`;
        if (wasFired(key)) return;
        markFired(key);

        const isExam = e.type === 'exam' || e.type === 'trial_exam';
        const title = `${typeLabelAr(e.type)}: ${e.title}`;
        const body = `${e.subjectName} — ${relativeArabic(diff)} (${e.time})`;
        showToast({ title, message: body, tone: isExam ? 'exam' : 'info' });
        fireBrowserNotification(`⏰ ${title}`, body);
        pushNotification({
          title,
          titleEn: `Upcoming: ${e.title}`,
          message: body,
          messageEn: body,
          type: isExam ? 'exam' : 'system',
          targetView: 'student-dashboard',
        });
      });

      /* ---------- 3) دروس لم تكتمل ---------- */
      const pending = pendingRef.current;
      if (pending.length > 0 && now.getHours() === 19 && now.getMinutes() < 2) {
        const key = `pending-lessons:${today}`;
        if (!wasFired(key)) {
          markFired(key);
          const first = pending[0];
          const title = 'لديك دروس لم تكتمل';
          const body = `${pending.length} درس في قائمة المتابعة، منها «${first.title}» (${first.subjectName})`;
          showToast({ title, message: body, tone: 'info' });
          pushNotification({
            title,
            titleEn: 'Unfinished lessons',
            message: body,
            messageEn: body,
            type: 'lesson',
            targetView: 'student-dashboard',
          });
        }
      }
    };

    // فحص أول بعد 4 ثوانٍ من التحميل، ثم كل دقيقة
    const boot = setTimeout(tick, 4000);
    const interval = setInterval(tick, 60000);
    return () => {
      clearTimeout(boot);
      clearInterval(interval);
    };
  }, [enabled]);
}

/** تذكير فوري عند إنهاء درس أو جدولة موعد (يُستخدم من الواجهات مباشرة) */
export const nowLabel = toHHMM;
