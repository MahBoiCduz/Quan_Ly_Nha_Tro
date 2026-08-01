import { describe, it, expect } from "vitest";
import { buildInvoiceModel } from "@/lib/invoice-pdf";

const base = {
  bill: {
    type: "both",
    periodLabel: "Tháng 6/2026", subtotal: 5100000, electricityAmount: 559000,
    waterAmount: 250000, grandTotal: 5909000,
    electricityOld: 1200, electricityNew: 1350, electricityRate: 4000,
    waterOld: 20, waterNew: 30, waterRate: 35000,
    lineItems: [{ name: "Internet", measureUnit: "phòng", quantity: 1, unitPrice: 100000, total: 100000 }],
  },
  lease: { depositAmount: 4800000 },
  unit: { name: "Phòng 301" },
  tenant: { fullName: "Nguyễn Mạnh Cường", phone: "0969920947", vehiclePlate: "29A-12345" },
  setting: { bankAccountName: "HO KINH DOANH NGUYEN SY DUC", bankAccountNo: "88859988888", bankName: "TP Bank", qrImageUrl: "/api/files/qr.png", invoiceNotes: "Thu trước 5 ngày." },
};

describe("buildInvoiceModel", () => {
  it("maps header fields from the entities", () => {
    const m = buildInvoiceModel(base.bill, base.lease, base.unit, base.tenant, base.setting);
    expect(m.unitName).toBe("Phòng 301");
    expect(m.tenantName).toBe("Nguyễn Mạnh Cường");
    expect(m.phone).toBe("0969920947");
    expect(m.depositAmount).toBe(4800000);
    expect(m.rows).toHaveLength(1);
    expect(m.bankAccountNo).toBe("88859988888");
  });

  it("maps meter readings and derives usage (new − old)", () => {
    const m = buildInvoiceModel(base.bill, base.lease, base.unit, base.tenant, base.setting);
    expect(m.electricityOld).toBe(1200);
    expect(m.electricityNew).toBe(1350);
    expect(m.electricityUsage).toBe(150);
    expect(m.electricityRate).toBe(4000);
    expect(m.waterOld).toBe(20);
    expect(m.waterNew).toBe(30);
    expect(m.waterUsage).toBe(10);
    expect(m.waterRate).toBe(35000);
  });
});
