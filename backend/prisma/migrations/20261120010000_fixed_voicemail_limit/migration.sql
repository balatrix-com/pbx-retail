-- The message count is a fixed product rule, not a tenant setting.
-- IF EXISTS also supports databases where the preceding migration was never deployed.
ALTER TABLE "tenant_features" DROP COLUMN IF EXISTS "voicemailMessageLimit";
