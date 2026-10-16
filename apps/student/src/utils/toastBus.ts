/**
 * ناقل التنبيهات المنبثقة (Toast Bus)
 *
 * طريقة بسيطة تسمح لأي مكوّن بإظهار تنبيه منبثق دون الحاجة إلى مزوّد حالة (Context):
 *   showToast({ title: 'اقترب موعد المراجعة', message: '...', tone: 'exam' })
 *
 * المكوّن `ToastHost` هو المستمع الوحيد، ويُركّب مرة واحدة في App.
 */
import { ViewMode } from '../types';

export type ToastTone = 'info' | 'success' | 'warning' | 'exam';

export interface ToastPayload {
  title: string;
  message?: string;
  tone?: ToastTone;
  durationMs?: number;
  targetView?: ViewMode;
  targetId?: string;
}

export interface ToastItem extends ToastPayload {
  id: string;
  tone: ToastTone;
  durationMs: number;
}

const TOAST_EVENT = 'ssp:toast';

export function showToast(payload: ToastPayload): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<ToastPayload>(TOAST_EVENT, { detail: payload }));
}

export function onToast(handler: (payload: ToastPayload) => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const listener = (e: Event) => handler((e as CustomEvent<ToastPayload>).detail);
  window.addEventListener(TOAST_EVENT, listener);
  return () => window.removeEventListener(TOAST_EVENT, listener);
}

/* ============================================================
 * ناقل أحداث التنبيهات (مركز التنبيهات في الهيدر)
 * ============================================================ */

const NOTIFICATIONS_KEY = 'sudanese_platform_notifications';
const NOTIFICATIONS_EVENT = 'ssp:notifications-changed';

export interface NewNotification {
  title: string;
  titleEn?: string;
  message: string;
  messageEn?: string;
  type: 'lesson' | 'exam' | 'badge' | 'live' | 'system';
  targetView?: ViewMode;
  targetId?: string;
}

/** يضيف إشعاراً جديداً إلى مركز التنبيهات (ويُبلغ كل المستمعين) */
export function pushNotification(n: NewNotification): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const item = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: n.title,
      titleEn: n.titleEn ?? n.title,
      message: n.message,
      messageEn: n.messageEn ?? n.message,
      type: n.type,
      timestamp: new Date().toISOString(),
      isRead: false,
      targetView: n.targetView,
      targetId: n.targetId,
    };
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify([item, ...list].slice(0, 50)));
    window.dispatchEvent(new CustomEvent(NOTIFICATIONS_EVENT));
  } catch (e) {
    console.error('تعذّر حفظ الإشعار:', e);
  }
}

export function onNotificationsChanged(handler: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const listener = () => handler();
  window.addEventListener(NOTIFICATIONS_EVENT, listener);
  window.addEventListener('storage', listener);
  return () => {
    window.removeEventListener(NOTIFICATIONS_EVENT, listener);
    window.removeEventListener('storage', listener);
  };
}

/* ============================================================
 * أدوات مساعدة للتعامل مع الوقت
 * ============================================================ */

const ARABIC_DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export const arabicDayName = (d: Date) => ARABIC_DAYS[d.getDay()];

/** تطبيع النص العربي للمقارنة (إزالة التشكيل، توحيد الألف، إسقاط «ال») */
export const normalizeAr = (s: string) =>
  s
    .replace(/[\u064B-\u0652\u0670]/g, '')
    .replace(/[آأإٱاىي]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, '')
    .replace(/^ال/, '');

/** «الخميس» → 4 وهكذا، أو -1 إن لم تتطابق */
export const weekdayFromArabic = (name: string) =>
  ARABIC_DAYS.findIndex((d) => normalizeAr(d) === normalizeAr(name));

export const toHHMM = (d: Date) =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

export const minutesSinceMidnight = (d: Date) => d.getHours() * 60 + d.getMinutes();

/** وصف عربي مختصر للمدة المتبقية */
export function relativeArabic(msDiff: number): string {
  if (msDiff <= 0) return 'حان موعده الآن';
  const mins = Math.round(msDiff / 60000);
  if (mins < 60) return `بعد ${mins} دقيقة`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `بعد ${hours} ${hours === 1 ? 'ساعة' : 'ساعات'}`;
  const days = Math.round(hours / 24);
  return `بعد ${days} ${days === 1 ? 'يوم' : 'أيام'}`;
}

/** مفاتيح «تم التنبيه» في localStorage حتى لا يتكرر التنبيه نفسه */
const FIRED_KEY = 'ssp_fired_markers_v1';

export function wasFired(key: string): boolean {
  try {
    const raw = localStorage.getItem(FIRED_KEY);
    if (!raw) return false;
    const map = JSON.parse(raw) as Record<string, string>;
    return map[key] === new Date().toDateString();
  } catch {
    return false;
  }
}

export function markFired(key: string): void {
  try {
    const raw = localStorage.getItem(FIRED_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    map[key] = new Date().toDateString();
    // تنظيف العلامات القديمة (أكثر من ٧ أيام)
    const today = new Date();
    Object.keys(map).forEach((k) => {
      const stamp = new Date(map[k]);
      if (!isNaN(stamp.getTime()) && (today.getTime() - stamp.getTime()) / 86400000 > 7) {
        delete map[k];
      }
    });
    localStorage.setItem(FIRED_KEY, JSON.stringify(map));
  } catch {
    /* تجاهل */
  }
}
