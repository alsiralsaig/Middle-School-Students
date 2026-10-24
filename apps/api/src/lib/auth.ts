import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me-please-32chars';
const COOKIE_NAME = 'ssp_token';
const ADMIN_TTL = '30d';
/** جلسة الطالب أقصر: الجهاز قد يكون مشتركاً في المدرسة أو البيت */
const STUDENT_TTL = '7d';

export type UserRole = 'student' | 'admin';

/** أي تطبيق أصدر هذا الرمز — تطبيق الطالب أم لوحة الإدارة. */
export type AppScope = 'student' | 'admin';

export interface JwtPayload {
  uid: string;
  role: UserRole;
  name: string;
  /**
   * نطاق التطبيق. لماذا موجود: التطبيقان منفصلان، فلا يكفي أن نعرف أن
   * المستخدم «مدير» — يجب أن نعرف أيضاً **من أين دخل**. رمزٌ صادر عن تطبيق
   * الطالب لا يفتح مسارات الإدارة، والعكس صحيح.
   */
  app: AppScope;
}

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: payload.role === 'admin' ? ADMIN_TTL : STUDENT_TTL });
}

export function readToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export function setAuthCookie(res: Response, token: string, role: UserRole = 'student'): void {
  const days = role === 'admin' ? 30 : 7;
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: days * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

export function tokenFromRequest(req: Request): string | null {
  const cookieToken = (req.cookies?.[COOKIE_NAME] as string | undefined) ?? null;
  if (cookieToken) return cookieToken;
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) return header.slice(7);
  return null;
}

/** يمرّر الطلب إن كان مسجّلاً، ويضع req.user */
export function attachUser(req: Request, _res: Response, next: NextFunction): void {
  const token = tokenFromRequest(req);
  (req as Request & { user?: JwtPayload }).user = token ? readToken(token) ?? undefined : undefined;
  next();
}

/** يرفض الطلب إن لم يكن مسجّلاً */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const user = (req as Request & { user?: JwtPayload }).user;
  if (!user) {
    res.status(401).json({ error: 'يجب تسجيل الدخول أولاً' });
    return;
  }
  next();
}

/** يرفض الطلب إن لم يكن مديراً */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const user = (req as Request & { user?: JwtPayload }).user;
  if (!user) {
    res.status(401).json({ error: 'يجب تسجيل الدخول أولاً' });
    return;
  }
  if (user.role !== 'admin') {
    res.status(403).json({ error: 'هذه العملية متاحة للإدارة فقط' });
    return;
  }
  // حساب إدارة دخل من تطبيق الطالب لا يملك صلاحيات الإدارة
  if (user.app !== 'admin') {
    res.status(403).json({ error: 'هذه العملية متاحة من لوحة الإدارة فقط' });
    return;
  }
  next();
}

export function currentUser(req: Request): JwtPayload {
  return (req as Request & { user?: JwtPayload }).user!;
}

/* ==================== التحقق من المدخلات ==================== */

export const isPhone = (v: string) => /^[0-9]{9,15}$/.test(v.replace(/[\s+]/g, ''));
export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
/** رقم سري للطالب: أرقام فقط، من ٤ إلى ٦ خانات */
export const isPin = (v: string) => /^[0-9]{4,6}$/.test(v);

/** تنظيف النصوص القادمة من المستخدم (يمنع HTML وقيود طول) */
export function cleanText(value: unknown, max = 2000): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, max);
}
