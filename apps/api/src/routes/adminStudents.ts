import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { cleanText, toLatinDigits, hashPassword, isPhone, isPin, requireAdmin } from '../lib/auth.js';

/**
 * إدارة الطلاب — الإدارة فقط.
 *
 * لماذا موجود: صفحة «الطلاب» في اللوحة كانت تقرأ قائمة تجريبية ثابتة
 * (`SAMPLE_STUDENTS`) لا علاقة لها بالقاعدة. فلا يرى المدير طالباً حقيقياً،
 * ولا يعرف تقدّم أحد. الآن تُقرأ من قاعدة البيانات وتُحسب من جداولها.
 *
 * كل الأرقام **محسوبة من بيانات فعلية** لا مُخترَعة:
 *   • نسبة الإكمال = الدروس المكتملة ÷ كل الدروس
 *   • آخر نشاط    = أحدث تعديل على التقدّم، أو جلسة دراسة، أو محاولة اختبار
 *   • الحالة      = نشط إن كان له نشاط خلال أسبوع، وإلا خامل
 */
export const adminStudentsRouter = Router();

/** كم يوماً مضى منذ آخر نشاط حتى نعدّ الطالب «نشطاً» */
const ACTIVE_WINDOW_DAYS = 7;

function formatRelative(date: Date | null): string {
  if (!date) return 'لا نشاط';
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'الآن';
  if (minutes < 60) return `قبل ${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `قبل ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'أمس';
  if (days < 7) return `قبل ${days} أيام`;
  if (days < 30) return `قبل ${Math.floor(days / 7)} أسبوع`;
  return `قبل ${Math.floor(days / 30)} شهر`;
}

/** GET /api/admin/students — قائمة الطلاب الحقيقيين وتقدّمهم */
adminStudentsRouter.get('/students', requireAdmin, async (_req, res) => {
  try {
    // إجمالي الدروس — مقام نسبة الإكمال
    const totalLessons = await prisma.lesson.count();

    const users = await prisma.user.findMany({
      where: { role: 'student' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        grade: true,
        school: true,
        state: true,
        createdAt: true,
        progress: {
          select: { completed: true, secondsSpent: true, updatedAt: true },
        },
        sessions: { select: { createdAt: true, minutes: true } },
        attempts: { select: { startedAt: true } },
      },
    });

    const students = users.map((u) => {
      const completedCount = u.progress.filter((p) => p.completed).length;
      const studyMinutes = u.sessions.reduce((sum, s) => sum + s.minutes, 0);
      const secondsInLessons = u.progress.reduce(
        (sum, p) => sum + p.secondsSpent,
        0,
      );

      // آخر نشاط: أحدث وقت بين التقدّم والجلسات ومحاولات الاختبارات
      const stamps: number[] = [
        ...u.progress.map((p) => p.updatedAt.getTime()),
        ...u.sessions.map((s) => s.createdAt.getTime()),
        ...u.attempts.map((a) => a.startedAt.getTime()),
      ];
      const lastActivity = stamps.length
        ? new Date(Math.max(...stamps))
        : u.createdAt;

      const daysSince =
        (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);

      return {
        id: u.id,
        code: u.id.slice(-6).toUpperCase(), // معرّف قصير للعرض
        name: u.name,
        phone: u.phone,
        email: u.email,
        grade: u.grade ?? '—',
        school: u.school ?? '—',
        state: u.state ?? '—',
        joinedAt: u.createdAt.toISOString(),
        lastActivity: formatRelative(lastActivity),
        lastActivityAt: lastActivity.toISOString(),
        progressPercent:
          totalLessons > 0
            ? Math.round((completedCount / totalLessons) * 100)
            : 0,
        completedLessons: completedCount,
        totalLessons,
        studyMinutes: studyMinutes + Math.round(secondsInLessons / 60),
        examAttempts: u.attempts.length,
        status:
          daysSince <= ACTIVE_WINDOW_DAYS ? 'active' : ('idle' as string),
      };
    });

    res.json({
      students,
      summary: {
        total: students.length,
        active: students.filter((s) => s.status === 'active').length,
        idle: students.filter((s) => s.status !== 'active').length,
        totalLessons,
        averageProgress: students.length
          ? Math.round(
              students.reduce((sum, s) => sum + s.progressPercent, 0) /
                students.length,
            )
          : 0,
      },
    });
  } catch (e) {
    console.error('admin students error:', e);
    res.status(500).json({ error: 'تعذّر تحميل الطلاب' });
  }
});

/* ============================ تصفير الرقم السري ============================ */

/** رقم سري عشوائي من ٦ أرقام — يكتبه الطالب بسهولة */
function randomPin(): string {
  let out = '';
  for (let i = 0; i < 6; i++) out += String(Math.floor(Math.random() * 10));
  return out;
}

