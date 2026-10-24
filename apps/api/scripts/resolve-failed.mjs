// مؤقت: يُصلح سجل الترحيل الفاشل 20261024010000_password_reset ثم يترك migrate deploy يكمل.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const local = path.join(here, '..', 'node_modules', '.bin', 'prisma');
const r = existsSync(local)
  ? spawnSync(local, ['migrate', 'resolve', '--rolled-back', '20261024010000_password_reset'], { stdio: 'inherit' })
  : spawnSync('npx', ['prisma', 'migrate', 'resolve', '--rolled-back', '20261024010000_password_reset'], { stdio: 'inherit' });
console.log('[resolve] exit', r.status ?? 'n/a');
