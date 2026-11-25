ALTER TABLE "tenant_features"
  ADD COLUMN "voicemailEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "voicemailBoxLimit" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "voicemailStorageLimitMb" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "ivrs" ADD COLUMN "fallbackVoicemailBoxId" TEXT;

CREATE TYPE "VoicemailMessageStatus" AS ENUM ('PROCESSING', 'READY', 'FAILED');

CREATE TABLE "voicemail_boxes" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "extensionId" TEXT,
  "sequenceId" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "greetingPath" TEXT,
  "noAnswerSeconds" INTEGER NOT NULL DEFAULT 20,
  "notifyByEmail" BOOLEAN NOT NULL DEFAULT false,
  "notifyEmail" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "voicemail_boxes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "voicemail_boxes_extensionId_key" ON "voicemail_boxes"("extensionId");
CREATE UNIQUE INDEX "voicemail_boxes_tenantId_sequenceId_key" ON "voicemail_boxes"("tenantId", "sequenceId");
CREATE INDEX "voicemail_boxes_tenantId_enabled_idx" ON "voicemail_boxes"("tenantId", "enabled");
ALTER TABLE "voicemail_boxes" ADD CONSTRAINT "voicemail_boxes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "voicemail_boxes" ADD CONSTRAINT "voicemail_boxes_extensionId_fkey" FOREIGN KEY ("extensionId") REFERENCES "extensions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "voicemail_messages" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "boxId" TEXT NOT NULL,
  "callUuid" TEXT NOT NULL,
  "callerId" TEXT,
  "calledNumber" TEXT,
  "durationMs" INTEGER,
  "audioKey" TEXT,
  "audioBytes" BIGINT NOT NULL DEFAULT 0,
  "status" "VoicemailMessageStatus" NOT NULL DEFAULT 'PROCESSING',
  "readAt" TIMESTAMP(3),
  "notificationSentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "voicemail_messages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "voicemail_messages_boxId_callUuid_key" ON "voicemail_messages"("boxId", "callUuid");
CREATE INDEX "voicemail_messages_tenantId_boxId_createdAt_idx" ON "voicemail_messages"("tenantId", "boxId", "createdAt");
CREATE INDEX "voicemail_messages_tenantId_status_deletedAt_idx" ON "voicemail_messages"("tenantId", "status", "deletedAt");
ALTER TABLE "voicemail_messages" ADD CONSTRAINT "voicemail_messages_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "voicemail_messages" ADD CONSTRAINT "voicemail_messages_boxId_fkey" FOREIGN KEY ("boxId") REFERENCES "voicemail_boxes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
