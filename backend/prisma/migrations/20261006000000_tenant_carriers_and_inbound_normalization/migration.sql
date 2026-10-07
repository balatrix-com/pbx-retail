-- Tenant-owned carrier trunks and inbound normalization.
CREATE TYPE "InboundNormalization" AS ENUM (
    'NONE', 'STRIP_PLUS', 'STRIP_PLUS_ONE_US', 'AUTO_10DIGIT'
);

ALTER TABLE "tenants"
    ADD COLUMN "inboundNormalization" "InboundNormalization" NOT NULL DEFAULT 'AUTO_10DIGIT';

ALTER TABLE "outbound_carriers" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "outbound_endpoints" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "outbound_endpoints" ADD COLUMN "priority" INTEGER NOT NULL DEFAULT 100;
ALTER TABLE "inbound_whitelist" ADD COLUMN "tenantId" TEXT;

-- Preserve legacy assignments when upgrading a populated installation.
UPDATE "outbound_endpoints" AS endpoint
SET "tenantId" = assignment."tenantId"
FROM (
    SELECT "outboundEndpointId", MIN(id) AS "tenantId"
    FROM "tenants"
    WHERE "outboundEndpointId" IS NOT NULL
    GROUP BY "outboundEndpointId"
) AS assignment
WHERE endpoint.id = assignment."outboundEndpointId";

UPDATE "outbound_carriers" AS carrier
SET "tenantId" = endpoint."tenantId"
FROM "outbound_endpoints" AS endpoint
WHERE endpoint."carrierId" = carrier.id
  AND endpoint."tenantId" IS NOT NULL
  AND carrier."tenantId" IS NULL;

-- Global legacy rows cannot be safely exposed to an arbitrary tenant. Remove
-- only unassigned rows; assigned rows retain their original tenant ownership.
DELETE FROM "inbound_whitelist" WHERE "tenantId" IS NULL;
DELETE FROM "outbound_endpoints" WHERE "tenantId" IS NULL;
DELETE FROM "outbound_carriers" WHERE "tenantId" IS NULL;

ALTER TABLE "outbound_carriers" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "outbound_endpoints" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "inbound_whitelist" ALTER COLUMN "tenantId" SET NOT NULL;

ALTER TABLE "outbound_carriers"
    ADD CONSTRAINT "outbound_carriers_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"(id) ON DELETE CASCADE;
ALTER TABLE "outbound_endpoints"
    ADD CONSTRAINT "outbound_endpoints_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"(id) ON DELETE CASCADE;
ALTER TABLE "inbound_whitelist"
    ADD CONSTRAINT "inbound_whitelist_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"(id) ON DELETE CASCADE;

DROP INDEX IF EXISTS "outbound_carriers_name_key";
DROP INDEX IF EXISTS "inbound_whitelist_ipAddress_key";
CREATE UNIQUE INDEX "outbound_carriers_tenantId_name_key"
    ON "outbound_carriers"("tenantId", name);
CREATE UNIQUE INDEX "inbound_whitelist_tenantId_ipAddress_port_key"
    ON "inbound_whitelist"("tenantId", "ipAddress", port);
CREATE INDEX "outbound_carriers_tenantId_idx" ON "outbound_carriers"("tenantId");
CREATE INDEX "outbound_endpoints_tenantId_isActive_priority_idx"
    ON "outbound_endpoints"("tenantId", "isActive", priority);
CREATE INDEX "inbound_whitelist_tenantId_idx" ON "inbound_whitelist"("tenantId");
CREATE INDEX "inbound_whitelist_ipAddress_port_idx"
    ON "inbound_whitelist"("ipAddress", port);
