#!/usr/bin/env node
/**
 * تشغيل التطبيقين معاً: الطالب (المنفذ 3000) + الإدارة (المنفذ 4000).
 * الاستخدام: npm run dev:all
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const apps = [
  { name: 'الطالب', dir: 'apps/student', cmd: 'npm', args: ['run', 'dev'], color: '\x1b[36m' },
  { name: 'الإدارة', dir: 'apps/admin', cmd: 'npm', args: ['run', 'dev'], color: '\x1b[35m' },
];

const reset = '\x1b[0m';
const children = [];

function pipe(child, app) {
  const tag = `${app.color}[${app.name}]${reset} `;
  const write = (chunk) => {
    for (const line of chunk.toString().split('\n')) {
      if (line.trim()) process.stdout.write(tag + line + '\n');
    }
  };
  child.stdout.on('data', write);
  child.stderr.on('data', write);
}

for (const app of apps) {
  const child = spawn(app.cmd, app.args, {
    cwd: path.join(root, app.dir),
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  pipe(child, app);
  child.on('exit', (code) => {
    console.log(`${app.color}[${app.name}]${reset} توقّف (رمز الخروج ${code})`);
    shutdown(code ?? 0);
  });
  children.push(child);
}

let shuttingDown = false;
function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const c of children) {
    try {
      c.kill('SIGTERM');
    } catch {
      /* لا شيء */
    }
  }
  setTimeout(() => process.exit(code), 300);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

console.log('\x1b[1mتطبيق الطالب: http://localhost:3000   |   تطبيق الإدارة: http://localhost:4000\x1b[0m\n');
