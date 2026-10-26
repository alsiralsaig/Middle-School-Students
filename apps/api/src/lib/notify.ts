/**
 * تنبيهات الإدارة عبر ntfy.
 *
 * ليه ntfy: تيليجرام صار يطلب رسوماً على بعض الدول (السودان منها) عند تسجيل
 * الدخول، والدفع غير متاح بلا بطاقة. وntfy يعمل بلا حساب ولا اشتراك ولا
 * كارت: اسم قناة فقط، ويوصل التنبيه على الجوال في ثانية.
 *
 * كل التنبيهات «أطلق وانسَ»: فشل التنبيه لا يجوز أن يفشل العملية الأصلية
 * (تسجيل طالب، رفع ملف…). لذلك لا ننتظر النتيجة ولا نرمي استثناءً.
 */

/** اسم القناة — سرّي نسبياً: من يعرفه يستطيع النشر فيه، فلا يُطبع في الواجهة */
const DEFAULT_TOPIC = 'ssp-alerts-kh9f3x2q';

function topic(): string {
  return (process.env.NTFY_TOPIC || DEFAULT_TOPIC).trim();
}

function server(): string {
  return (process.env.NTFY_SERVER || 'https://ntfy.sh').replace(/\/+$/, '');
}

export type NotifyLevel = 'info' | 'success' | 'warn' | 'error';

const TAGS: Record<NotifyLevel, string> = {
  info: 'information_source',
  success: 'white_check_mark',
  warn: 'warning',
  error: 'rotating_light',
};

const PRIORITY: Record<NotifyLevel, number> = { info: 3, success: 3, warn: 4, error: 5 };

/** إرسال تنبيه — لا يرمي استثناءً أبداً */
export async function notifyAdmin(title: string, message: string, level: NotifyLevel = 'info'): Promise<void> {
  const t = topic();
  if (!t) return;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    /*
     * النشر عبر JSON لا عبر الترويسات.
     * السبب: Node's fetch يرفض أي حرف عربي داخل قيمة ترويسة
     * («Cannot convert argument to a ByteString»)، وكان الحل السابق
     * encodeURIComponent فأصبح العنوان يظهر للمستخدم مشفّراً
     * (%D8%AA%D8%AC…). الـJSON يقبل UTF-8 كما هو.
     */
    await fetch(`${server()}/`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        topic: t,
        title,
        message,
        priority: PRIORITY[level],
        tags: [TAGS[level]],
      }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));
  } catch (e) {
    // التنبيه رفاهية — لا نُسقط أي عملية لأجله
    console.warn('notify failed:', e instanceof Error ? e.message : e);
  }
}

/** نسخة لا تُنتظر — للاستخدام داخل المسارات */
export function notifyAdminSoon(title: string, message: string, level: NotifyLevel = 'info'): void {
  void notifyAdmin(title, message, level);
}
