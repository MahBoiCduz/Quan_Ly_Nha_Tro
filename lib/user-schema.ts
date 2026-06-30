import { z } from "zod";

// New users are created by an existing admin. Role is always "admin" for now
// (the app has a single role — see prisma/schema.prisma), so it's not part of
// the form input.
export const userSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
});

export type UserInput = z.infer<typeof userSchema>;
