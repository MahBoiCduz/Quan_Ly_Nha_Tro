import { describe, expect, it } from "vitest";
import {
  buildInvoicePngFilename,
  INVOICE_IMAGE_TARGET_WIDTH,
  sanitizeFilenamePart,
  scaleForTargetWidth,
} from "./invoice-image";

describe("sanitizeFilenamePart", () => {
  it("strips Vietnamese diacritics", () => {
    expect(sanitizeFilenamePart("Phòng 201")).toBe("Phong-201");
    expect(sanitizeFilenamePart("Tháng 9/2026")).toBe("Thang-9-2026");
    expect(sanitizeFilenamePart("Mặt bằng tầng 1 (Gym)")).toBe("Mat-bang-tang-1-Gym");
  });

  it("handles đ/Đ which NFD does not decompose", () => {
    expect(sanitizeFilenamePart("Đơn giá đặc biệt")).toBe("Don-gia-dac-biet");
  });

  it("collapses unsupported characters and trims dashes", () => {
    expect(sanitizeFilenamePart("  --Phòng  203--  ")).toBe("Phong-203");
    expect(sanitizeFilenamePart("!!!")).toBe("");
  });

  it("never leaves spaces or path separators", () => {
    const cleaned = sanitizeFilenamePart("Phòng 201 ../etc/passwd");
    expect(cleaned).not.toMatch(/[\s/\\]/);
    expect(cleaned).toBe("Phong-201-etc-passwd");
  });
});

describe("scaleForTargetWidth", () => {
  it("renders an A4 page at roughly 200 DPI", () => {
    // A4 is 595.28 pt wide; the result must be the target pixel width.
    const scale = scaleForTargetWidth(595.28);
    expect(Math.ceil(595.28 * scale)).toBe(INVOICE_IMAGE_TARGET_WIDTH);
    expect(scale).toBeGreaterThan(2.7);
    expect(scale).toBeLessThan(2.8);
  });

  it("scales a narrow page up so the result is still the target width", () => {
    expect(Math.round(300 * scaleForTargetWidth(300))).toBe(INVOICE_IMAGE_TARGET_WIDTH);
  });

  it("falls back to 1 for nonsense page widths", () => {
    expect(scaleForTargetWidth(0)).toBe(1);
    expect(scaleForTargetWidth(-5)).toBe(1);
    expect(scaleForTargetWidth(Number.NaN)).toBe(1);
  });
});

describe("buildInvoicePngFilename", () => {
  it("builds a readable ASCII name", () => {
    expect(buildInvoicePngFilename("Phòng 201", "Tháng 9/2026")).toBe(
      "hoa-don-Phong-201-Thang-9-2026.png",
    );
  });

  it("omits the page suffix for single-page invoices", () => {
    expect(buildInvoicePngFilename("Phòng 201", "Tháng 9/2026", 0, 1)).not.toContain("-trang-");
  });

  it("numbers the pages when the PDF has more than one", () => {
    expect(buildInvoicePngFilename("Phòng 201", "Tháng 9/2026", 0, 3)).toContain("-trang-1.png");
    expect(buildInvoicePngFilename("Phòng 201", "Tháng 9/2026", 2, 3)).toContain("-trang-3.png");
  });

  it("still produces a usable name when the room or period is odd", () => {
    expect(buildInvoicePngFilename("!!!", "", 0, 1)).toBe("hoa-don.png");
    expect(buildInvoicePngFilename("!!!", "", 0, 1).length).toBeLessThan(120);
  });
});
