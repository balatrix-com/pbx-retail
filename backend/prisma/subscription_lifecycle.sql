BEGIN;
ALTER TABLE extensions ADD COLUMN IF NOT EXISTS "isActive" boolean NOT NULL DEFAULT true;
CREATE TABLE IF NOT EXISTS subscription_asset_assignments (
  billing_asset_id text PRIMARY KEY,
  tenant_id text NOT NULL REFERENCES tenants(id),
  subscription_id text NOT NULL,
  asset_type text NOT NULL,
  resource_id text NOT NULL,
  status text NOT NULL,
  before_state jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS subscription_assets_owner ON subscription_asset_assignments(tenant_id, subscription_id);
CREATE TABLE IF NOT EXISTS monitoring_seat_assignments (
  user_id text PRIMARY KEY,
  tenant_id text NOT NULL REFERENCES tenants(id),
  sub_billing_subscription_id text NOT NULL,
  extension text NOT NULL,
  status text NOT NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  frozen_at timestamptz,
  released_at timestamptz
);
CREATE TABLE IF NOT EXISTS subscription_event_receipts (
  event_id text PRIMARY KEY,
  tenant_id text NOT NULL REFERENCES tenants(id),
  received_at timestamptz NOT NULL DEFAULT now()
);
-- Historical seat ownership survives a normal user deletion; billing retains the released asset.
ALTER TABLE monitoring_seat_assignments DROP CONSTRAINT IF EXISTS monitoring_seat_assignments_user_id_fkey;
COMMIT;
