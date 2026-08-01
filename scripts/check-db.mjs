import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, "..", "prisma", "dev.db");
const db = new Database(dbPath);

// Check all tables
const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
  .all();
console.log("=== All Tables ===");
console.log(tables.map((t) => t.name).join("\n"));

// Check _Migration table for recent migrations
try {
  const migrations = db
    .prepare("SELECT migration_name FROM _prisma_migrations ORDER BY migration_name DESC LIMIT 5")
    .all();
  console.log("\n=== Recent Migrations ===");
  console.log(migrations.map((m) => m.migration_name).join("\n"));
} catch (e) {
  console.log("No _prisma_migrations table: " + e.message);
}

db.close();
