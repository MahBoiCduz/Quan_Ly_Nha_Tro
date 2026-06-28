-- AlterTable: meter readings + unit rate on Bill (nullable for legacy bills)
ALTER TABLE "Bill" ADD COLUMN "electricityOld" INTEGER;
ALTER TABLE "Bill" ADD COLUMN "electricityNew" INTEGER;
ALTER TABLE "Bill" ADD COLUMN "electricityRate" INTEGER;
ALTER TABLE "Bill" ADD COLUMN "waterOld" REAL;
ALTER TABLE "Bill" ADD COLUMN "waterNew" REAL;
ALTER TABLE "Bill" ADD COLUMN "waterRate" INTEGER;

-- AlterTable: default electricity/water unit prices in Settings
ALTER TABLE "Setting" ADD COLUMN "defaultElectricityRate" INTEGER;
ALTER TABLE "Setting" ADD COLUMN "defaultWaterRate" INTEGER;
