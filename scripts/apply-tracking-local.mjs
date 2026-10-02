// Add only the tracking table to an existing local DB, after a SQLite backup.
// Never reads a Turso auth token or connects to a remote database.
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "dotenv";
import { createClient } from "@libsql/client";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const local = existsSync(path.join(root, ".env.local")) ? parse(readFileSync(path.join(root, ".env.local"))) : {};
const url = process.env.DATABASE_URL ?? local.DATABASE_URL ?? "file:./dev.db";
if (!url.startsWith("file:")) throw new Error("Only an existing local file database is allowed.");
const target = path.resolve(root, url.slice(5));
if (!target.toLowerCase().startsWith((root + path.sep).toLowerCase()) || !existsSync(target)) throw new Error("Database must exist inside this workspace.");
const client = createClient({ url: `file:${target.replace(/\\/g, "/")}` });
try {
  const table = await client.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='BillTrackingPeriod'");
  if (table.rows.length) { console.log("Tracking schema already exists; no changes."); }
  else {
    const bills = await client.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='Bill'");
    if (!bills.rows.length) throw new Error("Database has no existing Bill table; initialize separately.");
    const backup = target.replace(/\.db$/i, "") + `.tracking-backup-${Date.now()}.db`;
    await client.execute(`VACUUM INTO '${backup.replace(/\\/g, "/").replace(/'/g, "''")}'`);
    const sql = readFileSync(path.join(root, "prisma/migrations/20261001010000_bill_tracking_periods/migration.sql"), "utf8");
    await client.batch(sql.split(";").filter(s => s.trim()), "write");
    console.log(`Applied additive tracking schema. Backup: ${path.relative(root, backup)}`);
  }
} finally { client.close(); }
