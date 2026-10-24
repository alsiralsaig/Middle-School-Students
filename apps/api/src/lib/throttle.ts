/**
 * حدّ بسيط لمحاولات الدخول الفاشلة — في ذاكرة العملية.
 *
 * لماذا: الرقم السري للطلاب من ٤ أرقام، أي ١٠٠٠٠ احتمال فقط. بلا حدّ،
 * يقدر أي شخص يجرّب كل الاحتمالات في دقائق ويفتح حساب طالب.
 *
 * ملاحظة: Vercel يشغّل أكثر من نسخة، فالعدّاد ليس مشتركاً بينها — لا يزال
 * يمنع التخمين المتواصل من نفس المصدر، وهو المطلوب هنا.
 */
type Entry = { count: number; firstAt: number };

const WINDOW_MS = 10 * 60 * 1000; // ١٠ دقائق
const MAX_FAILS = 8; // بعدها نرفض مؤقتاً

const store = new Map<string, Entry>();

function fresh(key: string): Entry {
  const now = Date.now();
  const cur = store.get(key);
  if (!cur || now - cur.firstAt > WINDOW_MS) {
    const entry = { count: 0, firstAt: now };
    store.set(key, entry);
    return entry;
  }
  return cur;
}

/** هل تجاوز هذا المفتاح الحدّ؟ */
export function isBlocked(key: string): boolean {
  return fresh(key).count >= MAX_FAILS;
}

/** كم ثانية باقية قبل أن يُسمح بالمحاولة مرة أخرى */
export function retryAfterSeconds(key: string): number {
  const entry = fresh(key);
  const left = WINDOW_MS - (Date.now() - entry.firstAt);
  return Math.max(1, Math.ceil(left / 1000));
}

/** تسجيل محاولة فاشلة */
export function recordFail(key: string): void {
  const entry = fresh(key);
  entry.count += 1;
}

/** نجاح الدخول يمسح العدّاد */
export function clearFails(key: string): void {
  store.delete(key);
}
