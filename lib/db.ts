import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createDb() {
  const rawUrl = process.env.DATABASE_URL ?? "file:./dev.db";
  // Strip "file:" prefix and resolve to absolute path for better-sqlite3
  const filePath = rawUrl.startsWith("file:")
    ? path.resolve(rawUrl.slice(5))
    : path.resolve(rawUrl);
  const adapter = new PrismaBetterSqlite3({ url: filePath });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createDb();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
