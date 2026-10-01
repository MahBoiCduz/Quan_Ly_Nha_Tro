-- AlterTable: giá dịch vụ theo số người (perPerson) + số lượng mặc định của dịch vụ (defaultQuantity)
ALTER TABLE "ServiceItem" ADD COLUMN "perPerson" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ServiceItem" ADD COLUMN "defaultQuantity" INTEGER NOT NULL DEFAULT 1;
