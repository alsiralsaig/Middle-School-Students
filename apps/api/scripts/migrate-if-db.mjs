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

/**
 * إعادة المحاولة عند تعارض قفل Prisma.
 *
 * Prisma يستخدم advisory lock في Postgres حتى لا يتزاحم ترحيلان. عند نشرين
 * متتاليين (أو نشر Vercel مع تشغيل يدوي) ينتظر الثاني ١٠ ثوانٍ ثم يفشل بـP1002
 * — وهو **ليس خطأ ترحيل**، بل انتظار قفل. لذلك نعيد المحاولة بدل إسقاط البناء.
 */
const MAX_ATTEMPTS = 4;

function runOnce() {
  const out = spawnSync(command, args, { encoding: 'utf8', env: process.env });
  const text = `${out.stdout || ''}${out.stderr || ''}`;
  process.stdout.write(text);
  return { status: out.status ?? 1, text };
}

let attempt = 0;
let last = { status: 1, text: '' };

while (attempt < MAX_ATTEMPTS) {
  attempt += 1;
  last = runOnce();
  if (last.status === 0) break;

  const lockBusy = last.text.includes('P1002') || last.text.includes('advisory lock');
  if (!lockBusy || attempt === MAX_ATTEMPTS) break;

  const waitMs = 5000 * attempt; // ٥ ثم ١٠ ثم ١٥ ثانية
  console.warn(`[migrate] القاعدة مشغولة بترحيل آخر (قفل) — إعادة المحاولة بعد ${waitMs / 1000} ثانية…`);
  spawnSync('sleep', [String(waitMs / 1000)]);
}

if (last.status !== 0) {
  console.error('[migrate] فشل الترحيل — تم إيقاف البناء حتى لا يُنشر كود لا يطابق قاعدة البيانات.');
  process.exit(last.status);
}

console.log(`[migrate] الترحيلات مطبّقة وناجحة.${attempt > 1 ? ` (بعد ${attempt} محاولات)` : ''}`);
