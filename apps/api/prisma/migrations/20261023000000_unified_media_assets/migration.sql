CREATE TABLE "MediaAsset" (
  "id" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "access" TEXT NOT NULL DEFAULT 'public',
  "ownerType" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "userId" TEXT,
  "subjectId" TEXT,
  "category" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "originalName" TEXT,
  "mimeType" TEXT,
  "sizeBytes" INTEGER,
  "pathname" TEXT,
  "url" TEXT,
  "externalUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MediaAsset_pathname_key" ON "MediaAsset"("pathname");
CREATE INDEX "MediaAsset_ownerType_ownerId_access_idx" ON "MediaAsset"("ownerType", "ownerId", "access");
CREATE INDEX "MediaAsset_userId_access_idx" ON "MediaAsset"("userId", "access");
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
