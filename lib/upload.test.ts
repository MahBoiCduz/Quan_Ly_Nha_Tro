import { describe, it, expect } from "vitest";
import { sanitizeFilename, isAllowedImage } from "@/lib/upload";

describe("sanitizeFilename", () => {
  it("strips path separators and unsafe chars", () => {
    expect(sanitizeFilename("../../etc/passwd")).toBe("etc_passwd");
    expect(sanitizeFilename("anh cccd (1).jpg")).toBe("anh_cccd_1.jpg");
  });

  it("preserves hyphens so stored uuid filenames round-trip", () => {
    expect(sanitizeFilename("550e8400-e29b-41d4-a716-446655440000_test.jpg"))
      .toBe("550e8400-e29b-41d4-a716-446655440000_test.jpg");
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
