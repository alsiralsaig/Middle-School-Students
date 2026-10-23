import { useSyncExternalStore } from 'react';
import type { Subject } from '@shared/curriculumTypes';
import { api } from '../utils/apiClient';

/**
 * بيانات المنهج — **قاعدة البيانات هي المصدر، لا الملفات**.
 *
 * لماذا هذا التغيير: كان المنهج يعيش في ملفات JSON مضمّنة داخل التطبيق،
 * فصارت قاعدة البيانات مهمّشة والإدارة عاجزة عن تعديل أي درس. الآن:
 *
 *   ١. يُطلب المنهج من الخادم (`GET /api/subjects`) وهي تقرأ من قاعدة البيانات
 *   ٢. تُحفظ النسخة في `localStorage` فيبقى التطبيق يعمل **دون اتصال**
 *   ٣. إن لم توجد نسخة محفوظة قط، يُرجَع إلى الملفات المضمّنة كملاذ أخير
 *
 * بهذا يصبح ما تعدّله الإدارة مرئياً للطلاب فوراً، مع بقاء العمل دون اتصال.
 */

/* التصديرات الثابتة من الحزمة المشتركة (مصادر، مساعدات…) */
export * from '@shared/curriculum';

const CACHE_KEY = 'ssp.curriculum.v1';

function readCache(): Subject[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? (parsed as Subject[]) : null;
  } catch {
    return null;
  }
}

function writeCache(subjects: Subject[]): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(subjects));
  } catch {
    /* امتلاء التخزين ليس سبباً لإفشال التطبيق */
  }
}

/**
 * الحالة الحالية. الذاكرة المحفوظة أولاً، وإذا لم توجد (أول زيارة) نبدأ
 * فارغين ثم نجلب المنهج من الخادم. النسخة المضمَّنة (٥٨٠ كيلوبايت) تُحمَّل
 * **عند الحاجة فقط** عبر `import()` فتبقى خارج الحزمة الأساسية.
 */
let current: Subject[] = readCache() ?? [];
let lastSync: string | null = null;
let online = false;

const listeners = new Set<() => void>();
const emit = (): void => listeners.forEach((fn) => fn());

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export const getSubjects = (): Subject[] => current;
export const isCurriculumOnline = (): boolean => online;
export const getLastSync = (): string | null => lastSync;

/**
 * يجلب المنهج من قاعدة البيانات ويحدّث المخزن.
 * لا يرمي خطأ — الفشل يعني البقاء على النسخة المحفوظة.
 */
/** النسخة المضمَّنة — حزمة منفصلة تُطلب فقط عند تعذّر الوصول للخادم. */
let bundledPromise: Promise<Subject[]> | null = null;
async function loadBundled(): Promise<Subject[]> {
  if (!bundledPromise) {
    bundledPromise = import('@shared/contentData')
      .then((m) => m.SUBJECTS_DATA as Subject[])
      .catch(() => [] as Subject[]);
  }
  return bundledPromise;
}

export async function refreshCurriculum(): Promise<Subject[]> {
  // أول زيارة بلا نسخة محفوظة: نكسب الوقت بعرض المضمَّن فوراً إن لزم.
  if (current.length === 0) {
    const local = readCache();
    if (local) {
      current = local;
      emit();
    }
  }
  try {
    const { subjects } = await api.subjects();
    if (subjects && subjects.length > 0) {
      current = subjects;
      lastSync = new Date().toISOString();
      online = true;
      writeCache(subjects);
      emit();
    }
  } catch {
    online = false;
    /* دون اتصال: النسخة المحفوظة، وإن لم توجد نحمّل النسخة المضمَّنة */
    if (current.length === 0) {
      const fallback = await loadBundled();
      if (fallback.length > 0) {
        current = fallback;
        emit();
      }
    }
  }
  return current;
}

/** يمحو النسخة المحفوظة ويعيد التحميل من الخادم */
export async function resetCurriculumCache(): Promise<Subject[]> {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    /* تجاهل */
  }
  return refreshCurriculum();
}

/**
 * الخطاف الذي تستخدمه الشاشات: يعيد المنهج الحالي ويعيد الرسم عند تحديثه.
 * `useSyncExternalStore` يضمن الاتساق مع التحديثات المتزامنة.
 */
export function useSubjects(): Subject[] {
  return useSyncExternalStore(subscribe, getSubjects, getSubjects);
}
