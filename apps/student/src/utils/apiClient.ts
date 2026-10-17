/**
 * عميل الواجهة للتواصل مع خادم المنصة (apps/api).
 *
 * كل الطلبات تمر عبر مسار نسبي /backend حتى تعمل داخل معاينة المتصفح
 * (المتصفح لا يصل إلى localhost في بيئة التطوير) — ويقوم خادم Vite
 * بتحويلها إلى http://localhost:5000.
 */
const BASE = '/backend';

export interface SessionUser {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  /**
   * لا يوجد حقل `role` هنا — تطبيق الطالب لا يعرف الأدوار أصلاً.
   * فصلُ التطبيقين يقتضي ألّا يحمل تطبيق الطالب أي مفهوم «حساب إدارة».
   */
  grade: string | null;
  school: string | null;
  avatar: string | null;
}

export interface SyncPayload {
  progress?: Array<{
    lessonId: string;
    completed: boolean;
    bookmarked: boolean;
    secondsSpent?: number;
    updatedAt?: string;
  }>;
  ratings?: Array<{ lessonId: string; rating: number; comment?: string | null; createdAt?: string }>;
  focus?: { log?: Record<string, number> };
  planner?: Array<Record<string, unknown>>;
}

export interface SyncResult {
  syncedAt: string;
  progress: Array<{
    lessonId: string;
    completed: boolean;
    bookmarked: boolean;
    secondsSpent: number;
    updatedAt: string;
  }>;
  ratings: Array<{ lessonId: string; rating: number; comment: string | null; createdAt: string }>;
  focus: { log: Record<string, number> };
  planner: Array<Record<string, unknown>>;
}

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    // تُبنى الترويسة بعد `init` حتى لا يفقد أي مُستدعٍ ترويسة X-App
    const headers: Record<string, string> = {
      // يعلن تطبيق الطالب عن نفسه — الخادم يرفض دخول حسابات الإدارة منه
      'X-App': 'student',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...((init?.headers as Record<string, string> | undefined) ?? {}),
    };
    res = await fetch(`${BASE}${path}`, {
      ...init,
      credentials: 'include',
      headers,
    });
  } catch {
    throw new ApiError('تعذّر الاتصال بالخادم — تعمل المنصة الآن دون اتصال', 0);
  }

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    const msg =
      (data && typeof data === 'object' && 'error' in data
        ? String((data as { error: unknown }).error)
        : '') || 'تعذّر إتمام الطلب';
    throw new ApiError(msg, res.status);
  }
  return data as T;
}

export const api = {
  /** فحص بسيط لمعرفة إن كان الخادم متاحاً */
  health: () => request<{ ok: boolean; stage?: string }>('/api/health'),

  me: () => request<{ user: SessionUser }>('/api/auth/me'),

  login: (identifier: string, password: string) =>
    request<{ user: SessionUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    }),

  register: (data: {
    name: string;
    phone?: string;
    email?: string;
    password: string;
    grade?: string;
    school?: string;
  }) =>
    request<{ user: SessionUser }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  logout: () => request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),

  updateMe: (updates: Partial<Pick<SessionUser, 'name' | 'school' | 'grade' | 'avatar'>>) =>
    request<{ user: SessionUser }>('/api/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),

  sync: (payload: SyncPayload) =>
    request<SyncResult>('/api/sync', { method: 'POST', body: JSON.stringify(payload) }),
};

export { ApiError };
