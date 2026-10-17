import { PrismaClient } from '@prisma/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';

/**
 * عميل قاعدة البيانات — يعمل بطريقتين بلا تغيير في بقية الكود:
 *
 *   ١. **بدون متغيّرات Turso** → ملف SQLite محلي (كما كان). هذا وضع التطوير،
 *      وهو الافتراضي. لا يتأثر بشيء.
 *
 *   ٢. **مع `TURSO_DATABASE_URL`** → قاعدة SQLite مستضافة (libSQL).
 *      لماذا؟ لأن استضافة الويب المجانية تمحو القرص عند كل إعادة تشغيل،
 *      فتضيع تعديلات الإدارة. Turso تحفظ البيانات خارج الخادم.
 *
 * libSQL متوافق تماماً مع SQLite: نفس المخطط، ونفس الاستعلامات، ونفس
 * الصيغ. لذلك **لا تغيير على أي سطر في بقية المشروع** — لا في المخطط
 * ولا في المسارات.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  const log =
    process.env.NODE_ENV === 'development'
      ? (['warn', 'error'] as const)
      : (['error'] as const);

  const tursoUrl = process.env.TURSO_DATABASE_URL?.trim();
  const tursoToken = process.env.TURSO_AUTH_TOKEN?.trim();

  if (tursoUrl) {
    const adapter = new PrismaLibSQL({
      url: tursoUrl,
      authToken: tursoToken || undefined,
    });
    return new PrismaClient({ adapter, log: [...log] });
  }

  return new PrismaClient({ log: [...log] });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/** هل نحن على قاعدة مستضافة (Turso) أم ملف محلي؟ */
export const isHostedDatabase = (): boolean =>
  !!process.env.TURSO_DATABASE_URL?.trim();
