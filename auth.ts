import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth-password";

export async function authorizeCredentials(email: string, password: string) {
  const user = await db.user.findUnique({ where: { email } });
  if (!user) return null;
  if (!(await verifyPassword(password, user.passwordHash))) return null;
  return { id: user.id, email: user.email, role: user.role };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (creds) => {
        if (!creds?.email || !creds?.password) return null;
        return authorizeCredentials(String(creds.email), String(creds.password));
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.role = (user as any).role;
      return token;
    },
    session({ session, token }) {
      if (session.user) (session.user as any).role = token.role;
      return session;
    },
  },
});
