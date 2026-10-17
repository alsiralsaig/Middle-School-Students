/**
 * عنوان الخادم — قابل للضبط من داخل التطبيق.
 *
 * لماذا هذا الملف؟
 * حزمة APK تُبنى مرة واحدة، لكن عنوان الخادم لا يُعرف إلا بعد النشر.
 * لو حُفظ العنوان داخل البناء (VITE_API_URL فقط) لاحتجنا إلى إعادة بناء
 * الحزمة وإعادة تحميلها كلما تغيّر العنوان — وهذا غير عملي.
 *
 * الحل: يُحفظ العنوان في تخزين الجهاز، ويُقرأ عند كل طلب. فيمكن للمستخدم
 * ضبطه مرة واحدة من داخل التطبيق، ويبقى محفوظاً.
 *
 * ترتيب القراءة:
 *   ١. ما حفظه المستخدم (تخزين الجهاز)
 *   ٢. المتغيّر VITE_API_URL (يُضبط عند البناء)
 *   ٣. المسار النسبي `/backend` (يعمل في التطوير عبر وكيل Vite)
 */

const KEY = 'ssp.apiBaseUrl';

/** يزيل المسافات والشرطات المائلة الزائدة من آخر العنوان */
function normalize(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

/** العنوان الحالي الفعلي */
export function getApiBase(): string {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved && saved.trim()) return normalize(saved);
  } catch {
    /* التخزين قد يكون محجوباً — نتجاهل ونكمل */
  }
  return normalize(
    (import.meta.env.VITE_API_URL as string | undefined) || '/backend',
  );
}

/** حفظ عنوان جديد. إعطاء قيمة فارغة يعيد العنوان إلى الافتراضي */
export function setApiBase(url: string): void {
  try {
    const value = normalize(url);
    if (value) localStorage.setItem(KEY, value);
    else localStorage.removeItem(KEY);
  } catch {
    /* لا شيء نفعله إن كان التخزين محجوباً */
  }
}

/** الرجوع إلى العنوان الافتراضي (يمحو ما حفظه المستخدم) */
export function clearApiBase(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* لا شيء */
  }
}

/** هل ضبط المستخدم عنواناً بنفسه؟ */
export function hasCustomApiBase(): boolean {
  try {
    return !!localStorage.getItem(KEY);
  } catch {
    return false;
  }
}

/** العنوان الافتراضي (ما سيُستخدم لو محا المستخدم ضبطه) */
export function getDefaultApiBase(): string {
  return normalize(
    (import.meta.env.VITE_API_URL as string | undefined) || '/backend',
  );
}
