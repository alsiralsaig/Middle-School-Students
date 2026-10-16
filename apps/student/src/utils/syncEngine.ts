/**
 * محرّك المزامنة بين المتصفح والخادم.
 *
 * - يعمل فقط إن كان الطالب مسجّلاً دخوله (sessionStore).
 * - يجمع البيانات من المصادر المسجّلة في syncBus ويرسلها إلى /api/sync.
 * - يطبّق الحالة النهائية القادمة من الخادم (آخر كتابة تنتصر).
 * - عند غياب الجلسة أو تعذّر الاتصال: لا شيء يتغيّر — تبقى المنصة تعمل محلياً.
 */
import { api, SyncPayload, SyncResult } from './apiClient';
import { drainDirty, getSources, onDirtyChange, pendingCount, SyncKey } from './syncBus';
import { sessionStore } from './sessionStore';

const DEBOUNCE_MS = 2500;
const PERIODIC_MS = 60_000;

let timer: ReturnType<typeof setTimeout> | null = null;
let periodic: ReturnType<typeof setInterval> | null = null;
let inFlight = false;

function collect(keys: SyncKey[]): SyncPayload {
  const sources = getSources();
  const payload: SyncPayload = {};
  keys.forEach((key) => {
    const src = sources.get(key);
    if (!src) return;
    const value = src.collect();
    if (value === null || value === undefined) return;
    if (key === 'progress') payload.progress = value as SyncPayload['progress'];
    if (key === 'ratings') payload.ratings = value as SyncPayload['ratings'];
    if (key === 'focus') payload.focus = value as SyncPayload['focus'];
    if (key === 'planner') payload.planner = value as SyncPayload['planner'];
  });
  return payload;
}

function applyResult(result: SyncResult): void {
  const sources = getSources();
  sources.get('progress')?.apply(result.progress);
  sources.get('ratings')?.apply(result.ratings);
  sources.get('focus')?.apply(result.focus);
  sources.get('planner')?.apply(result.planner);
}

export async function runSync(keys?: SyncKey[]): Promise<boolean> {
  const { user } = sessionStore.getState();
  if (!user) return false;
  if (inFlight) return false;

  const targets = keys && keys.length ? keys : (['progress', 'ratings', 'focus', 'planner'] as SyncKey[]);
  if (!targets.length) return false;

  inFlight = true;
  sessionStore.setSyncing(true);
  try {
    const payload = collect(targets);
    const result = await api.sync(payload);
    applyResult(result);
    sessionStore.markSynced(result.syncedAt);
    sessionStore.setConnection('online');
    return true;
  } catch (e) {
    if ((e as { status?: number }).status === 0) {
      sessionStore.setConnection('offline');
    } else if ((e as { status?: number }).status === 401) {
      // الجلسة انتهت — نوقف المزامنة بصمت ولا نكسر الشاشات
      sessionStore.reset();
    }
    return false;
  } finally {
    inFlight = false;
    sessionStore.setSyncing(false);
  }
}

function schedule(): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    if (pendingCount() > 0) void runSync(drainDirty());
  }, DEBOUNCE_MS);
}

/** يبدأ المحرّك: مزامنة عند التغيير + مزامنة دورية + عند العودة للاتصال */
export function startSyncEngine(): () => void {
  if (!periodic) {
    periodic = setInterval(() => {
      if (sessionStore.isLoggedIn()) void runSync();
    }, PERIODIC_MS);
  }

  const onDirty = () => schedule();
  const unsubscribe = onDirtyChange(onDirty);

  const onOnline = () => {
    if (sessionStore.isLoggedIn()) void runSync();
  };
  window.addEventListener('online', onOnline);

  return () => {
    unsubscribe();
    window.removeEventListener('online', onOnline);
    if (timer) clearTimeout(timer);
    if (periodic) clearInterval(periodic);
    timer = null;
    periodic = null;
  };
}
