import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth-password";

describe("password helpers", () => {
  it("hashes then verifies the same password", async () => {
    const hash = await hashPassword("matkhau123");
    expect(hash).not.toBe("matkhau123");
    expect(await verifyPassword("matkhau123", hash)).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("matkhau123");
    expect(await verifyPassword("sai", hash)).toBe(false);
  });
});
