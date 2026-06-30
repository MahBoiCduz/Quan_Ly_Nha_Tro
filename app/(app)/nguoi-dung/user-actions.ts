"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { hashPassword } from "@/lib/auth-password";
import { userSchema } from "@/lib/user-schema";

type ActionResult = { ok?: true; error?: string };

/**
 * Core registration logic, kept free of `auth()`/`revalidatePath` so it can be
 * unit-tested directly (mirrors `authorizeCredentials` in auth.ts). Hashes the
 * password and creates an admin user, refusing duplicate emails.
 */
export async function registerUser(email: string, password: string): Promise<ActionResult> {
  const parsed = userSchema.safeParse({ email, password });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }
  const d = parsed.data;

  const existing = await db.user.findUnique({ where: { email: d.email } });
  if (existing) return { error: "Email này đã được sử dụng" };

  await db.user.create({
    data: { email: d.email, passwordHash: await hashPassword(d.password), role: "admin" },
  });
  return { ok: true };
}

export async function createUser(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "Bạn cần đăng nhập" };

  const res = await registerUser(
    String(formData.get("email") ?? ""),
    String(formData.get("password") ?? ""),
  );
  if (res.error) return res;

  revalidatePath("/nguoi-dung");
  return { ok: true };
}

export async function deleteUser(id: string): Promise<ActionResult | void> {
  const session = await auth();
  if (!session?.user) return { error: "Bạn cần đăng nhập" };

  const target = await db.user.findUnique({ where: { id } });
  if (!target) return { error: "Không tìm thấy người dùng" };

  // Don't let an admin delete their own account, and never delete the last one
  // — that would lock everyone out of the app.
  if (target.email === session.user.email) {
    return { error: "Không thể xóa tài khoản đang đăng nhập" };
  }
  const count = await db.user.count();
  if (count <= 1) return { error: "Không thể xóa người dùng cuối cùng" };

  await db.user.delete({ where: { id } });
  revalidatePath("/nguoi-dung");
}
