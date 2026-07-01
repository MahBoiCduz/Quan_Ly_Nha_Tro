-- Index every foreign key + the columns used in WHERE/ORDER BY filters. SQLite
-- does not auto-index foreign keys, so these lookups were full table scans.

-- CreateIndex
CREATE INDEX "Unit_billingProfileId_idx" ON "Unit"("billingProfileId");

-- CreateIndex
CREATE INDEX "ServiceItem_unitId_idx" ON "ServiceItem"("unitId");

-- CreateIndex
CREATE INDEX "Tenant_coLeaseId_idx" ON "Tenant"("coLeaseId");

-- CreateIndex
CREATE INDEX "Lease_unitId_idx" ON "Lease"("unitId");

-- CreateIndex
CREATE INDEX "Lease_tenantId_idx" ON "Lease"("tenantId");

-- CreateIndex
CREATE INDEX "Bill_leaseId_idx" ON "Bill"("leaseId");

-- CreateIndex
CREATE INDEX "Bill_billingProfileId_idx" ON "Bill"("billingProfileId");

-- CreateIndex
CREATE INDEX "Bill_status_idx" ON "Bill"("status");

-- CreateIndex
CREATE INDEX "Bill_dueDate_idx" ON "Bill"("dueDate");

-- CreateIndex
CREATE INDEX "Payment_billId_idx" ON "Payment"("billId");

-- CreateIndex
CREATE INDEX "Payment_paidAt_idx" ON "Payment"("paidAt");

-- CreateIndex
CREATE INDEX "Expense_date_idx" ON "Expense"("date");

-- CreateIndex
CREATE INDEX "MaintenanceSchedule_unitId_idx" ON "MaintenanceSchedule"("unitId");

-- CreateIndex
CREATE INDEX "MaintenanceSchedule_nextDueAt_idx" ON "MaintenanceSchedule"("nextDueAt");

-- CreateIndex
CREATE INDEX "MaintenanceLog_scheduleId_idx" ON "MaintenanceLog"("scheduleId");
