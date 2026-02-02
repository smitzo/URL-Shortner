CREATE TYPE "LinkStatus" AS ENUM ('ACTIVE', 'DISABLED', 'EXPIRED');

CREATE TABLE "Link" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "targetUrl" TEXT NOT NULL,
  "title" TEXT,
  "description" TEXT,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "status" "LinkStatus" NOT NULL DEFAULT 'ACTIVE',
  "expiresAt" TIMESTAMP(3),
  "adminKeyHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Link_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClickEvent" (
  "id" TEXT NOT NULL,
  "linkId" TEXT NOT NULL,
  "ipHash" TEXT,
  "userAgent" TEXT,
  "referer" TEXT,
  "browser" TEXT,
  "os" TEXT,
  "device" TEXT,
  "country" TEXT,
  "city" TEXT,
  "clickedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ClickEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Link_code_key" ON "Link"("code");
CREATE INDEX "Link_createdAt_idx" ON "Link"("createdAt");
CREATE INDEX "Link_status_idx" ON "Link"("status");
CREATE INDEX "Link_expiresAt_idx" ON "Link"("expiresAt");
CREATE INDEX "ClickEvent_linkId_clickedAt_idx" ON "ClickEvent"("linkId", "clickedAt");
CREATE INDEX "ClickEvent_clickedAt_idx" ON "ClickEvent"("clickedAt");
CREATE INDEX "ClickEvent_referer_idx" ON "ClickEvent"("referer");

ALTER TABLE "ClickEvent"
ADD CONSTRAINT "ClickEvent_linkId_fkey"
FOREIGN KEY ("linkId") REFERENCES "Link"("id") ON DELETE CASCADE ON UPDATE CASCADE;
