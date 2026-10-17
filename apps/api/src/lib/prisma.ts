import { PrismaClient } from '@prisma/client';

/**
 * عميل قاعدة البيانات — PostgreSQL.
 *
 * العنوان كله من المتغيّر `DATABASE_URL`، فلا فرق في الكود بين التطوير
 * والإنتاج:
 *   • التطوير → قاعدة محلية أو فرع تطوير على Neon
 *   • الإنتاج → قاعدة Neon
 *
 * لماذا PostgreSQL لا SQLite؟ لأن منصات الاستضافة المجانية (Vercel) تمحو
 * القرص عند كل إعادة تشغيل، فلا يصلح ملف قاعدة بيانات محلي. وPostgreSQL
 * مدعوم أصلاً في Prisma بلا أي «محوّل» (driver adapter)، والهجرات تعمل
 * مباشرة — بخلاف خيارات SQLite المستضافة.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['warn', 'error']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
