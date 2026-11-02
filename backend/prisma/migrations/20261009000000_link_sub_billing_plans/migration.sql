ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "subBillingPlanId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "plans_subBillingPlanId_key" ON "plans"("subBillingPlanId");
