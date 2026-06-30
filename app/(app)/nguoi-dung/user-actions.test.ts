import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: { user: { findUnique: vi.fn(), create: vi.fn() } },
}));

import { registerUser } from "./user-actions";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth-password";

describe("registerUser", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a new admin with a hashed password", async () => {
    (db.user.findUnique as any).mockResolvedValue(null);
    (db.user.create as any).mockResolvedValue({ id: "u1" });

    const res = await registerUser("New@Example.com", "matkhau123");
    expect(res).toEqual({ ok: true });

    const data = (db.user.create as any).mock.calls[0][0].data;
    // email is normalised (trimmed + lowercased) and password is hashed.
    expect(data.email).toBe("new@example.com");
    expect(data.role).toBe("admin");
    expect(data.passwordHash).not.toBe("matkhau123");
    expect(await verifyPassword("matkhau123", data.passwordHash)).toBe(true);
  });

  it("rejects a duplicate email", async () => {
    (db.user.findUnique as any).mockResolvedValue({ id: "u1", email: "a@b.com" });
    const res = await registerUser("a@b.com", "matkhau123");
    expect(res).toEqual({ error: "Email này đã được sử dụng" });
    expect(db.user.create).not.toHaveBeenCalled();
  });

  it("rejects an invalid email", async () => {
    const res = await registerUser("not-an-email", "matkhau123");
    expect(res.error).toBeTruthy();
    expect(db.user.create).not.toHaveBeenCalled();
  });

  it("rejects a short password", async () => {
    (db.user.findUnique as any).mockResolvedValue(null);
    const res = await registerUser("a@b.com", "123");
    expect(res.error).toBeTruthy();
    expect(db.user.create).not.toHaveBeenCalled();
  });
});
