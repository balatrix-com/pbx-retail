-- DropForeignKey
ALTER TABLE "customer_ratecard" DROP CONSTRAINT IF EXISTS "customer_ratecard_ratecard_id_fkey";

-- DropTable
DROP TABLE IF EXISTS "customer_ratecard";

-- DropTable
DROP TABLE IF EXISTS "rate_cards";

