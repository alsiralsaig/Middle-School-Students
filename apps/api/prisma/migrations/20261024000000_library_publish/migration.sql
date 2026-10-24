-- مكتبة المنصة: نص كامل + روابط تفاعلية + قرار النشر للإدارة
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "body" TEXT;
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "externalUrl" TEXT;
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "sourceUrl" TEXT;
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "grade" TEXT NOT NULL DEFAULT 'third-middle';
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "isPublished" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Resource_isPublished_idx" ON "Resource"("isPublished");
CREATE INDEX IF NOT EXISTS "Resource_category_isPublished_idx" ON "Resource"("category", "isPublished");
