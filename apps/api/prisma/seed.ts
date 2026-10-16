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
        // ⚠️ `syllabus` = الهيكل **الرسمي** من الكتاب. `units` أدناه = **ما ألّفناه نحن**.
        // الرقمان مختلفان قصداً (العلوم: ٧ وحدات رسمية مقابل وحدتين مؤلَّفتين).
        syllabus: subject.syllabus ? JSON.stringify(subject.syllabus) : null,
        gradeWarning: subject.gradeWarning ?? null,
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

  const allLessons = await prisma.lesson.findMany({ orderBy: { id: 'asc' } });
  if (allLessons.length) {
    await prisma.lessonProgress.create({
      data: { userId: student.id, lessonId: allLessons[0].id, completed: true, secondsSpent: 1500 },
    });
  }

  /* ──────────────────────────────────────────────────────────────────────
     بيانات تشغيلية تجريبية — كانت الجداول الستة التالية فارغة تماماً،
     فتبدو لوحات «سجل المذاكرة» و«التقييمات» و«المخطط» و«التنبيهات» و
     «نتائج الاختبارات» بلا أي شيء. كل ما يُنشأ هنا موسوم بأنه تجريبي.
     ────────────────────────────────────────────────────────────────────── */

  // ١. تقدّم الدروس: أول خمسة دروس مكتملة بدرجات زمن مختلفة
  for (const [i, l] of allLessons.slice(0, 5).entries()) {
    await prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId: student.id, lessonId: l.id } },
      update: {},
      create: {
        userId: student.id,
        lessonId: l.id,
        completed: i < 4,
        bookmarked: i === 1 || i === 4,
        secondsSpent: 900 + i * 420,
      },
    });
  }

  // ٢. جلسات مذاكرة على آخر ١٤ يوماً — يملأ رسم التقدّم الأسبوعي
  const dayKey = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() - offset);
    return d.toISOString().slice(0, 10);
  };
  const minutesPattern = [45, 30, 60, 0, 25, 90, 40, 0, 55, 35, 70, 20, 0, 50];
  await prisma.studySession.deleteMany({ where: { userId: student.id } });
  for (const [i, minutes] of minutesPattern.entries()) {
    if (!minutes) continue; // أيام راحة مقصودة حتى يبدو الرسم واقعياً
    await prisma.studySession.create({
      data: { userId: student.id, day: dayKey(13 - i), minutes },
    });
  }

  // ٣. تقييمات الدروس (unique على userId+lessonId → تقييم واحد لكل درس)
  const ratings = [
    { r: 5, c: 'الشرح واضح والأمثلة قريبة من أسئلة الامتحان.' },
    { r: 4, c: 'ممتاز، لكن أريد تمارين أكثر على القواعد.' },
    { r: 5, c: null },
    { r: 3, c: 'محتوى جيد، والصور تحتاج تكبيراً على الجوال.' },
    { r: 4, c: null },
  ];
  for (const [i, l] of allLessons.slice(0, 5).entries()) {
    await prisma.lessonRating.upsert({
      where: { userId_lessonId: { userId: student.id, lessonId: l.id } },
      update: {},
      create: { userId: student.id, lessonId: l.id, rating: ratings[i].r, comment: ratings[i].c },
    });
  }

  // ٤. أحداث المخطط الأسبوعي
  await prisma.plannerEvent.deleteMany({ where: { userId: student.id } });
  const subjectRows = await prisma.subject.findMany({ take: 4 });
  const plan = [
    { title: 'مراجعة الفصل الأول', type: 'review', time: '16:00' },
    { title: 'امتحان تجريبي قصير', type: 'trial_exam', time: '18:00' },
    { title: 'حصة مباشرة — أسئلة وأجوبة', type: 'live_class', time: '20:00' },
    { title: 'تسليم واجب', type: 'deadline', time: '12:00' },
  ];
  for (const [i, item] of plan.entries()) {
    await prisma.plannerEvent.create({
      data: {
        userId: student.id,
        title: item.title,
        type: item.type,
        date: dayKey(-(i + 1)), // أيام قادمة
        time: item.time,
        subjectName: subjectRows[i % Math.max(subjectRows.length, 1)]?.name ?? 'عام',
        description: 'حدث تجريبي للتوضيح',
      },
    });
  }

  // ٥. تنبيهات — بعضها مقروء وبعضها جديد
  await prisma.notification.deleteMany({ where: { userId: student.id } });
  const notes = [
    { title: 'اقترب موعد الامتحان التجريبي', message: 'لديك امتحان تجريبي غداً الساعة ١٨:٠٠.', type: 'exam', read: false },
    { title: 'راجع درسك المحفوظ', message: 'درس «' + (allLessons[1]?.title ?? '') + '» محفوظ ولم تفتحه منذ أيام.', type: 'reminder', read: false },
    { title: 'أُضيف محتوى جديد', message: 'نُزّل هيكل منهج العلوم من الكتاب الرسمي.', type: 'system', read: true },
  ];
  for (const n of notes) {
    await prisma.notification.create({
      data: { userId: student.id, title: n.title, message: n.message, type: n.type, isRead: n.read },
    });
  }

  // ٦. محاولة اختبار مكتملة بإجاباتها
  const exam = await prisma.exam.findFirst({ include: { questions: true } });
  if (exam && exam.questions.length) {
    await prisma.examAttempt.deleteMany({ where: { userId: student.id } });
    const started = new Date(Date.now() - 1000 * 60 * 22);
    const attempt = await prisma.examAttempt.create({
      data: {
        examId: exam.id,
        userId: student.id,
        startedAt: started,
        finishedAt: new Date(),
        total: exam.questions.length,
        score: 0, // يُحدَّث بعد حساب الإجابات الصحيحة
      },
    });
    let score = 0;
    for (const [i, q] of exam.questions.entries()) {
      const chosen = i % 2 === 0 ? q.correctIndex : (q.correctIndex + 1) % 4;
      const correct = chosen === q.correctIndex;
      if (correct) score += 1;
      await prisma.examAnswer.create({
        data: { attemptId: attempt.id, questionId: q.id, chosenIndex: chosen, correct },
      });
    }
    await prisma.examAttempt.update({ where: { id: attempt.id }, data: { score } });
  }

  console.log('📊 بيانات تشغيلية تجريبية: جلسات · تقييمات · مخطط · تنبيهات · محاولة اختبار');

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
