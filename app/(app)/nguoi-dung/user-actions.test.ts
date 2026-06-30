import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

vi.mock("@/lib/db", () => ({
  db: { user: { findUnique: vi.fn(), create: vi.fn() } },
}));

import { registerUser } from "./user-actions";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth-password";

// db is mocked above; grab the mocks with a loose Mock type so we can set
// return values without pulling in Prisma's full model types (and without
// `any`, which next build's ESLint rejects).
const findUnique = db.user.findUnique as unknown as Mock;
const create = db.user.create as unknown as Mock;

describe("registerUser", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a new admin with a hashed password", async () => {
    findUnique.mockResolvedValue(null);
    create.mockResolvedValue({ id: "u1" });

    const res = await registerUser("New@Example.com", "matkhau123");
    expect(res).toEqual({ ok: true });

    const data = create.mock.calls[0][0].data;
    // email is normalised (trimmed + lowercased) and password is hashed.
    expect(data.email).toBe("new@example.com");
    expect(data.role).toBe("admin");
    expect(data.passwordHash).not.toBe("matkhau123");
    expect(await verifyPassword("matkhau123", data.passwordHash)).toBe(true);
  });

  it("rejects a duplicate email", async () => {
    findUnique.mockResolvedValue({ id: "u1", email: "a@b.com" });
    const res = await registerUser("a@b.com", "matkhau123");
    expect(res).toEqual({ error: "Email này đã được sử dụng" });
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects an invalid email", async () => {
    const res = await registerUser("not-an-email", "matkhau123");
    expect(res.error).toBeTruthy();
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects a short password", async () => {
    findUnique.mockResolvedValue(null);
    const res = await registerUser("a@b.com", "123");
    expect(res.error).toBeTruthy();
    expect(create).not.toHaveBeenCalled();
  });
});
