import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import {
  cleanText,
  clearAuthCookie,
  currentUser,
  hashPassword,
  isEmail,
  isPhone,
  setAuthCookie,
  signToken,
  verifyPassword,
} from '../lib/auth.js';
import { requireAuth } from '../lib/auth.js';

export const authRouter = Router();

const publicUser = (u: {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  role: string;
  grade: string | null;
  school: string | null;
  avatar: string | null;
}) => ({
  id: u.id,
  name: u.name,
  phone: u.phone,
  email: u.email,
  role: u.role,
  grade: u.grade,
  school: u.school,
  avatar: u.avatar,
});

/* ============================ تسجيل حساب ============================ */
authRouter.post('/register', async (req, res) => {
  try {
    const name = cleanText(req.body?.name, 60);
    const phoneRaw = cleanText(req.body?.phone, 20);
    const emailRaw = cleanText(req.body?.email, 120).toLowerCase();
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const grade = cleanText(req.body?.grade, 40) || null;
    const school = cleanText(req.body?.school, 80) || null;
    // رمز الدخول الذي أصدرته الإدارة — شرط لإنشاء الحساب
    const codeRaw = cleanText(req.body?.accessCode, 20).toUpperCase().replace(/[\s-]/g, '');

    if (name.length < 3) {
      res.status(400).json({ error: 'الاسم يجب أن يكون ٣ أحرف على الأقل' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: 'كلمة المرور يجب أن تكون ٦ أحرف على الأقل' });
      return;
    }
    if (!codeRaw) {
      res.status(400).json({ error: 'أدخل رمز الدخول الذي استلمته من الإدارة' });
      return;
    }

    const phone = phoneRaw && isPhone(phoneRaw) ? phoneRaw.replace(/[\s+]/g, '') : null;
    const email = emailRaw && isEmail(emailRaw) ? emailRaw : null;
    if (!phone && !email) {
      res.status(400).json({ error: 'أدخل رقم هاتف صحيح أو بريداً إلكترونياً صحيحاً' });
      return;
    }

    const exists = await prisma.user.findFirst({
      where: { OR: [phone ? { phone } : {}, email ? { email } : {}].filter((o) => Object.keys(o).length) },
    });
    if (exists) {
      res.status(409).json({ error: 'يوجد حساب مسجّل بنفس الهاتف أو البريد' });
      return;
    }

    /* ---- التحقق من رمز الدخول ---- */
    const accessCode = await prisma.accessCode.findUnique({ where: { code: codeRaw } });
    if (!accessCode) {
      res.status(400).json({ error: 'رمز الدخول غير صحيح' });
      return;
    }
    if (accessCode.status === 'revoked') {
      res.status(400).json({ error: 'هذا الرمز ألغته الإدارة' });
      return;
    }
    if (accessCode.status === 'used') {
      res.status(400).json({ error: 'هذا الرمز استُخدم بالفعل — كل رمز يصلح لمرة واحدة' });
      return;
    }
    if (accessCode.expiresAt && accessCode.expiresAt < new Date()) {
      res.status(400).json({ error: 'انتهت صلاحية هذا الرمز' });
      return;
    }
    if (accessCode.phone && phone !== accessCode.phone) {
      res.status(400).json({
        error: 'هذا الرمز مخصّص لرقم هاتف آخر — تأكد من الرقم أو راجع الإدارة',
      });
      return;
    }

    const user = await prisma.user.create({
      data: {
        name,
        phone,
        email,
        grade,
        school,
        passwordHash: await hashPassword(password),
        role: 'student',
      },
    });

    // التسجيل via هذا المسار طلابي دائماً — حساب الإدارة لا يُنشأ من هنا
    // يُستهلك الرمز الآن — مرّة واحدة ولا يعود صالحاً
    await prisma.accessCode.update({
      where: { id: accessCode.id },
      data: { status: 'used', usedAt: new Date(), usedById: user.id },
    });

    const token = signToken({ uid: user.id, role: 'student', name: user.name, app: 'student' });
    setAuthCookie(res, token);
    res.status(201).json({ user: publicUser(user), token });
  } catch (e) {
    console.error('register error:', e);
    res.status(500).json({ error: 'تعذّر إنشاء الحساب، حاول مرة أخرى' });
  }
});

