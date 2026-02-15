CREATE TABLE "LinkAuditEvent" (
  "id" TEXT NOT NULL,
  "linkId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "changes" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "LinkAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LinkAuditEvent_linkId_createdAt_idx" ON "LinkAuditEvent"("linkId", "createdAt");
CREATE INDEX "LinkAuditEvent_action_idx" ON "LinkAuditEvent"("action");

ALTER TABLE "LinkAuditEvent"
ADD CONSTRAINT "LinkAuditEvent_linkId_fkey"
FOREIGN KEY ("linkId") REFERENCES "Link"("id") ON DELETE CASCADE ON UPDATE CASCADE;
