import { describe, expect, it } from "vitest";
import { invoiceServiceUnit } from "./invoice-service-unit";

describe("invoice service units from the room", () => {
  it("uses the room's unit even when an old invoice has a different unit", () => {
    expect(invoiceServiceUnit({ name: "Internet", measureUnit: "tháng" }, [{ name: "Internet", measureUnit: "Phòng" }])).toBe("Phòng");
  });
  it("matches capitalization, spacing and legacy service labels", () => {
    const services = [{ name: "Dịch vụ chung", measureUnit: "người" }, { name: "Máy giặt", measureUnit: "Người" }, { name: "Gửi xe", measureUnit: "xe" }];
    expect(invoiceServiceUnit({ name: " DỊCH VỤ   CHUNG (2 người)", measureUnit: "tháng" }, services)).toBe("người");
    expect(invoiceServiceUnit({ name: "Sử dụng máy giặt", measureUnit: "phòng" }, services)).toBe("Người");
    expect(invoiceServiceUnit({ name: "Chỗ để xe máy (trừ xe 1)", measureUnit: "" }, services)).toBe("xe");
  });
  it("prefers the exact service when multiple parking services exist", () => {
    expect(invoiceServiceUnit({ name: "Gửi xe", measureUnit: "tháng" }, [{ name: "Gửi xe", measureUnit: "xe" }, { name: "Chỗ để xe máy", measureUnit: "phòng" }])).toBe("xe");
  });
  it("does not guess for ambiguous, removed or aggregate services", () => {
    const services = [{ name: "Gửi xe", measureUnit: "xe" }, { name: "Chỗ để xe máy", measureUnit: "phòng" }];
    expect(invoiceServiceUnit({ name: "Để xe", measureUnit: "tháng" }, services)).toBe("tháng");
    expect(invoiceServiceUnit({ name: "Tiền phòng + dịch vụ", measureUnit: "tháng" }, services)).toBe("tháng");
    expect(invoiceServiceUnit({ name: "Dịch vụ đã xóa", measureUnit: "" }, services)).toBe("—");
  });
});
