import type { NextAuthConfig } from "next-auth";

// Edge-safe config — no Node.js-only imports (no DB, no bcrypt)
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.role = (user as any).role;
      return token;
    },
    session({ session, token }) {
      if (session.user) (session.user as any).role = token.role;
      return session;
    },
    authorized({ auth }) {
      return !!auth;
    },
  },
};
