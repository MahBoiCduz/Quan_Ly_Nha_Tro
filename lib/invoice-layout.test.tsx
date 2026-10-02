// @vitest-environment node
import React from "react";
import { it, expect } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { buildInvoiceModel, InvoiceDocument } from "./invoice-pdf";
import { MobileInvoiceDocument } from "./invoice-mobile-pdf";

it("renders combined, room-only, legacy and multi-page invoice fixtures", async () => {
  mkdirSync("test-results/invoices", { recursive: true });
  const rows = [
    { name: "Tiền thuê phòng", measureUnit: "phòng", quantity: 1, months: 1, unitPrice: 4400000, total: 4400000 },
    { name: "Internet", measureUnit: "tháng", quantity: 1, months: 1, unitPrice: 100000, total: 100000 },
    { name: "Dịch vụ chung", measureUnit: "người", quantity: 2, months: 1, unitPrice: 150000, total: 300000 },
    { name: "Máy giặt", measureUnit: "tháng", quantity: 1, months: 1, unitPrice: 100000, total: 100000 },
    { name: "Xe máy", measureUnit: "xe", quantity: 1, months: 1, unitPrice: 150000, total: 150000 },
  ];
  const model = buildInvoiceModel({
    type: "both", dueDate: "2026-12-05", periodLabel: "Tiền phòng T12/2026 · Điện nước T10–12/2026", lineItems: rows,
    trackingPeriods: [{ month: "2026-12", category: "room" }, ...["2026-10", "2026-11", "2026-12"].map(month => ({ month, category: "elec_water" }))],
    subtotal: 5050000, electricityOld: 1155, electricityNew: 1382, electricityRate: 4000, electricityAmount: 908000,
    waterOld: 45.8, waterNew: 48, waterRate: 35000, waterAmount: 77000, grandTotal: 6035000,
  }, { depositAmount: 4400000 }, { name: "Phòng 405" }, { fullName: "Nguyễn Minh Anh", phone: "0912345678", vehiclePlate: null }, {
    bankName: "Ngân hàng TMCP Kỹ Thương Việt Nam", bankAccountName: "NGUYEN VAN A", bankAccountNo: "19001234567890",
    invoiceNotes: "Vui lòng chuyển khoản đúng số tiền và ghi rõ phòng, kỳ thanh toán. Cảm ơn bạn!", qrImageUrl: null,
  });
  const cases = [
    ["combined", model],
    // Fixture QR encodes DEMO text only, never payment instructions.
    ["with-qr", { ...model, qrImageUrl: `data:image/png;base64,${readFileSync("lib/fixtures/invoice-qr.png").toString("base64")}` }],
    ["room", { ...model, type: "room", grandTotal: model.subtotal }],
    ["legacy", { ...model, type: "elec_water", utilityPeriod: undefined, periodLabel: "15/10 đến 15/11/2026", electricityOld: null, electricityNew: null, electricityUsage: null, waterOld: null, waterNew: null, waterUsage: null, bankName: "", bankAccountNo: "", bankAccountName: "", notes: "", grandTotal: 985000 }],
    ["many-rows", { ...model, rows: Array.from({ length: 45 }, (_, i) => ({ ...rows[0], name: `Dịch vụ số ${i + 1} với tên dài để kiểm tra xuống dòng và ngắt trang` })), subtotal: 198000000, grandTotal: 198985000, notes: "Đối chiếu kỳ điện nước riêng với kỳ tiền phòng. ".repeat(25) }],
  ] as const;
  for (const [name, sample] of cases) {
    const element = React.createElement(InvoiceDocument, { model: sample });
    const buffer = await renderToBuffer(element as Parameters<typeof renderToBuffer>[0]);
    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
    expect(buffer.length).toBeGreaterThan(1000);
    const pages = buffer.toString("latin1").match(/\/Type\s*\/Page\b/g)?.length ?? 0;
    if (name === "many-rows") expect(pages).toBeGreaterThan(1);
    else expect(pages).toBe(1);
    writeFileSync(`test-results/invoices/${name}.pdf`, buffer);
    const mobile = await renderToBuffer(React.createElement(MobileInvoiceDocument, { model: sample }) as Parameters<typeof renderToBuffer>[0]);
    expect(mobile.subarray(0, 4).toString()).toBe("%PDF");
    const mobilePages = mobile.toString("latin1").match(/\/Type\s*\/Page\b/g)?.length ?? 0;
    expect(mobilePages).toBeGreaterThan(0);
    if (name !== "many-rows") expect(mobilePages).toBe(1);
    writeFileSync(`test-results/invoices/mobile-${name}.pdf`, mobile);
  }
}, 30000);
