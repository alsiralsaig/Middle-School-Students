#!/usr/bin/env node
/**
 * فاحص محتوى المنهج — يتأكد إن كل ملفات src/content/*.json سليمة قبل البناء.
 *
 * التشغيل:  npm run content:check
 * الخروج:   0 = تمام · 1 = فيه أخطاء لازم تتصلح
 *
 * ليه مهم؟ لأن المحتوى بقى ملفات JSON يعدّلها أي شخص، فأي حقل ناقص
 * (مثل keyRules) بيطلّع شاشة بيضاء للطالب. الفاحص يمسك الخطأ قبلها.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dir = resolve(root, 'src/content');

/** الحقول المطلوبة في كل درس — ونوعها */
const REQUIRED = {
  id: 'string',
  lessonNumber: 'number',
  title: 'string',
  durationMinutes: 'number',
  summary: 'string',
  learningObjectives: 'array',
  sections: 'array',
  keyRules: 'array',
  attachments: 'array',
  faq: 'array',
  examTips: 'array',
};

const errors = [];
const warnings = [];
const seenLessonIds = new Set();

const files = readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'index.json').sort();

if (files.length === 0) {
  console.error('❌ ما فيش أي ملف محتوى في src/content/');
  process.exit(1);
}

let totalUnits = 0;
let totalLessons = 0;

for (const file of files) {
  let data;
  try {
    data = JSON.parse(readFileSync(resolve(dir, file), 'utf-8'));
  } catch (e) {
    errors.push(`${file}: ملف JSON غير صالح — ${e.message}`);
    continue;
  }

  if (!data.id || !data.name) {
    errors.push(`${file}: لازم يحتوي id و name`);
    continue;
  }

  const units = data.units || [];
  if (units.length === 0) warnings.push(`${data.name}: ما فيهاش أي وحدة`);

  units.forEach((u, ui) => {
    if (!u.id) errors.push(`${file} → الوحدة ${ui + 1}: ناقص id`);
    if (!u.title) errors.push(`${file} → الوحدة ${u.id || ui + 1}: ناقص title`);
    if (!Array.isArray(u.lessons)) {
      errors.push(`${file} → الوحدة ${u.id}: lessons لازم تكون مصفوفة`);
      return;
    }
    if (u.lessons.length === 0) warnings.push(`${data.name} → ${u.title}: وحدة بلا دروس`);

    u.lessons.forEach((l, li) => {
      for (const [field, type] of Object.entries(REQUIRED)) {
        const v = l?.[field];
        const ok =
          type === 'array' ? Array.isArray(v) : typeof v === type && (type !== 'string' || v.trim());
        if (!ok) {
          errors.push(`${file} → ${l?.id || `درس ${li + 1}`}: الحقل "${field}" ناقص أو غير صالح`);
        }
      }
      if (l?.id) {
        if (seenLessonIds.has(l.id)) errors.push(`${file}: معرّف مكرر "${l.id}"`);
        seenLessonIds.add(l.id);
      }
      if (typeof l?.lessonNumber === 'number' && l.lessonNumber !== li + 1) {
        warnings.push(`${file} → ${l.id}: رقم الدرس ${l.lessonNumber} بس ترتيبه في الملف ${li + 1}`);
      }
      totalLessons++;
    });
    totalUnits++;
  });

  // مقارنة المعلن بالفعلي
  const actualUnits = units.length;
  const actualLessons = units.reduce((a, u) => a + (u.lessons?.length || 0), 0);
  if (data.unitsCount && data.unitsCount !== actualUnits)
    warnings.push(
      `${data.name}: المعلن ${data.unitsCount} وحدة لكن الفعلي ${actualUnits} — حدّث unitsCount`
    );
  if (data.lessonsCount && data.lessonsCount !== actualLessons)
    warnings.push(
      `${data.name}: المعلن ${data.lessonsCount} درس لكن الفعلي ${actualLessons} — حدّث lessonsCount`
    );
}

/* ============================== التقرير ============================== */
console.log('════════════ فحص محتوى المنهج ════════════');
console.log(`📚 المواد: ${files.length} | الوحدات: ${totalUnits} | الدروس: ${totalLessons}`);
console.log('');

if (warnings.length) {
  console.log(`⚠️  تنبيهات (${warnings.length}):`);
  warnings.slice(0, 20).forEach((w) => console.log('   • ' + w));
  console.log('');
}

if (errors.length) {
  console.log(`❌ أخطاء لازم تتصلح (${errors.length}):`);
  errors.slice(0, 30).forEach((e) => console.log('   • ' + e));
  console.log('\n💡 راجع CONTENT_GUIDE.md لمعرفة شكل الدرس الصحيح');
  process.exit(1);
}

console.log('✅ المحتوى سليم — كل الدروس مكتملة الحقول');
process.exit(0);
