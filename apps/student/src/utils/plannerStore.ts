/**
 * مخزن التقويم الدراسي (Planner Store)
 *
 * يجمع بين:
 *  - المواعيد التجريبية الجاهزة (INITIAL_CALENDAR_EVENTS) — موسومة `sample`
 *  - مواعيد الطالب نفسه (مراجعات، اختبارات تجريبية مجدولة) — محفوظة في localStorage
 *
 * أي إضافة أو حذف يُبلغ المشتركين (التقويم، لوحة الطالب، محرّك التنبيهات).
 */
import { CalendarEvent } from '../types';
import { INITIAL_CALENDAR_EVENTS } from '../data/platformFeaturesData';
import { markDirty, registerSyncSource } from './syncBus';

const STORE_KEY = 'ssp_planner_events_v1';
const CHANGE_EVENT = 'ssp:planner-changed';

export interface PlannerEvent extends CalendarEvent {
  /** 'sample' = بيانات تجريبية جاهزة · 'user' = أضافها الطالب بنفسه */
  status: 'sample' | 'user';
  /** إن كان موعداً متكرراً (الاختبارات التجريبية الأسبوعية) */
  recurring?: { weekday: number; time: string; groupId: string };
}

const SAMPLE_EVENTS: PlannerEvent[] = INITIAL_CALENDAR_EVENTS.map((e) => ({
  ...e,
  status: 'sample' as const,
}));

export function readUserEvents(): PlannerEvent[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PlannerEvent[]) : [];
  } catch {
    return [];
  }
}

function writeUserEvents(events: PlannerEvent[]): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(events));
  } catch (e) {
    console.error('تعذّر حفظ مواعيد التقويم:', e);
  }
  notify();
}

function notify(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

export function getAllEvents(): PlannerEvent[] {
  return [...SAMPLE_EVENTS, ...readUserEvents()].sort((a, b) =>
    `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`),
  );
}

export function addEvent(event: PlannerEvent): void {
  writeUserEvents([...readUserEvents(), event]);
  markDirty('planner');
}

export function addEvents(events: PlannerEvent[]): void {
  writeUserEvents([...readUserEvents(), ...events]);
  markDirty('planner');
}

export function removeEvent(id: string): void {
  writeUserEvents(readUserEvents().filter((e) => e.id !== id));
  markDirty('planner');
}

export function removeGroup(groupId: string): void {
  writeUserEvents(readUserEvents().filter((e) => e.recurring?.groupId !== groupId));
  markDirty('planner');
}

/* ==================== ربط المخزن بمحرّك المزامنة ==================== */

/** يدمج مواعيد الخادم مع المحلية (يتجاهل المواعيد التجريبية status=sample) */
registerSyncSource(
  'planner',
  () => readUserEvents(),
  (serverValue) => {
    const list = Array.isArray(serverValue) ? (serverValue as Array<Record<string, unknown>>) : [];
    if (!list.length) return;
    const local = readUserEvents();
    const byId = new Map(local.map((e) => [e.id, e]));
    let changed = false;
    list.forEach((row) => {
      const id = String(row.id ?? '');
      if (!id) return;
      const event = {
        ...(byId.get(id) ?? {}),
        id,
        title: String(row.title ?? ''),
        date: String(row.date ?? ''),
        time: String(row.time ?? '19:00'),
        type: row.type as PlannerEvent['type'],
        subjectName: String(row.subjectName ?? 'عام'),
        description: row.description ? String(row.description) : undefined,
        status: 'user' as const,
      } as PlannerEvent;
      if (JSON.stringify(byId.get(id)) !== JSON.stringify(event)) {
        byId.set(id, event);
        changed = true;
      }
    });
    if (changed) writeUserEvents([...byId.values()]);
  },
);

export function subscribePlanner(handler: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const listener = () => handler();
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener('storage', listener);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener('storage', listener);
  };
}

/* ============================ helpers ============================ */

/** تحويل تاريخ + وقت إلى كائن Date */
export function eventDate(e: CalendarEvent): Date {
  const [y, m, d] = e.date.split('-').map(Number);
  const [hh, mm] = (e.time || '00:00').split(':').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0);
}

/** المواعيد القادمة خلال الساعات القادمة */
export function upcomingEvents(withinHours = 24): PlannerEvent[] {
  const now = Date.now();
  return getAllEvents()
    .map((e) => ({ e, at: eventDate(e).getTime() }))
    .filter(({ at }) => at > now && at - now <= withinHours * 3600000)
    .sort((a, b) => a.at - b.at)
    .map(({ e }) => e);
}

export const typeLabelAr = (type: CalendarEvent['type']): string =>
  ({
    exam: 'اختبار',
    trial_exam: 'اختبار تجريبي',
    review: 'مراجعة',
    deadline: 'موعد تسليم',
    live_class: 'حصة مباشرة',
    reminder: 'تذكير',
  })[type] ?? 'موعد';

export const typeTone = (type: CalendarEvent['type']): string =>
  ({
    exam: 'bg-rose-100 text-rose-700 border-rose-200',
    trial_exam: 'bg-amber-100 text-amber-800 border-amber-200',
    review: 'bg-sky-100 text-sky-700 border-sky-200',
    deadline: 'bg-orange-100 text-orange-700 border-orange-200',
    live_class: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    reminder: 'bg-slate-100 text-slate-600 border-slate-200',
  })[type] ?? 'bg-slate-100 text-slate-600 border-slate-200';
