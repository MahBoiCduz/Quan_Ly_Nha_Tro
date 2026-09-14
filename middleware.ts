import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isLoginPage = req.nextUrl.pathname.startsWith("/login");
  if (!isLoggedIn && !isLoginPage) {
    return Response.redirect(new URL("/login", req.nextUrl));
  }
});

export const config = {
  // `pdf.worker.min.mjs` is the static pdf.js worker used by the client-side
  // "export invoice as PNG" feature — a public library file, so it is served
  // without a session (see scripts/sync-pdf-worker.mjs).
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|pdf\\.worker\\.min\\.mjs).*)"],
};
