-- Consolidate the duplicated default payment profile: the bank/QR/notes fields
-- lived on both Setting (the "default") and BillingProfile (the extras). Move the
-- default into a BillingProfile row flagged isDefault, then drop the Setting copy.
-- Order matters: add flag -> copy data across -> only then drop columns.

-- 1) Default flag on BillingProfile
ALTER TABLE "BillingProfile" ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;

-- 2) Materialise the default profile from the existing Setting singleton (if any)
INSERT INTO "BillingProfile"
  ("id", "name", "bankAccountName", "bankAccountNo", "bankName", "qrImageUrl", "invoiceNotes", "isDefault", "createdAt", "updatedAt")
SELECT
  'default_profile', 'Mặc định',
  "bankAccountName", "bankAccountNo", "bankName", "qrImageUrl", "invoiceNotes",
  true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Setting"
WHERE "id" = 'singleton';

-- 3) Drop the now-duplicated columns from Setting (SQLite 3.35+ / libSQL)
ALTER TABLE "Setting" DROP COLUMN "bankAccountName";
ALTER TABLE "Setting" DROP COLUMN "bankAccountNo";
ALTER TABLE "Setting" DROP COLUMN "bankName";
ALTER TABLE "Setting" DROP COLUMN "qrImageUrl";
ALTER TABLE "Setting" DROP COLUMN "invoiceNotes";
