-- AlterTable: add type column to Bill for room/elec_water/both classification
ALTER TABLE "Bill" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'both';
