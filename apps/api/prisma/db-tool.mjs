#!/usr/bin/env node
/**
 * أداة النسخ الاحتياطي والاستعادة لقاعدة البيانات.
 *
 *   node prisma/db-tool.mjs backup  [اسم]
 *   node prisma/db-tool.mjs restore <الملف>
 *   node prisma/db-tool.mjs list
 *
 * لماذا موجودة أصلاً:
 *   بيئة التطوير تُصفَّر فيها مجلدات مثل node_modules بين الجلسات، وقد رأينا
 *   ملفات تُرجَع إلى حالات أقدم. قاعدة البيانات في `prisma/dev.db` داخل مساحة
 *   العمل معرَّضة للشيء نفسه. نسخة مؤرَّخة تعني أن أي تلف يُرجَع عنه بدل
 *   إعادة التعبئة من الصفر.
 *
 * SQLite:   VACUUM INTO عبر sqlite3 إن وُجد، وإلا عبر عميل Prisma، وإلا نسخ
 *           عادي مع فحص سلامة.
 * PostgreSQL: pg_dump / pg_restore إن وُجدا، وإلا رسالة واضحة.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BACKUP_DIR = path.join(HERE, 'backups');

/** يقرأ .env يدوياً حتى لا تعتمد الأداة على dotenv */
function readEnv() {
  const file = path.join(HERE, '..', '.env');
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = /^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

const env = { ...readEnv(), ...process.env };
const url = env.DATABASE_URL || 'file:./dev.db';
const isSqlite = url.startsWith('file:');

function dbPath() {
  // "file:./dev.db" و "file:dev.db" و "file:/abs/dev.db"
  const raw = url.replace(/^file:/, '');
  return path.isAbsolute(raw) ? raw : path.resolve(HERE, raw);
}

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function has(cmd) {
  try {
    execFileSync('which', [cmd], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

async function prismaClient() {
  const { PrismaClient } = await import('@prisma/client');
  const c = new PrismaClient({ datasources: { db: { url } } });
  return c;
}

async function runSqliteSql(file, sql) {
  if (has('sqlite3')) {
    execFileSync('sqlite3', [file, sql], { stdio: 'inherit' });
    return 'sqlite3';
  }
  const c = await prismaClient();
  try {
    // queryRawUnsafe لا executeRawUnsafe: جمل مثل PRAGMA تُرجع صفوفاً،
    // و executeRawUnsafe يرفض أي استعلام يُرجع نتائج في SQLite.
    await c.$queryRawUnsafe(sql);
    return 'prisma';
  } finally {
    await c.$disconnect();
  }
}

async function backup(name) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const tag = name || stamp();

  if (isSqlite) {
    const src = dbPath();
    if (!fs.existsSync(src)) {
      console.error(`❌ قاعدة البيانات غير موجودة: ${src}`);
      process.exit(1);
    }
    const dest = path.join(BACKUP_DIR, `dev-${tag}.db`);
    fs.rmSync(dest, { force: true });
    const how = await runSqliteSql(src, `VACUUM INTO '${dest.replace(/'/g, "''")}'`);
    if (!fs.existsSync(dest)) {
      // لم ينجح VACUUM (بعض الإصدارات ترفضه داخل معاملة) → نسخ عادي
      fs.copyFileSync(src, dest);
      console.log('ℹ️  تعذّر VACUUM INTO، فاستُخدم نسخ عادي للملف.');
    }
    const kb = Math.round(fs.statSync(dest).size / 1024);
    console.log(`✅ نُسخ احتياطياً (عبر ${how}) → prisma/backups/${path.basename(dest)} (${kb} كيلوبايت)`);
    pruneBackups();
    return dest;
  }

  if (!has('pg_dump')) {
    console.error('❌ pg_dump غير مثبّت. ثبّته أو انسخ قاعدة PostgreSQL يدوياً.');
    process.exit(1);
  }
  const dest = path.join(BACKUP_DIR, `pg-${tag}.dump`);
  execFileSync('pg_dump', ['--format=custom', '--file', dest, url], { stdio: 'inherit' });
  console.log(`✅ نُسخ احتياطياً → ${dest}`);
}

async function restore(file) {
  const target = path.isAbsolute(file) ? file : path.join(BACKUP_DIR, file);
  if (!fs.existsSync(target)) {
    console.error(`❌ الملف غير موجود: ${target}`);
    list();
    process.exit(1);
  }

  if (isSqlite) {
    const dest = dbPath();
    const tmp = `${dest}.restoring`;
    fs.rmSync(tmp, { force: true });
    fs.copyFileSync(target, tmp);
    // فحص السلامة قبل استبدال القاعدة الحالية
    await runSqliteSql(tmp, 'PRAGMA integrity_check');
    fs.rmSync(`${dest}-journal`, { force: true });
    fs.rmSync(dest, { force: true });
    fs.renameSync(tmp, dest);
    console.log(`✅ استُعيدت القاعدة من ${path.basename(target)}`);
    console.log('   شغّل «npm run db:seed» إن أردت إعادة تعبئة البيانات التجريبية.');
    return;
  }

  if (!has('pg_restore')) {
    console.error('❌ pg_restore غير مثبّت.');
    process.exit(1);
  }
  execFileSync('pg_restore', ['--clean', '--if-exists', '--dbname', url, target], {
    stdio: 'inherit',
  });
  console.log(`✅ استُعيدت القاعدة من ${path.basename(target)}`);
}

/** يُبقي آخر ١٠ نسخ فقط حتى لا تنفجر مساحة العمل */
function pruneBackups(keep = 10) {
  const files = fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.endsWith('.db') || f.endsWith('.dump'))
    .map((f) => ({ f, t: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  for (const { f } of files.slice(keep)) {
    fs.rmSync(path.join(BACKUP_DIR, f));
    console.log(`🗑️  حُذفت نسخة قديمة: ${f}`);
  }
}

function list() {
  if (!fs.existsSync(BACKUP_DIR)) return void console.log('لا توجد نسخ احتياطية بعد.');
  const files = fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.endsWith('.db') || f.endsWith('.dump'))
    .sort();
  if (!files.length) return void console.log('لا توجد نسخ احتياطية بعد.');
  console.log('النسخ الاحتياطية المتاحة:');
  for (const f of files) {
    const kb = Math.round(fs.statSync(path.join(BACKUP_DIR, f)).size / 1024);
    console.log(`  - ${f} (${kb} كيلوبايت)`);
  }
}

const [, , cmd, arg] = process.argv;
const commands = { backup, restore, list };
if (!cmd || !commands[cmd]) {
  console.log(
    'الاستعمال:\n  node prisma/db-tool.mjs backup  [اسم]\n' +
      '  node prisma/db-tool.mjs restore <ملف>\n  node prisma/db-tool.mjs list'
  );
  process.exit(1);
}
await commands[cmd](arg);
