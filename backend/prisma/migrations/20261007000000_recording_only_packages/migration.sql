ALTER TABLE "plans"
    ADD COLUMN "maxNumbers" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "maxMonitoringExtensions" INTEGER NOT NULL DEFAULT 0;

UPDATE "plans"
SET "maxNumbers" = COALESCE("maxDIDs", 0) + COALESCE("maxTFNs", 0)
WHERE "maxNumbers" = 0;

-- Legacy free-minute columns are retained unchanged for audit/history. New
-- application paths neither grant nor consume them.
