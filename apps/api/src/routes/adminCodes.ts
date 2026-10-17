import { Router } from 'express';
import { randomInt } from 'crypto';
import { prisma } from '../lib/prisma.js';
import { cleanText, currentUser, requireAdmin } from '../lib/auth.js';

/**
 * إدارة «رموز الدخول» — الإدارة فقط.
 *
 * التطبيقان منفصلان: الإدارة تُصدر الرمز، والطالب يستخدمه **مرة واحدة**
 * عند إنشاء حسابه في تطبيق الطالب. لا يُطلب الرمز عند كل دخول.
 *
 * كل المسارات هنا وراء `requireAdmin`، وهو لا يكتفي باشتراط دور المدير
 * بل يشترط أيضاً أن يكون الرمز **صادراً عن لوحة الإدارة** (`app === 'admin'`).
 */
export const adminCodesRouter = Router();

/* ============================ توليد الرمز ============================ */

/** أبجدية بلا الحروف التي تُلتبس بالأرقام: لا O/0 ولا I/1 ولا L ولا U */
const ALPHABET = 'ABCDEFGHJKMNPQRSTVWXYZ23456789';
const CODE_LEN = 6;

function makeCode(): string {
  let out = '';
  for (let i = 0; i < CODE_LEN; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

/** يولّد رمزاً فريداً، ويعيد المحاولة إن وقع تصادر (نادر جداً) */
async function uniqueCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = makeCode();
    const clash = await prisma.accessCode.findUnique({ where: { code } });
    if (!clash) return code;
  }
  throw new Error('تعذّر توليد رمز فريد، أعد المحاولة');
}

const publicCode = (c: {
  id: string;
  code: string;
  studentName: string | null;
  phone: string | null;
  grade: string | null;
  school: string | null;
  status: string;
  usedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  usedById: string | null;
}) => ({
  id: c.id,
  code: c.code,
  studentName: c.studentName,
  phone: c.phone,
  grade: c.grade,
  school: c.school,
  status: c.status,
  usedAt: c.usedAt,
  expiresAt: c.expiresAt,
  createdAt: c.createdAt,
  usedById: c.usedById,
});

/* ============================ المسارات ============================ */

/** GET /api/admin/codes — قائمة الرموز مع من استخدمها */
adminCodesRouter.get('/codes', requireAdmin, async (_req, res) => {
  try {
    const codes = await prisma.accessCode.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { usedBy: { select: { id: true, name: true, phone: true } } },
    });
    res.json({
      codes: codes.map((c) => ({
        ...publicCode(c),
        usedByName: c.usedBy?.name ?? null,
        usedByPhone: c.usedBy?.phone ?? null,
      })),
    });
  } catch (e) {
    console.error('admin codes list error:', e);
    res.status(500).json({ error: 'تعذّر تحميل الرموز' });
  }
});

/** POST /api/admin/codes — توليد رمز (أو عدة رموز) */
adminCodesRouter.post('/codes', requireAdmin, async (req, res) => {
  try {
    const admin = currentUser(req);
    const count = Math.min(Math.max(Number(req.body?.count) || 1, 1), 50);
    const studentName = cleanText(req.body?.studentName, 60) || null;
    const phone = cleanText(req.body?.phone, 20).replace(/[\s+]/g, '') || null;
    const grade = cleanText(req.body?.grade, 40) || null;
    const school = cleanText(req.body?.school, 80) || null;
    const days = Math.min(Math.max(Number(req.body?.days) || 30, 1), 365);

    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const created = [];
    for (let i = 0; i < count; i++) {
      const row = await prisma.accessCode.create({
        data: {
          code: await uniqueCode(),
          // الاسم والهاتف يخصّان طالباً بعينه — لا يُكرَّران على دفعة
          studentName: count === 1 ? studentName : null,
          phone: count === 1 ? phone : null,
          grade,
          school,
          expiresAt,
        },
      });
      created.push(row);
    }

    res.status(201).json({
      created: created.length,
      codes: created.map(publicCode),
      issuedByName: admin.name,
    });
  } catch (e) {
    console.error('admin codes create error:', e);
    res.status(500).json({ error: 'تعذّر توليد الرمز' });
  }
});

/** POST /api/admin/codes/:id/revoke — إلغاء رمز لم يُستخدم بعد */
adminCodesRouter.post('/codes/:id/revoke', requireAdmin, async (req, res) => {
  try {
    const code = await prisma.accessCode.findUnique({ where: { id: req.params.id } });
    if (!code) {
      res.status(404).json({ error: 'الرمز غير موجود' });
      return;
    }
    if (code.status === 'used') {
      res.status(409).json({ error: 'رمز مستخدم لا يمكن إلغاؤه' });
      return;
    }
    if (code.status === 'revoked') {
      res.json({ ok: true, alreadyRevoked: true });
      return;
    }
    await prisma.accessCode.update({
      where: { id: code.id },
      data: { status: 'revoked' },
    });
    res.json({ ok: true });
  } catch (e) {
    console.error('admin codes revoke error:', e);
    res.status(500).json({ error: 'تعذّر إلغاء الرمز' });
  }
});
