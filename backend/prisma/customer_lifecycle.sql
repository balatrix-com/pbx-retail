BEGIN;
DO $$ BEGIN CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE','SUSPENDED','ARCHIVED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS status "TenantStatus" NOT NULL DEFAULT 'ACTIVE';
UPDATE tenants SET status='SUSPENDED' WHERE "serviceBlocked" AND status='ACTIVE';
CREATE SEQUENCE IF NOT EXISTS tenant_customer_code_seq START 1005 MAXVALUE 9999 NO CYCLE;
CREATE TABLE IF NOT EXISTS customer_identity_registry (
  customer_code text PRIMARY KEY,
  reserved_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  source text NOT NULL DEFAULT 'allocation'
);
INSERT INTO customer_identity_registry(customer_code,claimed_at,source)
  SELECT "customerCode",now(),'legacy' FROM tenants WHERE "customerCode" IS NOT NULL ON CONFLICT DO NOTHING;
INSERT INTO customer_identity_registry(customer_code,claimed_at,source)
  SELECT DISTINCT customer_code,now(),'state-history' FROM tenant_service_state_events ON CONFLICT DO NOTHING;
-- These two identities were explicitly deleted before this migration. Reserve them forever.
INSERT INTO customer_identity_registry(customer_code,claimed_at,source) VALUES
  ('U1001',now(),'known-deleted'),('U1004',now(),'known-deleted') ON CONFLICT DO NOTHING;
SELECT pg_advisory_xact_lock(hashtext('customer-identity-allocation'));
SELECT setval('tenant_customer_code_seq', GREATEST(1004,
  (SELECT CASE WHEN is_called THEN last_value ELSE last_value-1 END FROM tenant_customer_code_seq),
  COALESCE((SELECT max(substring(customer_code FROM 2)::bigint) FROM customer_identity_registry WHERE customer_code ~ '^[UC][0-9]{4}$'),1004)),true);
CREATE OR REPLACE FUNCTION reserve_customer_identity(prefix text DEFAULT 'U') RETURNS text LANGUAGE plpgsql AS $$
DECLARE code text;
BEGIN
  IF prefix NOT IN ('U','C') THEN RAISE EXCEPTION 'Invalid customer prefix'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('customer-identity-allocation'));
  LOOP
    code := prefix || lpad(nextval('tenant_customer_code_seq')::text,4,'0');
    INSERT INTO customer_identity_registry(customer_code) VALUES(code) ON CONFLICT DO NOTHING;
    IF FOUND THEN RETURN code; END IF;
  END LOOP;
END $$;
CREATE TABLE IF NOT EXISTS tenant_archive_jobs (
  tenant_id text PRIMARY KEY REFERENCES tenants(id),
  state text NOT NULL DEFAULT 'ARCHIVE_REQUESTED',
  phase text NOT NULL DEFAULT 'ARCHIVE_REQUESTED',
  actor_id text NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  lease_token text,
  lease_until timestamptz,
  attempts integer NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS tenant_lifecycle_history (
  id bigserial PRIMARY KEY,
  tenant_id text NOT NULL REFERENCES tenants(id),
  event text NOT NULL,
  actor_id text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS held_number_inventory (
  number text NOT NULL,
  number_type text NOT NULL CHECK(number_type IN ('DID','TFN')),
  tenant_id text NOT NULL REFERENCES tenants(id),
  resource_id text NOT NULL,
  status text NOT NULL DEFAULT 'HELD',
  released_at timestamptz,
  PRIMARY KEY(tenant_id,number_type,number)
);
CREATE OR REPLACE FUNCTION enforce_tenant_identity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."customerCode" IS NOT NULL AND NEW."customerCode" IS DISTINCT FROM OLD."customerCode" THEN
    RAISE EXCEPTION 'Customer identity is immutable';
  END IF;
  IF OLD.status='ARCHIVED' AND NEW.status<>'ARCHIVED' THEN RAISE EXCEPTION 'Archived tenant cannot be restored'; END IF;
  IF NEW.status='ARCHIVED' OR EXISTS(SELECT 1 FROM tenant_archive_jobs WHERE tenant_id=NEW.id) THEN
    NEW."serviceBlocked" := true;
  ELSE
    NEW.status := CASE WHEN NEW."serviceBlocked" THEN 'SUSPENDED'::"TenantStatus" ELSE 'ACTIVE'::"TenantStatus" END;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS tenant_identity_guard ON tenants;
CREATE TRIGGER tenant_identity_guard BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION enforce_tenant_identity();
CREATE OR REPLACE FUNCTION emit_tenant_service_state() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' THEN
    IF OLD."customerCode" IS NOT NULL THEN INSERT INTO tenant_service_state_events(tenant_id,customer_code,state) VALUES(OLD.id,OLD."customerCode",'ARCHIVED'); END IF;
    RETURN OLD;
  END IF;
  IF NEW."customerCode" IS NOT NULL THEN
    INSERT INTO tenant_service_state_events(tenant_id,customer_code,state) VALUES(NEW.id,NEW."customerCode",
      CASE WHEN NEW.status='ARCHIVED' THEN 'ARCHIVED' WHEN NEW."serviceBlocked" THEN 'BLOCKED' ELSE 'ACTIVE' END);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS tenant_service_state_update ON tenants;
CREATE TRIGGER tenant_service_state_update AFTER UPDATE OF "serviceBlocked","customerCode",status ON tenants
  FOR EACH ROW WHEN(OLD."serviceBlocked" IS DISTINCT FROM NEW."serviceBlocked" OR OLD."customerCode" IS DISTINCT FROM NEW."customerCode" OR OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION emit_tenant_service_state();
COMMIT;
