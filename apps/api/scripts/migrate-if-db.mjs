/**
 * يطبّق ترحيلات Prisma أثناء البناء على Vercel، قبل نشر الكود الجديد.
 *
 * لماذا هنا: Vercel يبني أولاً ثم ينشر. فلو الترحيل جرى في البناء، تصبح القاعدة
 * جاهزة قبل أن يبدأ الكود الجديد بخدمة الطلبات — والعكس يعني 500 لكل مستخدم.
 *
 * السلوك:
 *  - DATABASE_URL غير موجود في بيئة البناء → يُتخطّى الترحيل مع تحذير (البناء ينجح).
 *  - موجود → ينفّذ `prisma migrate deploy`، وأي فشل يُفشِل البناء
 *    (فتبقى النسخة القديمة تعمل بدل نشر كود لا يطابق قاعدة البيانات).
 *
 * التشغيل محلياً غير مطلوب: npm run db:migrate يقوم بالمهمة.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// نستخدم نسخة prisma المثبّتة في المشروع (وليس آخر إصدار من npm)
const here = path.dirname(fileURLToPath(import.meta.url));
const localPrisma = path.join(here, '..', 'node_modules', '.bin', 'prisma');
const command = existsSync(localPrisma) ? localPrisma : 'npx';
const args = existsSync(localPrisma) ? ['migrate', 'deploy'] : ['prisma', 'migrate', 'deploy'];

const url = process.env.DATABASE_URL;

if (!url) {
  console.warn('[migrate] تخطّي الترحيل: DATABASE_URL غير متاح في بيئة البناء.');
  process.exit(0);
}

const host = (() => {
  try {
    return new URL(url).hostname;
  } catch {
    return 'غير معروف';
  }
})();
console.log(`[migrate] تطبيق الترحيلات على ${host} ...`);

const result = spawnSync(command, args, {
  stdio: 'inherit',
  env: process.env,
});

if (result.status !== 0) {
  console.error('[migrate] فشل الترحيل — تم إيقاف البناء حتى لا يُنشر كود لا يطابق قاعدة البيانات.');
  process.exit(result.status ?? 1);
}

console.log('[migrate] الترحيلات مطبّقة وناجحة.');