/**
 * POST /api/admin/students/:id/pin — المدير يصفّر رقم الطالب فوراً.
 *
 * لماذا: الطالب صغير وبينسى رقمو، وكان لازم هو يضغط «نسيت الرقم السري»
 * وننتظر الطلب. الآن المدير يكتب رقماً جديداً (أو يخلي الخانة فاضية
 * فيُولَّد ٦ أرقام) ويبلّغه للطالب في اللحظة.
 * الرقم يُعاد مرة واحدة في الرد ولا يُخزَّن نصّاً.
 */
adminStudentsRouter.post('/students/:id/pin', requireAdmin, async (req, res) => {
  try {
    const raw = typeof req.body?.pin === 'string' ? req.body.pin.trim() : '';
    const pin = toLatinDigits(raw) || randomPin();
    if (!isPin(pin)) {
      res.status(400).json({ error: 'الرقم السري ٤ إلى ٦ أرقام فقط' });
      return;
    }
    const student = await prisma.user.findFirst({
      where: { id: req.params.id, role: 'student' },
      select: { id: true, name: true, phone: true },
    });
    if (!student) {
      res.status(404).json({ error: 'الطالب غير موجود' });
      return;
    }
    await prisma.user.update({
      where: { id: student.id },
      data: { passwordHash: await hashPassword(pin) },
    });
    // أي طلب «نسيت الرقم السري» معلّق لهذا الطالب يُغلق تلقائياً
    await prisma.passwordResetRequest.updateMany({
      where: { userId: student.id, status: 'pending' },
      data: { status: 'issued', resolvedAt: new Date(), tempPasswordHint: 'صفّرها المدير من صفحة الطلاب' },
    });
    res.json({ ok: true, pin, user: student });
  } catch (e) {
    console.error('reset student pin error:', e);
    res.status(500).json({ error: 'تعذّر تصفير الرقم السري' });
  }
});

/* ============================ تعديل وحذف طالب ============================ */

/**
 * PATCH /api/admin/students/:id — تعديل اسم الطالب وصفّه ومدرسته وولايته.
 *
 * لماذا: كان الحساب يُنشأ ثم لا يمكن تصحيح خطأ مطبعي في الاسم، ولا تحديث
 * الصف بعد النقل. كلاهما يحتاج المدير فعلاً.
 */
adminStudentsRouter.patch('/students/:id', requireAdmin, async (req, res) => {
  try {
    const student = await prisma.user.findFirst({
      where: { id: req.params.id, role: 'student' },
      select: { id: true },
    });
    if (!student) {
      res.status(404).json({ error: 'الطالب غير موجود' });
      return;
    }
    const data: Record<string, string | null> = {};
    if (typeof req.body?.name === 'string') {
      const name = cleanText(req.body.name, 60);
      if (name.length < 3) {
        res.status(400).json({ error: 'الاسم ٣ أحرف على الأقل' });
        return;
      }
      data.name = name;
    }
    if (typeof req.body?.grade === 'string') data.grade = cleanText(req.body.grade, 40) || null;
    if (typeof req.body?.school === 'string') data.school = cleanText(req.body.school, 80) || null;
    if (typeof req.body?.state === 'string') data.state = cleanText(req.body.state, 40) || null;
    if (typeof req.body?.phone === 'string') {
      const phone = cleanText(req.body.phone, 20).replace(/[\s+]/g, '');
      if (!isPhone(phone)) {
        res.status(400).json({ error: 'رقم الهاتف غير صحيح' });
        return;
      }
      const taken = await prisma.user.findFirst({
        where: { phone, NOT: { id: student.id } },
        select: { id: true },
      });
      if (taken) {
        res.status(409).json({ error: 'الرقم مستخدم في حساب آخر' });
        return;
      }
      data.phone = phone;
    }
    if (!Object.keys(data).length) {
      res.status(400).json({ error: 'لا يوجد ما يُعدَّل' });
      return;
    }
    const updated = await prisma.user.update({
      where: { id: student.id },
      data,
      select: { id: true, name: true, phone: true, grade: true, school: true, state: true },
    });
    res.json({ ok: true, student: updated });
  } catch (e) {
    console.error('admin student update error:', e);
    res.status(500).json({ error: 'تعذّر تعديل بيانات الطالب' });
  }
});

/**
 * DELETE /api/admin/students/:id — حذف حساب طالب نهائياً.
 * علاقات التقدّم والجلسات والمحاولات تُحذف معه (Cascade في المخطط).
 */
adminStudentsRouter.delete('/students/:id', requireAdmin, async (req, res) => {
  try {
    const student = await prisma.user.findFirst({
      where: { id: req.params.id, role: 'student' },
      select: { id: true, name: true },
    });
    if (!student) {
      res.status(404).json({ error: 'الطالب غير موجود' });
      return;
    }
    await prisma.user.delete({ where: { id: student.id } });
    res.json({ ok: true, deleted: student.name });
  } catch (e) {
    console.error('admin student delete error:', e);
    res.status(500).json({ error: 'تعذّر حذف الطالب' });
  }
});
