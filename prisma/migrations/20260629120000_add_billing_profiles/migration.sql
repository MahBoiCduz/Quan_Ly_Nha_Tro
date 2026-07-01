-- CreateTable: payment profiles (owner bank account + QR) for per-room invoices
CREATE TABLE "BillingProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "bankAccountName" TEXT,
    "bankAccountNo" TEXT,
    "bankName" TEXT,
    "qrImageUrl" TEXT,
    "invoiceNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- AlterTable: which profile a room's invoices use (null = default on Setting)
ALTER TABLE "Unit" ADD COLUMN "billingProfileId" TEXT;

-- AlterTable: profile captured on each bill at creation time
ALTER TABLE "Bill" ADD COLUMN "billingProfileId" TEXT;
