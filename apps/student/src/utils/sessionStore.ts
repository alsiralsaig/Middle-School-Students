/**
 * حالة الجلسة (تسجيل الدخول) — مخزن خارج React يُقرأ عبر useSyncExternalStore.
 * يعمل دون اتصال: يعتمد على نسخة مخزّنة في localStorage حتى ينجح أول اتصال بالخادم.
 */
import { api, SessionUser } from './apiClient';

export type ConnectionState = 'checking' | 'online' | 'offline';

export interface SessionState {
  user: SessionUser | null;
  connection: ConnectionState;
  /** آخر مرة نجحت فيها المزامنة */
  lastSyncAt: string | null;
  syncing: boolean;
}

const CACHE_KEY = 'ssp_session_cache_v1';

let state: SessionState = {
  user: readCache(),
  connection: 'checking',
  lastSyncAt: null,
  syncing: false,
};

const listeners = new Set<() => void>();

function readCache(): SessionUser | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

function writeCache(user: SessionUser | null): void {
  try {
    if (user) localStorage.setItem(CACHE_KEY, JSON.stringify(user));
    else localStorage.removeItem(CACHE_KEY);
  } catch {
    /* تجاهل */
  }
}

function set(patch: Partial<SessionState>): void {
  state = { ...state, ...patch };
  listeners.forEach((cb) => cb());
}

export const sessionStore = {
  subscribe(cb: () => void): () => void {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
  getState(): SessionState {
    return state;
  },
  setUser(user: SessionUser | null): void {
    writeCache(user);
    set({ user });
  },
  setConnection(connection: ConnectionState): void {
    set({ connection });
  },
  setSyncing(syncing: boolean): void {
    set({ syncing });
  },
  markSynced(at: string): void {
    set({ lastSyncAt: at });
  },
  isLoggedIn(): boolean {
    return state.user !== null;
  },
  reset(): void {
    writeCache(null);
    set({ user: null, lastSyncAt: null, syncing: false });
  },
};

/* ============================ إجراءات الحساب ============================ */

export async function refreshSession(): Promise<SessionUser | null> {
  const cached = sessionStore.getState().user;
  try {
    await api.health();
    sessionStore.setConnection('online');
    // زائر بلا جلسة محفوظة: لا داعي لطلب /api/auth/me (يُنتج 401 بلا فائدة)
    if (!cached) return null;
    const { user } = await api.me();
    sessionStore.setUser(user);
    return user;
  } catch (e) {
    if ((e as { status?: number }).status === 0) {
      sessionStore.setConnection('offline');
      return cached; // نبقى على النسخة المحلية
    }
    sessionStore.reset(); // الجلسة منتهية
    sessionStore.setConnection('online');
    return null;
  }
}

export async function login(identifier: string, password: string): Promise<SessionUser> {
  const { user } = await api.login(identifier, password);
  sessionStore.setUser(user);
  sessionStore.setConnection('online');
  return user;
}

export async function register(data: {
  name: string;
  phone?: string;
  email?: string;
  password: string;
  grade?: string;
  school?: string;
  /** رمز الدخول الذي أصدرته الإدارة — مطلوب، ويُستهلك مرة واحدة */
  accessCode: string;
}): Promise<SessionUser> {
  const { user } = await api.register(data);
  sessionStore.setUser(user);
  sessionStore.setConnection('online');
  return user;
}

export async function logout(): Promise<void> {
  try {
    await api.logout();
  } catch {
    /* حتى لو فشل الاتصال ننهي الجلسة محلياً */
  }
  sessionStore.reset();
}
