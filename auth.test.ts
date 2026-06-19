import { describe, it, expect, vi, beforeEach } from "vitest";
import { authorizeCredentials } from "@/auth";

vi.mock("@/lib/db", () => ({
  db: { user: { findUnique: vi.fn() } },
}));

import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth-password";

describe("authorizeCredentials", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the user for valid credentials", async () => {
    const hash = await hashPassword("matkhau123");
    (db.user.findUnique as any).mockResolvedValue({
      id: "u1", email: "admin@nhatro.local", passwordHash: hash, role: "admin",
    });
    const user = await authorizeCredentials("admin@nhatro.local", "matkhau123");
    expect(user).toMatchObject({ id: "u1", email: "admin@nhatro.local" });
  });

  it("returns null for a wrong password", async () => {
    const hash = await hashPassword("matkhau123");
    (db.user.findUnique as any).mockResolvedValue({
      id: "u1", email: "admin@nhatro.local", passwordHash: hash, role: "admin",
    });
    expect(await authorizeCredentials("admin@nhatro.local", "sai")).toBeNull();
  });

  it("returns null for an unknown email", async () => {
    (db.user.findUnique as any).mockResolvedValue(null);
    expect(await authorizeCredentials("nobody@x.com", "x")).toBeNull();
  });
});
