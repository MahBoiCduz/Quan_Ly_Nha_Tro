// Applies Prisma migration SQL files (in order) to a libSQL/Turso database.
// Use this instead of `turso db shell` on platforms without the Turso CLI
// (e.g. Windows). Reads DATABASE_URL + DATABASE_AUTH_TOKEN from the env.
//
// A fresh, empty database — apply everything:
//   DATABASE_URL=libsql://... DATABASE_AUTH_TOKEN=... node scripts/push-turso-schema.mjs
//
// An existing database that only needs newer migrations (re-running an
// already-applied migration would fail on CREATE TABLE/ALTER TABLE), name them:
//   node scripts/push-turso-schema.mjs 20260704000000_payment_multiple_receipt_images
import { createClient } from "@libsql/client";
import { readFileSync, readdirSync } from "fs";
import path from "path";

const url = process.env.DATABASE_URL;
const authToken = process.env.DATABASE_AUTH_TOKEN;
if (!url) throw new Error("DATABASE_URL is required");

const migrationsDir = path.resolve("prisma/migrations");
const all = readdirSync(migrationsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

const requested = process.argv.slice(2);
let dirs = all;
if (requested.length > 0) {
  const picked = requested.map((name) => {
    const match = all.find((d) => d === name || d.startsWith(name));
    if (!match) throw new Error(`No migration matches "${name}". Available:\n  ${all.join("\n  ")}`);
    return match;
  });
  dirs = all.filter((d) => picked.includes(d)); // keep chronological order
}

const client = createClient({ url, authToken });
for (const dir of dirs) {
  const file = path.join(migrationsDir, dir, "migration.sql");
  const sql = readFileSync(file, "utf8");
  await client.executeMultiple(sql);
  console.log(`applied: ${dir}`);
}
console.log("Schema push complete.");
