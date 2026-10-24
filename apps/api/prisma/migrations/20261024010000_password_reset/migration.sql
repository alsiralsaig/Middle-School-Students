-- استعادة كلمة المرور بلا بريد: طلب من المستخدم، وكلمة مرور مؤقتة تُصدرها الإدارة
CREATE TABLE IF NOT EXISTS "PasswordResetRequest" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "identifier" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "tempPasswordHint" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "PasswordResetRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PasswordResetRequest_status_createdAt_idx"
  ON "PasswordResetRequest"("status", "createdAt");

-- المفتاح الأجنبي في بلوك منفصل بعد إنشاء الجدول (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PasswordResetRequest_userId_fkey') THEN
    ALTER TABLE "PasswordResetRequest"
      ADD CONSTRAINT "PasswordResetRequest_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
