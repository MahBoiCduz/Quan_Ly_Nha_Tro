CREATE TABLE "BillTrackingPeriod" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "billId" TEXT NOT NULL,
  "leaseId" TEXT NOT NULL,
  "month" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  CONSTRAINT "BillTrackingPeriod_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "BillTrackingPeriod_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "BillTrackingPeriod_leaseId_month_category_key" ON "BillTrackingPeriod"("leaseId", "month", "category");
CREATE INDEX "BillTrackingPeriod_month_idx" ON "BillTrackingPeriod"("month");
CREATE INDEX "BillTrackingPeriod_billId_idx" ON "BillTrackingPeriod"("billId");
