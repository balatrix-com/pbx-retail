-- Only new tenant feature rows default to on; existing tenant settings remain unchanged.
ALTER TABLE "tenant_features" ALTER COLUMN "voicemailEnabled" SET DEFAULT true;
