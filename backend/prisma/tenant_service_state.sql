BEGIN;
-- No tenant FK: keep deletion tombstones for stale telecom routes.
CREATE TABLE IF NOT EXISTS tenant_service_state_events (
  version bigserial PRIMARY KEY,
  tenant_id text NOT NULL,
  customer_code text NOT NULL,
  state text NOT NULL CHECK (state IN ('ACTIVE','BLOCKED','ARCHIVED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz
);
CREATE INDEX IF NOT EXISTS tenant_service_state_customer ON tenant_service_state_events(customer_code,version DESC);
CREATE INDEX IF NOT EXISTS tenant_service_state_pending ON tenant_service_state_events(version) WHERE delivered_at IS NULL;
CREATE OR REPLACE FUNCTION emit_tenant_service_state() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD."customerCode" IS NOT NULL THEN
      INSERT INTO tenant_service_state_events(tenant_id,customer_code,state) VALUES(OLD.id,OLD."customerCode",'ARCHIVED');
    END IF;
    RETURN OLD;
  END IF;
  IF NEW."customerCode" IS NOT NULL THEN
    INSERT INTO tenant_service_state_events(tenant_id,customer_code,state)
      VALUES(NEW.id,NEW."customerCode",CASE WHEN NEW."serviceBlocked" THEN 'BLOCKED' ELSE 'ACTIVE' END);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS tenant_service_state_insert ON tenants;
CREATE TRIGGER tenant_service_state_insert AFTER INSERT ON tenants FOR EACH ROW EXECUTE FUNCTION emit_tenant_service_state();
DROP TRIGGER IF EXISTS tenant_service_state_update ON tenants;
CREATE TRIGGER tenant_service_state_update AFTER UPDATE OF "serviceBlocked", "customerCode" ON tenants
  FOR EACH ROW WHEN (OLD."serviceBlocked" IS DISTINCT FROM NEW."serviceBlocked" OR OLD."customerCode" IS DISTINCT FROM NEW."customerCode")
  EXECUTE FUNCTION emit_tenant_service_state();
DROP TRIGGER IF EXISTS tenant_service_state_delete ON tenants;
CREATE TRIGGER tenant_service_state_delete AFTER DELETE ON tenants FOR EACH ROW EXECUTE FUNCTION emit_tenant_service_state();
INSERT INTO tenant_service_state_events(tenant_id,customer_code,state)
  SELECT t.id,t."customerCode",CASE WHEN t."serviceBlocked" THEN 'BLOCKED' ELSE 'ACTIVE' END
  FROM tenants t WHERE t."customerCode" IS NOT NULL
  AND NOT EXISTS(SELECT 1 FROM tenant_service_state_events e WHERE e.customer_code=t."customerCode");
COMMIT;
