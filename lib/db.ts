import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createDb() {
  // libSQL accepts both a local file URL ("file:./dev.db") and a Turso remote
  // URL ("libsql://<db>.turso.io"). authToken is only needed for the remote.
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  const authToken = process.env.DATABASE_AUTH_TOKEN;
  if (process.env.VERCEL === "1") {
    console.info("[database-source]", JSON.stringify({
      host: new URL(url).hostname || "local-file",
      deployment: process.env.VERCEL_URL,
    }));
  }
  const adapter = new PrismaLibSql({
    url,
    authToken,
    // SQL travels over HTTP. Always read current rows, including corrections
    // made outside a Next.js server action that cannot revalidate its cache.
    fetch: (input: RequestInfo | URL, init?: RequestInit) =>
      fetch(input, { ...init, cache: "no-store" }),
  });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createDb();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
