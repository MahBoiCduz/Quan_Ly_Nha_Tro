-- AlterTable: additional occupants sharing a lease (co-tenants). Each is a full
-- Tenant row with its own ID card; null = the tenant is a lease's primary/representative.
ALTER TABLE "Tenant" ADD COLUMN "coLeaseId" TEXT;
