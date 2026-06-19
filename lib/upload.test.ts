import { describe, it, expect } from "vitest";
import { sanitizeFilename, isAllowedImage } from "@/lib/upload";

describe("sanitizeFilename", () => {
  it("strips path separators and unsafe chars", () => {
    expect(sanitizeFilename("../../etc/passwd")).toBe("etc_passwd");
    expect(sanitizeFilename("anh cccd (1).jpg")).toBe("anh_cccd_1.jpg");
  });
});

describe("isAllowedImage", () => {
  it("accepts jpeg and png", () => {
    expect(isAllowedImage("image/jpeg")).toBe(true);
    expect(isAllowedImage("image/png")).toBe(true);
  });
  it("rejects non-images", () => {
    expect(isAllowedImage("application/pdf")).toBe(false);
  });
});
