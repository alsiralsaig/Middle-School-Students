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
const BASE = '/backend';

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
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    const headers: Record<string, string> = {
      'X-App': 'admin',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...((init?.headers as Record<string, string> | undefined) ?? {}),
    };
    res = await fetch(`${BASE}${path}`, { ...init, credentials: 'include', headers });
  } catch {
    throw new ApiError('تعذّر الاتصال بالخادم — تأكد أنه يعمل على المنفذ ٥٠٠٠', 0);
  }

  const text = await res.text().catch(() => '');
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

export function useAdminSession() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setUser(await adminAuth.me());
      setError('');
    } catch (e) {
      setUser(null);
      setError(e instanceof Error ? e.message : 'تعذّر التحقق من الجلسة');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = async (identifier: string, password: string) => {
    const u = await adminAuth.login(identifier, password);
    setUser(u);
    setError('');
    return u;
  };

  const logout = async () => {
    await adminAuth.logout();
    setUser(null);
  };

  return { user, loading, error, login, logout, refresh };
}
