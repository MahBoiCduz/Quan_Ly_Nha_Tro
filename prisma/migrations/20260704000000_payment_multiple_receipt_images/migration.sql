-- A payment can now carry multiple receipt photos (e.g. the tenant pays rent +
-- services and utilities as two transfers, or sends several screenshots for one
-- transfer). The single receiptImageUrl column becomes receiptImages, a JSON
-- array of image URLs. Order matters: add column -> backfill -> drop old column.

ALTER TABLE "Payment" ADD COLUMN "receiptImages" JSONB NOT NULL DEFAULT '[]';

UPDATE "Payment"
SET "receiptImages" = json_array("receiptImageUrl")
WHERE "receiptImageUrl" IS NOT NULL AND "receiptImageUrl" <> '';

ALTER TABLE "Payment" DROP COLUMN "receiptImageUrl";
