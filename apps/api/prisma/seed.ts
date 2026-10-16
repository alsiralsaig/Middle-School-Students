/**
 * تعبئة قاعدة البيانات من ملفات المحتوى المشتركة
 * التشغيل: npm run db:seed
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = path.resolve(__dirname, '../../../shared/content');
const CONTENT_FILES = [
  'arabic.json',
  'civics.json',
  'english.json',
  'ict.json',
  'islamic.json',
  'math.json',
  'science.json',
  'social.json',
];

async function main() {
  console.log('🧹 حذف البيانات القديمة…');
  await prisma.examAnswer.deleteMany();
  await prisma.examAttempt.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.plannerEvent.deleteMany();
  await prisma.studySession.deleteMany();
  await prisma.lessonRating.deleteMany();
  await prisma.lessonProgress.deleteMany();
  await prisma.examQuestion.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.user.deleteMany();

  /* ---------------- المواد ووحداتها ودروسها ---------------- */
  let subjects = 0;
  let units = 0;
  let lessons = 0;

  for (const file of CONTENT_FILES) {
    const full = path.join(CONTENT_DIR, file);
    if (!fs.existsSync(full)) {
      console.warn(`⚠️  الملف غير موجود: ${file}`);
      continue;
    }
    const subject = JSON.parse(fs.readFileSync(full, 'utf8'));

    await prisma.subject.create({
      data: {
        id: subject.id,
        name: subject.name,
        nameEn: subject.nameEn,
        code: subject.code,
        category: subject.category,
        description: subject.description,
        curriculumRef: subject.curriculumRef ?? null,
        unitsCount: subject.unitsCount ?? 0,
        lessonsCount: subject.lessonsCount ?? 0,
        official: subject.official ? JSON.stringify(subject.official) : null,
        status: 'sample',
      },
    });
    subjects++;

    for (const unit of subject.units) {
      await prisma.unit.create({
        data: {
          id: unit.id,
          subjectId: subject.id,
          unitNumber: unit.unitNumber,
          title: unit.title,
          description: unit.description,
        },
      });
      units++;

      for (const lesson of unit.lessons) {
        await prisma.lesson.create({
          data: {
            id: lesson.id,
            subjectId: subject.id,
            unitId: unit.id,
            lessonNumber: lesson.lessonNumber,
            title: lesson.title,
            durationMinutes: lesson.durationMinutes ?? 30,
            summary: lesson.summary ?? '',
            learningObjectives: JSON.stringify(lesson.learningObjectives ?? []),
            sections: JSON.stringify(lesson.sections ?? []),
            keyRules: JSON.stringify(lesson.keyRules ?? []),
            attachments: JSON.stringify(lesson.attachments ?? []),
            faq: JSON.stringify(lesson.faq ?? []),
            examTips: JSON.stringify(lesson.examTips ?? []),
            status: 'sample',
          },
        });
        lessons++;
      }
    }
  }
  console.log(`📚 المواد: ${subjects} · الوحدات: ${units} · الدروس: ${lessons}`);

  /* ---------------- المكتبة ---------------- */
  const { RESOURCES_DATA, SAMPLE_QUIZ_QUESTIONS } = await import('../../../shared/curriculum.ts');
  let resCount = 0;
  for (const r of RESOURCES_DATA as unknown as Array<Record<string, unknown>>) {
    await prisma.resource.create({
      data: {
        id: String(r.id),
        subjectId: r.subjectId ? String(r.subjectId) : null,
        title: String(r.title),
        category: String(r.category),
        fileType: String(r.fileType),
        fileSize: String(r.fileSize),
        pageCount: Number(r.pageCount ?? 0),
        author: r.author ? String(r.author) : null,
        publishYear: r.publishYear ? String(r.publishYear) : null,
        isVerifiedCurriculum: Boolean(r.isVerifiedCurriculum),
        downloadCount: Number(r.downloadCount ?? 0),
        description: String(r.description ?? ''),
        previewSummary: JSON.stringify(r.previewSummary ?? []),
        status: 'sample',
      },
    });
    resCount++;
  }
  console.log(`🗂️  المكتبة: ${resCount} ملفاً`);

  /* ---------------- اختبار تجريبي ---------------- */
  const mathSubject = await prisma.subject.findUnique({ where: { id: 'math' } });
  if (mathSubject && Array.isArray(SAMPLE_QUIZ_QUESTIONS) && SAMPLE_QUIZ_QUESTIONS.length) {
    const exam = await prisma.exam.create({
      data: { subjectId: 'math', title: 'اختبار تجريبي — الرياضيات', durationMinutes: 30, status: 'sample' },
    });
    for (const q of SAMPLE_QUIZ_QUESTIONS) {
      await prisma.examQuestion.create({
        data: {
          examId: exam.id,
          question: String(q.question),
          options: JSON.stringify(q.options ?? []),
          correctIndex: Number(q.correctIndex ?? 0),
          explanation: q.explanation ? String(q.explanation) : null,
        },
      });
    }
    console.log(`📝 اختبار تجريبي بـ ${SAMPLE_QUIZ_QUESTIONS.length} سؤالاً`);
  }

  /* ---------------- حسابات تجريبية ---------------- */
  const adminHash = await bcrypt.hash('admin12345', 10);
  const studentHash = await bcrypt.hash('student123', 10);

  await prisma.user.create({
    data: {
      name: 'مدير المنصة',
      phone: '1000000000',
      passwordHash: adminHash,
      role: 'admin',
      school: 'الإدارة العامة للمنصة',
    },
  });

  const student = await prisma.user.create({
    data: {
      name: 'طالب تجريبي',
      phone: '900000000',
      passwordHash: studentHash,
      role: 'student',
      grade: 'الثالث المتوسط',
      school: 'مدرسة النور الأساسية',
      state: 'الخرطوم',
    },
  });

  const first = await prisma.lesson.findFirst();
  if (first) {
    await prisma.lessonProgress.create({
      data: { userId: student.id, lessonId: first.id, completed: true, secondsSpent: 1500 },
    });
  }

  console.log('👤 حسابات تجريبية:');
  console.log('   مدير  → الهاتف 1000000000 · كلمة المرور admin12345');
  console.log('   طالب  → الهاتف 900000000  · كلمة المرور student123');
  console.log('\n✅ تمت التعبئة بنجاح — كل المحتوى موسوم بـ "sample" حتى يُراجَع.');
}

main()
  .catch((e) => {
    console.error('❌ فشلت التعبئة:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
