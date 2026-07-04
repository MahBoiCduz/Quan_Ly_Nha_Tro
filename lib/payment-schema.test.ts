import { describe, it, expect } from "vitest";
import { paymentSchema, MAX_RECEIPT_IMAGES } from "./payment-schema";

describe("paymentSchema receiptImages", () => {
  const base = { amount: 100000, paidAt: "2026-07-04", method: "cash" as const };

  it("parses a JSON array of image URLs", () => {
    const parsed = paymentSchema.parse({
      ...base,
      receiptImages: JSON.stringify(["/api/files/a.jpg", "/api/files/b.jpg"]),
    });
    expect(parsed.receiptImages).toEqual(["/api/files/a.jpg", "/api/files/b.jpg"]);
  });

  it("treats missing/empty input as no images", () => {
    expect(paymentSchema.parse({ ...base, receiptImages: null }).receiptImages).toEqual([]);
    expect(paymentSchema.parse({ ...base, receiptImages: "" }).receiptImages).toEqual([]);
    expect(paymentSchema.parse({ ...base, receiptImages: "[]" }).receiptImages).toEqual([]);
  });

  it("rejects malformed JSON, non-string entries, and too many images", () => {
    expect(paymentSchema.safeParse({ ...base, receiptImages: "not json" }).success).toBe(false);
    expect(paymentSchema.safeParse({ ...base, receiptImages: JSON.stringify([1, 2]) }).success).toBe(false);
    const tooMany = JSON.stringify(Array.from({ length: MAX_RECEIPT_IMAGES + 1 }, (_, i) => `/api/files/${i}.jpg`));
    expect(paymentSchema.safeParse({ ...base, receiptImages: tooMany }).success).toBe(false);
  });
});
