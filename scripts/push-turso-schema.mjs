// Applies all Prisma migration SQL files (in order) to a libSQL/Turso database.
// Use this instead of `turso db shell` on platforms without the Turso CLI
// (e.g. Windows). Reads DATABASE_URL + DATABASE_AUTH_TOKEN from the env.
//
//   DATABASE_URL=libsql://... DATABASE_AUTH_TOKEN=... node scripts/push-turso-schema.mjs
import { createClient } from "@libsql/client";
import { readFileSync, readdirSync } from "fs";
import path from "path";

const url = process.env.DATABASE_URL;
const authToken = process.env.DATABASE_AUTH_TOKEN;
if (!url) throw new Error("DATABASE_URL is required");

const migrationsDir = path.resolve("prisma/migrations");
const dirs = readdirSync(migrationsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

const client = createClient({ url, authToken });
for (const dir of dirs) {
  const file = path.join(migrationsDir, dir, "migration.sql");
  const sql = readFileSync(file, "utf8");
  await client.executeMultiple(sql);
  console.log(`applied: ${dir}`);
}
console.log("Schema push complete.");
