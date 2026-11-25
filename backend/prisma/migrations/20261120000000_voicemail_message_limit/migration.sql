ALTER TABLE "tenant_features"
  ADD COLUMN "voicemailMessageLimit" INTEGER NOT NULL DEFAULT 20;

ALTER TABLE "voicemail_boxes"
  ADD COLUMN "retiredAt" TIMESTAMP(3);

CREATE INDEX "voicemail_messages_active_box_created_idx"
  ON "voicemail_messages" ("boxId", "createdAt" DESC, "id" DESC)
  WHERE "status" = 'READY' AND "deletedAt" IS NULL;

CREATE INDEX "voicemail_messages_deleted_file_idx"
  ON "voicemail_messages" ("id")
  WHERE "deletedAt" IS NOT NULL AND "audioKey" IS NOT NULL;
