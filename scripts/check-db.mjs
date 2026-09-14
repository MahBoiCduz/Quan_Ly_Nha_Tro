// Kiểm tra nhanh database đang được trỏ tới — chạy được cho CẢ HAI:
//   • DB local (dev / demo):  DATABASE_URL="file:./prisma/demo.db" trong .env.local
//   • DB production (Turso): DATABASE_URL="libsql://…" + DATABASE_AUTH_TOKEN
//
// Cách dùng:
//   node scripts/check-db.mjs                     # theo .env.local
//   DATABASE_URL="libsql://…" DATABASE_AUTH_TOKEN="…" node scripts/check-db.mjs
//   node scripts/check-db.mjs --url "libsql://…" --token "…"   # chọc thẳng 1 DB khác
//
// Nhờ dùng @libsql/client (giống lib/db.ts) nên cùng một script đọc được cả file
// SQLite lẫn Turso — trước đây script này hardcode prisma/dev.db nên chỉ đọc được
// một file rỗng.

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@libsql/client";

const args = process.argv.slice(2);
const opt = (name) => {
  const found = args.find((arg) => arg.startsWith(`--${name}=`));
  if (found) return found.slice(name.length + 3);
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};

const url = opt("url") ?? process.env.DATABASE_URL;
const authToken = opt("token") ?? process.env.DATABASE_AUTH_TOKEN;
const isRemote = Boolean(url && !url.startsWith("file:"));

if (!url) {
  console.error("✖ Không có DATABASE_URL. Đặt trong .env.local hoặc truyền --url \"…\".");
  process.exit(1);
}

const client = createClient({ url, authToken });

const TABLES = [
  "Unit",
  "ServiceItem",
  "Tenant",
  "Lease",
  "Bill",
  "Payment",
  "Expense",
  "MaintenanceSchedule",
  "MaintenanceLog",
  "BillingProfile",
  "Setting",
  "User",
];

const n = (value) => Number(value ?? 0).toLocaleString("vi-VN");

async function main() {
  console.log("=== Kết nối ===");
  console.log(`URL : ${url}`);
  console.log(`Kiểu: ${isRemote ? "remote (Turso)" : "file local"}${authToken ? " · có auth token" : ""}`);

  // Bảng đang có
  const tables = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
  );
  const names = tables.rows.map((row) => String(row.name));
  console.log("\n=== Bảng ===");
  if (names.length === 0) {
    console.log("(chưa có bảng nào — DB trống? chạy `npm run demo:reset` hoặc `npx prisma db push`)");
  } else {
    console.log(names.join(", "));
  }

  // Số dòng các bảng chính
  console.log("\n=== Số dòng ===");
  for (const table of TABLES) {
    if (!names.includes(table)) continue;
    const result = await client.execute(`SELECT COUNT(*) AS n FROM "${table}"`);
    console.log(`  ${table.padEnd(20)} ${n(result.rows[0]?.n)}`);
  }

  // Migration (DB tạo bằng `db push` sẽ không có bảng này)
  console.log("\n=== Migration ===");
  if (names.includes("_prisma_migrations")) {
    const migrations = await client.execute(
      "SELECT migration_name FROM _prisma_migrations ORDER BY migration_name",
    );
    console.log(`  đã áp dụng ${migrations.rows.length} migration:`);
    for (const row of migrations.rows) console.log(`    ${row.migration_name}`);
  } else {
    console.log("  (không có bảng _prisma_migrations — DB local dùng `prisma db push`)");
  }

  // Vài con số nghiệp vụ để mắt thường kiểm tra nhanh
  if (names.includes("Bill")) {
    console.log("\n=== Nhanh ===");
    const money = await client.execute(
      `SELECT
         (SELECT COUNT(*) FROM Bill) AS bills,
         (SELECT COUNT(*) FROM Bill WHERE status = 'paid') AS paidBills,
         (SELECT COALESCE(SUM(amount), 0) FROM Payment) AS collected,
         (SELECT COALESCE(SUM(amount), 0) FROM Expense) AS spent,
         (SELECT COALESCE(SUM(MAX(grandTotal - COALESCE(paid, 0), 0)), 0) FROM Bill
            LEFT JOIN (SELECT billId, SUM(amount) AS paid FROM Payment GROUP BY billId) p
              ON p.billId = Bill.id) AS outstanding`,
    );
    const row = money.rows[0];
    console.log(`  hoá đơn: ${n(row?.bills)} (đã thu ${n(row?.paidBills)})`);
    console.log(`  tổng thu: ${n(row?.collected)} đ · tổng chi: ${n(row?.spent)} đ`);
    console.log(`  còn phải thu: ${n(row?.outstanding)} đ`);
    const periods = await client.execute(
      "SELECT periodLabel, COUNT(*) AS n FROM Bill GROUP BY periodLabel ORDER BY periodLabel",
    );
    console.log("  hoá đơn theo kỳ:");
    for (const item of periods.rows) {
      console.log(`    ${String(item.periodLabel)} — ${n(item.n)}`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n✖ Không đọc được database:", error instanceof Error ? error.message : error);
    process.exit(1);
  });
