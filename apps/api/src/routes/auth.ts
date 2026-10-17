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
  const payload = currentUser(req);
  const data: Record<string, string | null> = {};
  if (typeof req.body?.name === 'string' && req.body.name.trim().length >= 3) {
    data.name = cleanText(req.body.name, 60);
  }
  if (typeof req.body?.school === 'string') data.school = cleanText(req.body.school, 80) || null;
  if (typeof req.body?.state === 'string') data.state = cleanText(req.body.state, 40) || null;
  if (typeof req.body?.avatar === 'string') data.avatar = cleanText(req.body.avatar, 8) || null;

  const user = await prisma.user.update({ where: { id: payload.uid }, data });
  res.json({ user: publicUser(user) });
});
