import { useState, useEffect, useCallback } from 'react';

/**
 * عميل لوحة الإدارة للتواصل مع خادم المنصة (apps/api).
 *
 * لماذا ترويسة `X-App: admin` إلزامية هنا: الخادم يفرّق بين التطبيقين.
 * الرمز (JWT) لا يحمل «أنت مدير» فحسب، بل يحمل أيضاً **من أين دخلت** —
 * ومسارات الإدارة لا تُفتح إلا برمز صادر عن لوحة الإدارة. بدون هذه
 * الترويسة يرفض الخادم دخول حساب الإدارة أصلاً.
 *
 * الطلبات تمرّ عبر المسار النسبي `/backend` (وكيل Vite → :5000) حتى تعمل
 * داخل المعاينة: متصفح المستخدم لا يصل إلى منفذ آخر مباشرة.
 */
/**
 * في التطوير: المسار النسبي `/backend` الذي يحوّله Vite إلى :5000.
 * في النشر: يُقرأ من `VITE_API_URL`، وإلا فالمسار النسبي.
 */
import { getApiBase } from './serverUrl';

export interface AdminUser {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  role: string;
}

export interface AccessCode {
  id: string;
  code: string;
  studentName: string | null;
  phone: string | null;
  grade: string | null;
  school: string | null;
  status: 'active' | 'used' | 'revoked';
  usedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  usedByName: string | null;
  usedByPhone: string | null;
}

class ApiError extends Error {
  status: number;
  /** true = تعذّر الوصول إلى الخادم أصلاً (لا رفضٌ منه) */
  offline: boolean;
  constructor(message: string, status: number, offline = false) {
    super(message);
    this.status = status;
    this.offline = offline;
  }
}

export const isOfflineError = (e: unknown): boolean =>
  e instanceof ApiError && e.offline;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    const headers: Record<string, string> = {
      'X-App': 'admin',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...((init?.headers as Record<string, string> | undefined) ?? {}),
    };
    res = await fetch(`${getApiBase()}${path}`, { ...init, credentials: 'include', headers });
  } catch {
    throw new ApiError('تعذّر الوصول إلى الخادم', 0, true);
  }

  const text = await res.text().catch(() => '');

  /* صفحة HTML بدل JSON = الخادم غير منشور أو العنوان خطأ */
  if (text.trimStart().startsWith('<')) {
    throw new ApiError('الخادم غير متاح — تعذّر الاتصال به', 0, true);
  }

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

/* ============================ الجلسة ============================ */

export const adminAuth = {
  async login(identifier: string, password: string): Promise<AdminUser> {
    const r = await request<{ user: AdminUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
    return r.user;
  },
  async logout(): Promise<void> {
    await request('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
  },
  async me(): Promise<AdminUser | null> {
    try {
      const r = await request<{ user: AdminUser }>('/api/auth/me');
      return r.user;
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return null;
      throw e;
    }
  },
};

/* ============================ رموز الدخول ============================ */

export const codesApi = {
  list: () => request<{ codes: AccessCode[] }>('/api/admin/codes'),
  create: (payload: {
    count?: number;
    studentName?: string;
    phone?: string;
    grade?: string;
    school?: string;
    days?: number;
  }) =>
    request<{ created: number; codes: AccessCode[] }>('/api/admin/codes', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  revoke: (id: string) =>
    request<{ ok: boolean }>(`/api/admin/codes/${id}/revoke`, { method: 'POST' }),
};

/* ============================ خطاف الجلسة ============================ */

/**
 * 'online' = متصل بالخادم ويعمل بجد · 'preview' = لا خادم (مثل ملف APK
 * مستقل على الجوال) فيُعرض التطبيق للاستعراض **دون حفظ**.
 */
export type AdminMode = 'online' | 'preview';

/** حساب وهمي لوضع المعاينة — يظهر في الشريط الجانبي بدل الحقيقي */
const PREVIEW_USER: AdminUser = {
  id: 'preview',
  name: 'معاينة (بلا خادم)',
  phone: null,
  email: null,
  role: 'admin',
};

export function useAdminSession() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [mode, setMode] = useState<AdminMode>('online');
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setUser(await adminAuth.me());
      setMode('online');
      setOffline(false);
      setError('');
    } catch (e) {
      setUser(null);
      setOffline(isOfflineError(e));
      setError(e instanceof Error ? e.message : 'تعذّر التحقق من الجلسة');
    } finally {
      setLoading(false);
    }
  }, []);

  /** دخول استعراضي — لا يتصل بالخادم، ولا يحفظ شيئاً */
  const enterPreview = useCallback(() => {
    setUser(PREVIEW_USER);
    setMode('preview');
    setError('');
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = async (identifier: string, password: string) => {
    const u = await adminAuth.login(identifier, password);
    setUser(u);
    setMode('online');
    setError('');
    return u;
  };

  const logout = async () => {
    if (mode === 'preview') {
      setUser(null);
      setMode('online');
      return;
    }
    await adminAuth.logout();
    setUser(null);
  };

  return { user, mode, offline, loading, error, login, logout, refresh, enterPreview };
}