/* ============================ تسجيل الدخول ============================ */
authRouter.post('/login', async (req, res) => {
  try {
    const identifier = cleanText(req.body?.identifier, 120);
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!identifier || !password) {
      res.status(400).json({ error: 'أدخل الهاتف/البريد وكلمة المرور' });
      return;
    }

    const isMail = isEmail(identifier);
    const user = await prisma.user.findFirst({
      where: isMail ? { email: identifier.toLowerCase() } : { phone: identifier.replace(/[\s+]/g, '') },
    });

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      res.status(401).json({ error: 'الهاتف/البريد أو كلمة المرور غير صحيحة' });
      return;
    }

    /* التطبيقان منفصلان: نطابق بين التطبيق الذي يطلب الدخول ونوع الحساب.
       الترويسة X-App يرسلها كل تطبيق عن نفسه (تطبيق الطالب: student). */
    const app = req.header('x-app') === 'admin' ? 'admin' : 'student';

    if (user.role === 'admin' && app !== 'admin') {
      res.status(403).json({
        error: 'هذا حساب إدارة. تطبيق الطالب مخصّص للطلاب — استخدم لوحة الإدارة.',
      });
      return;
    }
    if (user.role === 'student' && app === 'admin') {
      res.status(403).json({
        error: 'هذا حساب طالب. لوحة الإدارة مخصّصة لحسابات الإدارة.',
      });
      return;
    }

    const token = signToken({
      uid: user.id,
      role: user.role as 'student' | 'admin',
      name: user.name,
      app,
    });
    setAuthCookie(res, token);
    res.json({ user: publicUser(user), token });
  } catch (e) {
    console.error('login error:', e);
    res.status(500).json({ error: 'تعذّر تسجيل الدخول، حاول مرة أخرى' });
  }
});

/* ============================ تغيير كلمة المرور ============================ */

/** POST /api/auth/password — المستخدم يغيّر كلمته وهو داخل حسابه */
authRouter.post('/password', requireAuth, async (req, res) => {
  try {
    const uid = currentUser(req).uid;
    const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
    const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
    if (newPassword.length < 8) {
      res.status(400).json({ error: 'كلمة المرور الجديدة يجب أن تكون ٨ أحرف على الأقل' });
      return;
    }
    const user = await prisma.user.findUnique({ where: { id: uid } });
    if (!user) {
      res.status(404).json({ error: 'الحساب غير موجود' });
      return;
    }
    if (!(await verifyPassword(currentPassword, user.passwordHash))) {
      res.status(401).json({ error: 'كلمة المرور الحالية غير صحيحة' });
      return;
    }
    if (currentPassword === newPassword) {
      res.status(400).json({ error: 'كلمة المرور الجديدة مطابقة للحالية' });
      return;
    }
    await prisma.user.update({ where: { id: uid }, data: { passwordHash: await hashPassword(newPassword) } });
    res.json({ ok: true });
  } catch (e) {
    console.error('change password error:', e);
    res.status(500).json({ error: 'تعذّر تغيير كلمة المرور' });
  }
});

/* ============================ نسيت كلمة المرور ============================ */

/**
 * POST /api/auth/forgot — ينشئ طلب استعادة يقرأه المدير.
 *
 * لماذا كذا: المنصة لا ترسل بريداً ولا رسائل SMS (لا مزوّد مربوط)، فالبديل
 * الصادق أن يصل الطلب للإدارة وتُصدر كلمة مرور مؤقتة تُبلَّغ للطالب.
 * الرد دائماً واحد حتى لا نكشف من له حساب ومن ليس له.
 */
