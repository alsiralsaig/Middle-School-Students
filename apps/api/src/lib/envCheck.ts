/**
 * فحص بيئة التشغيل عند الإقلاع.
 *
 * الهدف: أن **يفشل الخادم بصوت عالٍ** إن نُشر بسرّ التطوير الافتراضي، بدل أن
 * يعمل بهدوء ويوقّع جلسات دخول بمفتاح يعرفه كل من قرأ المستودع.
 *
 * سرّ JWT الافتراضي `dev-secret-change-me-please-32chars` منشور في الكود
 * (وفي auth.ts كقيمة احتياطية). أي شخص يمكنه تزوير جلسة «مدير».
 * لذلك: الإنتاج يُمنع، والتطوير يُحذَّر فقط.
 */

const PLACEHOLDER_SECRETS = new Set([
  'dev-secret-change-me-please-32chars',
  'غير-هذا-السر-بقيمة-عشوائية-طويلة',
  'change-me',
  'secret',
  '',
]);

export interface EnvIssue {
  level: 'error' | 'warn';
  key: string;
  message: string;
}

export function checkEnv(): EnvIssue[] {
  const issues: EnvIssue[] = [];
  const isProd = (process.env.NODE_ENV || 'development') === 'production';
  const secret = process.env.JWT_SECRET || '';

  if (PLACEHOLDER_SECRETS.has(secret.trim())) {
    issues.push({
      level: isProd ? 'error' : 'warn',
      key: 'JWT_SECRET',
      message: isProd
        ? 'الخادم يعمل في وضع الإنتاج بسرّ JWT الافتراضي المنشور في المستودع. ' +
          'أي شخص يمكنه تزوير جلسة مدير. أنشئ سرّاً عشوائياً قبل النشر.'
        : 'JWT_SECRET ما زال القيمة الافتراضية. مقبول في التطوير فقط، وممنوع في الإنتاج.',
    });
  } else if (secret.length < 32) {
    issues.push({
      level: isProd ? 'error' : 'warn',
      key: 'JWT_SECRET',
      message: `طول السرّ ${secret.length} حرفاً — يُنصح بـ ٣٢ على الأقل.`,
    });
  }

  if (isProd) {
    if (!process.env.DATABASE_URL) {
      issues.push({
        level: 'error',
        key: 'DATABASE_URL',
        message: 'غير مضبوط.',
      });
    }
    if ((process.env.DATABASE_URL || '').startsWith('file:')) {
      issues.push({
        level: 'warn',
        key: 'DATABASE_URL',
        message:
          'قاعدة SQLite في الإنتاج تناسب العرض التجريبي فقط، ولا تصلح لعدة مستخدمين ' +
          'متزامنين ولا للنسخ الاحتياطي المتكرر. انتقل إلى PostgreSQL قبل الإطلاق الفعلي.',
      });
    }
    if (!process.env.CLIENT_ORIGIN) {
      issues.push({
        level: 'warn',
        key: 'CLIENT_ORIGIN',
        message: 'غير مضبوط؛ سيُسمح لأي مصدر بالوصول إلى الواجهة البرمجية.',
      });
    }
  }

  return issues;
}

/** يطبع المشكلات ويوقف الخادم إن وُجدت خطأ */
export function assertEnv(): void {
  const issues = checkEnv();
  for (const i of issues) {
    const mark = i.level === 'error' ? '❌' : '⚠️ ';
    console[ i.level === 'error' ? 'error' : 'warn'](`${mark} [env:${i.key}] ${i.message}`);
  }
  if (issues.some((i) => i.level === 'error')) {
    console.error('\n⛔ تعذّر الإقلاع: أصلح المتغيرات أعلاه ثم أعد التشغيل.\n');
    process.exit(1);
  }
}

/** يولّد سرّاً عشوائياً مناسباً — للطباعة في رسالة المساعدة */
export function suggestSecret(): string {
  const crypto = require('node:crypto') as typeof import('node:crypto');
  return crypto.randomBytes(48).toString('base64url');
}
