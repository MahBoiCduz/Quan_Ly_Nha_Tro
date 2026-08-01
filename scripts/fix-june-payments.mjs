import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@libsql/client";

const url = process.env.DATABASE_URL;
const authToken = process.env.DATABASE_AUTH_TOKEN;

if (!url) {
  console.error("DATABASE_URL not found");
  process.exit(1);
}

const client = createClient({ url, authToken });

async function main() {
  console.log("=== Finding June 2026 bills ===");
  const bills = await client.execute(
    "SELECT id, periodLabel, status, grandTotal FROM Bill WHERE periodLabel LIKE '%Tháng 6/2026%' OR periodLabel LIKE '%6/2026%' ORDER BY periodLabel"
  );
  console.log(`Found ${bills.rows.length} bills:`);
  for (const b of bills.rows) {
    console.log(`  ${b.id} | ${b.periodLabel} | ${b.status} | ${b.grandTotal}`);
  }

  const billIds = bills.rows.map((b) => b.id);
  if (billIds.length === 0) {
    console.log("No June bills found. Exiting.");
    process.exit(0);
  }

  console.log("\n=== Current payments for June bills ===");
  const placeholders = billIds.map(() => "?").join(", ");
  const payments = await client.execute({
    sql: `SELECT p.id, p.amount, p.paidAt, p.billId, b.periodLabel
          FROM Payment p
          JOIN Bill b ON b.id = p.billId
          WHERE p.billId IN (${placeholders})
          ORDER BY p.paidAt`,
    args: billIds,
  });

  for (const p of payments.rows) {
    console.log(`  ${p.id} | ${p.periodLabel} | ${p.paidAt} | ${p.amount}`);
  }

  const newPaidAt = "2026-06-30T00:00:00.000Z";
  console.log(`\n=== Updating paidAt to ${newPaidAt} ===`);

  const paymentIds = payments.rows.map((p) => p.id);
  const pPlaceholders = paymentIds.map(() => "?").join(", ");
  await client.execute({
    sql: `UPDATE Payment SET paidAt = ? WHERE id IN (${pPlaceholders})`,
    args: [newPaidAt, ...paymentIds],
  });

  console.log(`Updated ${paymentIds.length} payments.`);

  console.log("\n=== Verification ===");
  const verify = await client.execute({
    sql: `SELECT p.id, p.amount, p.paidAt, b.periodLabel
          FROM Payment p
          JOIN Bill b ON b.id = p.billId
          WHERE p.billId IN (${placeholders})
          ORDER BY p.paidAt`,
    args: billIds,
  });

  for (const p of verify.rows) {
    const d = new Date(p.paidAt);
    console.log(`  ${p.id} | ${p.periodLabel} | ${p.paidAt} | month=${d.getMonth() + 1} | ${p.amount}`);
  }

  console.log("\n=== Payments by month after fix ===");
  const byMonth = await client.execute(
    "SELECT strftime('%Y-%m', paidAt) as month, COUNT(*) as cnt, SUM(amount) as total FROM Payment WHERE paidAt >= '2026-01-01' GROUP BY month ORDER BY month"
  );
  for (const r of byMonth.rows) {
    console.log(`  ${r.month}: ${r.cnt} payments, ${Number(r.total).toLocaleString()} VND`);
  }

  console.log("\nDone!");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
