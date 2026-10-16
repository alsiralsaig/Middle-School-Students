/**
 * ناقل المزامنة — وحدة بلا أي اعتمادات (leaf) لتفادي التبعيات الدائرية.
 *
 * كل مخزن محلي (localStorage) يسجّل نفسه هنا بوصفه "مصدراً":
 *  - collect: يجمع ما عنده لإرساله إلى الخادم
 *  - apply:   يستقبل الحالة النهائية من الخادم ويطبّقها محلياً
 * وعند أي تغيير محلي يستدعي markDirty حتى يرسلها المحرّك لاحقاً.
 */

export type SyncKey = 'progress' | 'ratings' | 'focus' | 'planner';

export interface SyncSource {
  collect: () => unknown;
  apply: (serverValue: unknown) => void;
}

const sources = new Map<SyncKey, SyncSource>();
const dirty = new Set<SyncKey>();
const listeners = new Set<(dirtyCount: number) => void>();

let dirtyCount = 0;

function notify(): void {
  const n = dirty.size;
  if (n !== dirtyCount) {
    dirtyCount = n;
    listeners.forEach((cb) => cb(n));
  }
}

export function registerSyncSource(
  key: SyncKey,
  collect: () => unknown,
  apply: (serverValue: unknown) => void,
): () => void {
  sources.set(key, { collect, apply });
  return () => {
    sources.delete(key);
    dirty.delete(key);
  };
}

export function getSources(): Map<SyncKey, SyncSource> {
  return sources;
}

export function markDirty(key: SyncKey): void {
  dirty.add(key);
  notify();
}

export function drainDirty(): SyncKey[] {
  const keys = [...dirty];
  dirty.clear();
  notify();
  return keys;
}

export function pendingCount(): number {
  return dirty.size;
}

export function onDirtyChange(cb: (count: number) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
