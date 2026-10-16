/**
 * مخزن تقييمات الدروس (Rating & Feedback Store)
 *
 * يحفظ تقييم الطالب (نجوم) وملاحظاته النصية محلياً في المتصفح،
 * ويحسب المتوسط المعروض بدمج التقييمات التجريبية الأساسية مع تقييم الطالب.
 *
 * ⚠️ المرحلة الأولى: لا يوجد خادم — الملاحظات محفوظة في جهاز الطالب فقط،
 *    والأرقام الأساسية (SAMPLE_RATING_STATS) بيانات تجريبية للعرض.
 */
import { LessonFeedback } from '../types';
import { SAMPLE_RATING_STATS } from '@shared/curriculum';
import { markDirty, registerSyncSource } from './syncBus';

const KEY = 'ssp_lesson_feedback_v1';
const EVENT = 'ssp:feedback-changed';

/** أرقام تجريبية للعرض (تحاكي تقييمات سابقة) — تُوسم بأنها تجريبية في الواجهة */


export function getAllFeedback(): Record<string, LessonFeedback> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, LessonFeedback>) : {};
  } catch {
    return {};
  }
}

export function getFeedback(lessonId: string): LessonFeedback | null {
  return getAllFeedback()[lessonId] ?? null;
}

function notify(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function saveFeedback(feedback: Omit<LessonFeedback, 'updatedAt'>): void {
  try {
    const all = getAllFeedback();
    all[feedback.lessonId] = { ...feedback, updatedAt: new Date().toISOString() };
    localStorage.setItem(KEY, JSON.stringify(all));
    notify();
    markDirty('ratings');
  } catch (e) {
    console.error('تعذّر حفظ التقييم:', e);
  }
}

export function removeFeedback(lessonId: string): void {
  try {
    const all = getAllFeedback();
    delete all[lessonId];
    localStorage.setItem(KEY, JSON.stringify(all));
    notify();
    markDirty('ratings');
  } catch (e) {
    console.error('تعذّر حذف التقييم:', e);
  }
}

export function subscribeFeedback(handler: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const listener = () => handler();
  window.addEventListener(EVENT, listener);
  window.addEventListener('storage', listener);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener('storage', listener);
  };
}

export interface RatingStats {
  sampleAverage: number;
  sampleTotal: number;
  userRating: number | null;
  average: number;
  total: number;
}

/** يدمج الرقم التجريبي الأساسي مع تقييم الطالب لحساب المتوسط المعروض */
export function ratingStats(lessonId: string, feedback: LessonFeedback | null): RatingStats {
  const sample = SAMPLE_RATING_STATS[lessonId] ?? { average: 4.8, total: 45 };
  const userRating = feedback?.rating ?? null;
  if (userRating === null) {
    return { sampleAverage: sample.average, sampleTotal: sample.total, userRating: null, average: sample.average, total: sample.total };
  }
  const newTotal = sample.total + 1;
  const newSum = sample.average * sample.total + userRating;
  return {
    sampleAverage: sample.average,
    sampleTotal: sample.total,
    userRating,
    average: Math.round((newSum / newTotal) * 10) / 10,
    total: newTotal,
  };
}

/** وسوم سريعة جاهزة لتسريع كتابة الملاحظة */
export const FEEDBACK_TAGS = [
  'الشرح واضح وممتاز',
  'أحتاج أمثلة أكثر',
  'القاعدة تحتاج تبسيطاً',
  'الأمثلة المحلولة مفيدة',
  'الدرس طويل ويحتاج تقسيم',
  'المرفقات لا تعمل',
];

/* ==================== ربط المخزن بمحرّك المزامنة ==================== */

registerSyncSource(
  'ratings',
  () =>
    Object.values(getAllFeedback()).map((f) => ({
      lessonId: f.lessonId,
      rating: f.rating,
      comment: f.comment || null,
      createdAt: f.updatedAt,
    })),
  (serverValue) => {
    const list = Array.isArray(serverValue) ? (serverValue as Array<Record<string, unknown>>) : [];
    if (!list.length) return;
    try {
      const all = getAllFeedback();
      let changed = false;
      list.forEach((row) => {
        const lessonId = String(row.lessonId ?? '');
        const rating = Number(row.rating ?? 0);
        if (!lessonId || rating < 1 || rating > 5) return;
        const serverAt = String(row.createdAt ?? '');
        const local = all[lessonId];
        if (local && serverAt && local.updatedAt > serverAt) return; // المحلي أحدث
        if (local && local.rating === rating && (local.comment || '') === String(row.comment ?? '')) return;
        all[lessonId] = {
          lessonId,
          rating,
          comment: String(row.comment ?? ''),
          updatedAt: serverAt || new Date().toISOString(),
        };
        changed = true;
      });
      if (changed) {
        localStorage.setItem(KEY, JSON.stringify(all));
        notify();
      }
    } catch (e) {
      console.error('تعذّر دمج التقييمات من الخادم:', e);
    }
  },
);
