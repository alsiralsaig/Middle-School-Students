#!/usr/bin/env node
/**
 * import-library — استيراد المكتبة النصية إلى قاعدة البيانات من سطر الأوامر.
 *
 * نفس ما يفعله زر «استيراد المكتبة النصية» في لوحة الإدارة، لكن بلا متصفح:
 * يقرأ prisma/data/library.json ثم يُنشئ/يحدّث عناصر Resource بمعرّفات ثابتة.
 *
 * العناصر تُنشأ **غير منشورة** افتراضياً حتى تعتمدها الإدارة من اللوحة.
 * لنشرها فوراً:  node prisma/import-library.mjs --publish
 */
import { readFile } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const publish = process.argv.includes('--publish');

const norm = (v) => String(v).replace(/[إأآ]/g, 'ا').replace(/\s+/g, ' ').trim();

async function main() {
  const file = new URL('./data/library.json', import.meta.url);
  const { items } = JSON.parse(await readFile(file, 'utf8'));
  const subjects = await prisma.subject.findMany({ select: { id: true, name: true } });
  const subjectIdFor = (name) => {
    if (!name) return null;
    const target = norm(name);
    const exact = subjects.find((s) => norm(s.name) === target);
    if (exact) return exact.id;
    const loose = subjects.find((s) => norm(s.name).includes(target) || target.includes(norm(s.name)));
    return loose ? loose.id : null;
  };

  let created = 0;
  let updated = 0;
  for (const item of items) {
    const data = {
      title: item.title.slice(0, 200),
      category: item.category || 'notes',
      description: (item.description || '').slice(0, 600),
      subjectId: subjectIdFor(item.subject),
      body: item.body ?? null,
      externalUrl: item.externalUrl ?? null,
      sourceUrl: item.sourceUrl ?? null,
      fileType: item.externalUrl ? 'LINK' : 'TXT',
      fileSize: item.fileSize || '—',
      pageCount: item.pageCount ?? 0,
      sortOrder: item.sortOrder ?? 0,
      isPublished: publish,
      publishedAt: publish ? new Date() : null,
      status: 'imported',
    };
    const exists = await prisma.resource.findUnique({ where: { id: item.id }, select: { id: true } });
    if (exists) {
      // إعادة الاستيراد لا تلمس قرار النشر — إلا إن طُلب --publish صراحةً
      const { isPublished: _p, publishedAt: _d, ...rest } = data;
      void _p; void _d;
      await prisma.resource.update({ where: { id: item.id }, data: publish ? data : rest });
      updated += 1;
    } else {
      await prisma.resource.create({ data: { id: item.id, ...data } });
      created += 1;
    }
  }
  const total = await prisma.resource.count();
  console.log(
    `المكتبة: ${created} جديد · ${updated} محدَّث · ${publish ? 'منشورة' : 'غير منشورة (بانتظار اعتماد الإدارة)'} · ` +
    `إجمالي عناصر المكتبة في القاعدة ${total}`,
  );
}

main()
  .catch((error) => {
    console.error('فشل الاستيراد:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
