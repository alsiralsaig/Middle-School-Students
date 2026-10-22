/**
 * عميل تحرير المحتوى في لوحة الإدارة.
 *
 * لماذا منفصل عن `adminApi.ts`: ذاك ملفّه الجلسة ورموز الدخول، وهذا
 * ملفّه المنهج نفسه. كلاهما يرسل `X-App: admin` — بدونه يرفض الخادم
 * دخول الإدارة أصلاً.
 */
import { getApiBase } from './serverUrl';

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
    res = await fetch(`${getApiBase()}${path}`, {
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

function normalizeLesson(input: LessonRecord): LessonRecord {
  const value = input as LessonRecord & Record<string, unknown>;
  const strings = (x: unknown): string[] => Array.isArray(x) ? x.map(String) : [];
  const sections = Array.isArray(value.sections) ? value.sections.map((x) => {
    const o = (x ?? {}) as Record<string, unknown>;
    return { heading: String(o.heading ?? o.title ?? ''), body: String(o.body ?? o.content ?? '') };
  }) : [];
  const faq = Array.isArray(value.faq) ? value.faq.map((x) => {
    const o = (x ?? {}) as Record<string, unknown>;
    return { q: String(o.q ?? o.question ?? ''), a: String(o.a ?? o.answer ?? '') };
  }) : [];
  return { ...value, title: String(value.title ?? ''), summary: String(value.summary ?? ''), status: String(value.status ?? 'sample'),
    lessonNumber: Number(value.lessonNumber) || 1, durationMinutes: Number(value.durationMinutes) || 30,
    subjectId: String(value.subjectId ?? ''), unitId: String(value.unitId ?? ''),
    learningObjectives: strings(value.learningObjectives), sections, keyRules: strings(value.keyRules), examTips: strings(value.examTips), faq };
}

export const api = {
  isOffline,

  listLessons: (subjectId?: string) =>
    request<{ lessons: LessonSummary[] }>(
      `/api/admin/lessons${subjectId ? `?subjectId=${encodeURIComponent(subjectId)}` : ''}`
    ),

  async getLesson(id: string): Promise<LessonRecord> {
    const result = await request<{ lesson?: LessonRecord } | LessonRecord>(`/api/admin/lessons/${encodeURIComponent(id)}`);
    const lesson = (result as { lesson?: LessonRecord }).lesson ?? (result as LessonRecord);
    if (!lesson || typeof lesson !== 'object') throw new Error('استجابة الدرس غير صالحة');
    return normalizeLesson(lesson);
  },

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
    request<{ lesson: LessonRecord }>(`/api/admin/lessons/${encodeURIComponent(id)}`, {
      method: 'PUT', body: JSON.stringify(data),
    }).then((r) => normalizeLesson(r.lesson)),
  createLesson: (data: { subjectId: string; unitId: string; title: string; summary?: string; durationMinutes?: number }) =>
    request<{ lesson: LessonRecord }>('/api/admin/lessons', { method: 'POST', body: JSON.stringify(data) }).then((r) => normalizeLesson(r.lesson)),
  createSubject: (data: { id: string; name: string; nameEn: string; code: string; category: string; description: string }) =>
    request<{ subject: unknown }>('/api/admin/subjects', { method: 'POST', body: JSON.stringify(data) }),
  updateSubject: (id: string, data: { name: string; nameEn: string; code: string; category: string; description: string }) =>
    request<{ subject: unknown }>(`/api/admin/subjects/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  createUnit: (subjectId: string, data: { title: string; description: string; unitNumber?: number }) =>
    request<{ unit: unknown }>(`/api/admin/subjects/${encodeURIComponent(subjectId)}/units`, { method: 'POST', body: JSON.stringify(data) }),
  updateUnit: (id: string, data: { title: string; description: string; unitNumber?: number }) =>
    request<{ unit: unknown }>(`/api/admin/units/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
};
