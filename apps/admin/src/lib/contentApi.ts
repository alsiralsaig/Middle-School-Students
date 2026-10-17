/**
 * عميل تحرير المحتوى في لوحة الإدارة.
 *
 * لماذا منفصل عن `adminApi.ts`: ذاك ملفّه الجلسة ورموز الدخول، وهذا
 * ملفّه المنهج نفسه. كلاهما يرسل `X-App: admin` — بدونه يرفض الخادم
 * دخول الإدارة أصلاً.
 */
const BASE = '/backend';

export interface LessonRecord {
  id: string;
  title: string;
  summary: string;
  status: string;
  lessonNumber: number;
  durationMinutes: number;
  subjectId: string;
  unitId: string;
  learningObjectives: string[];
  sections: Array<{ heading: string; body: string }>;
  keyRules: string[];
  examTips: string[];
  faq: Array<{ q: string; a: string }>;
}

export interface LessonSummary {
  id: string;
  title: string;
  summary: string;
  status: string;
  lessonNumber: number;
  durationMinutes: number;
  subjectId: string;
  unitId: string;
  unit?: { title: string; unitNumber: number } | null;
}

class ApiError extends Error {
  status: number;
  offline: boolean;
  constructor(message: string, status: number, offline = false) {
    super(message);
    this.status = status;
    this.offline = offline;
  }
}

export const isOffline = (e: unknown): boolean => e instanceof ApiError && e.offline;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        'X-App': 'admin',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      },
    });
  } catch {
    throw new ApiError('تعذّر الوصول إلى الخادم', 0, true);
  }

  const text = await res.text().catch(() => '');
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

export const api = {
  isOffline,

  listLessons: (subjectId?: string) =>
    request<{ lessons: LessonSummary[] }>(
      `/api/admin/lessons${subjectId ? `?subjectId=${encodeURIComponent(subjectId)}` : ''}`
    ),

  getLesson: (id: string) => request<LessonRecord>(`/api/admin/lessons/${id}`),

  saveLesson: (
    id: string,
    data: {
      title: string;
      summary: string;
      durationMinutes: number;
      learningObjectives: string[];
      sections: Array<{ heading: string; body: string }>;
      keyRules: string[];
      examTips: string[];
      faq: Array<{ q: string; a: string }>;
      status: string;
    }
  ) =>
    request<LessonRecord>(`/api/admin/lessons/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};
