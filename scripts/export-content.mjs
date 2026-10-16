/**
 * يقرأ بيانات المنهج الحالية من src/data/curriculumData.ts ويكتبها كملفات JSON
 * (ملف لكل مادة) داخل src/content/ — عشان إضافة الدروس تبقى تعديل JSON بسيط
 * بدل الغوص في ملف TypeScript بـ 954 سطر.
 *
 * التشغيل: node scripts/export-content.mjs
 */
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

// tsx يخلّينا نستورد ملف TS مباشرة
const { register } = await import('node:module');
const tsx = await import('tsx/esm/api');
tsx.register();

const mod = await import(resolve(root, 'apps/student/src/data/curriculumData.ts'));
const subjects = mod.SUBJECTS_DATA;

const dir = resolve(root, 'shared/content');
mkdirSync(dir, { recursive: true });

let units = 0;
let lessons = 0;

for (const s of subjects) {
  // نفصل الوحدات (البيانات الثابتة) عن الدروس (المحتوى المتغيّر)
  const { units: _units, ...meta } = s;
  const payload = {
    ...meta,
    // ننشر كل الحقول (keyRules, attachments, faq, examTips...) بدل القايمة اليدوية
    // حتى ما نفقدش أي حقل لما يتعدّل نوع Lesson مستقبلاً
    units: (s.units ?? []).map((u) => {
      const { lessons: _l, ...unitMeta } = u;
      return {
        ...unitMeta,
        lessons: (u.lessons ?? []).map((l) => ({ ...l })),
      };
    }),
  };
  units += payload.units.length;
  lessons += payload.units.reduce((a, u) => a + u.lessons.length, 0);
  writeFileSync(
    resolve(dir, `${s.id}.json`),
    JSON.stringify(payload, null, 2) + '\n',
    'utf-8'
  );
  console.log(`✅ ${s.id}.json — ${payload.units.length} وحدات / ${payload.units.reduce((a, u) => a + u.lessons.length, 0)} دروس`);
}

writeFileSync(
  resolve(dir, 'index.json'),
  JSON.stringify(
    subjects.map((s) => ({
      id: s.id,
      name: s.name,
      icon: s.icon ?? '📘',
      color: s.color ?? 'indigo',
      totalHours: s.totalHours ?? null,
      description: s.description ?? '',
    })),
    null,
    2
  ) + '\n',
  'utf-8'
);
console.log(`\n📦 الإجمالي: ${subjects.length} مادة | ${units} وحدة | ${lessons} درس`);