authRouter.post('/forgot', async (req, res) => {
  try {
    const identifier = cleanText(req.body?.identifier, 120);
    if (!identifier) {
      res.status(400).json({ error: 'أدخل رقم الهاتف أو البريد' });
      return;
    }
    const isMail = isEmail(identifier);
    const user = await prisma.user.findFirst({
      where: isMail ? { email: identifier.toLowerCase() } : { phone: identifier.replace(/[\s+]/g, '') },
      select: { id: true },
    });
    if (user) {
      const pending = await prisma.passwordResetRequest.findFirst({
        where: { userId: user.id, status: 'pending' },
        select: { id: true },
      });
      if (!pending) {
        await prisma.passwordResetRequest.create({
          data: { userId: user.id, identifier },
        });
      }
    }
    res.json({
      ok: true,
      message: 'تم إرسال طلبك للإدارة. راجع الإدارة (واتساب) لتصلك كلمة مرور مؤقتة، وبعدها غيّرها من حسابك.',
    });
  } catch (e) {
    console.error('forgot password error:', e);
    res.status(500).json({ error: 'تعذّر إرسال الطلب، حاول لاحقاً' });
  }
});

/* ============================ الخروج ============================ */
authRouter.post('/logout', (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

/* ============================ الحساب الحالي ============================ */
authRouter.get('/me', requireAuth, async (req, res) => {
  const payload = currentUser(req);
  const user = await prisma.user.findUnique({ where: { id: payload.uid } });
  if (!user) {
    res.status(404).json({ error: 'الحساب غير موجود' });
    return;
  }
  res.json({ user: publicUser(user) });
});

/* ============================ تحديث الملف الشخصي ============================ */
authRouter.patch('/me', requireAuth, async (req, res) => {
  try {
    const payload = currentUser(req);
    const data: Record<string, string | null> = {};
    if (typeof req.body?.name === 'string' && req.body.name.trim().length >= 3) {
      data.name = cleanText(req.body.name, 60);
    }
    if (typeof req.body?.school === 'string') data.school = cleanText(req.body.school, 80) || null;
    if (typeof req.body?.state === 'string') data.state = cleanText(req.body.state, 40) || null;
    if (typeof req.body?.avatar === 'string') data.avatar = cleanText(req.body.avatar, 8) || null;

    /* البريد والهاتف: معرّفان للدخول — نتحقق من الصيغة ومن عدم تكرارهما */
    if (typeof req.body?.email === 'string') {
      const email = cleanText(req.body.email, 120).toLowerCase();
      if (email && !isEmail(email)) {
        res.status(400).json({ error: 'صيغة البريد الإلكتروني غير صحيحة' });
        return;
      }
      if (email) {
        const taken = await prisma.user.findFirst({
          where: { email, NOT: { id: payload.uid } },
          select: { id: true },
        });
        if (taken) {
          res.status(409).json({ error: 'هذا البريد مستخدم في حساب آخر' });
          return;
        }
      }
      data.email = email || null;
    }
    if (typeof req.body?.phone === 'string') {
      const phone = cleanText(req.body.phone, 20).replace(/[\s+]/g, '');
      if (phone && !isPhone(phone)) {
        res.status(400).json({ error: 'صيغة رقم الهاتف غير صحيحة' });
        return;
      }
      if (phone) {
        const taken = await prisma.user.findFirst({
          where: { phone, NOT: { id: payload.uid } },
          select: { id: true },
        });
        if (taken) {
          res.status(409).json({ error: 'هذا الرقم مستخدم في حساب آخر' });
          return;
        }
      }
      data.phone = phone || null;
    }

    /* لا نسمح بترك الحساب بلا أي معرّف — وإلا تعذّر الدخول إليه */
    if (req.body?.email !== undefined || req.body?.phone !== undefined) {
      const before = await prisma.user.findUnique({
        where: { id: payload.uid },
        select: { phone: true, email: true },
      });
      const nextPhone = req.body?.phone === undefined ? before?.phone : (data.phone ?? null);
      const nextEmail = req.body?.email === undefined ? before?.email : (data.email ?? null);
      if (!nextPhone && !nextEmail) {
        res.status(400).json({ error: 'يجب أن يبقى للحساب رقم هاتف أو بريد للدخول' });
        return;
      }
    }

    const user = await prisma.user.update({ where: { id: payload.uid }, data });
    res.json({ user: publicUser(user) });
  } catch (e) {
    console.error('update me error:', e);
    res.status(500).json({ error: 'تعذّر تحديث بيانات الحساب' });
  }
});
