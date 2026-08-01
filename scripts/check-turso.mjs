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
  // Query all payments in 2026 by month
  console.log("=== Payments by month in 2026 ===");
  const payByMonth = await client.execute(
    "SELECT strftime('%Y-%m', paidAt) as month, COUNT(*) as cnt, SUM(amount) as total FROM Payment WHERE paidAt >= '2026-01-01' GROUP BY month ORDER BY month"
  );
  console.log(JSON.stringify(payByMonth.rows, null, 2));

  // Query all distinct periodLabels
  console.log("\n=== All period labels ===");
  const labels = await client.execute(
    "SELECT DISTINCT periodLabel FROM Bill ORDER BY periodLabel"
  );
  console.log(labels.rows.map(r => r.periodLabel).join("\n"));

  // Query June 2026 bills with their payments
  console.log("\n=== Bills with T6 or 6/2026 ===");
  const bills = await client.execute(
    "SELECT id, periodLabel, status, grandTotal FROM Bill WHERE periodLabel LIKE '%6/2026%' OR periodLabel LIKE '%06/2026%' OR periodLabel LIKE '%T6%' ORDER BY periodLabel"
  );
  for (const b of bills.rows) {
    const pms = await client.execute(
      "SELECT amount, paidAt FROM Payment WHERE billId = ?",
      [b.id]
    );
    const paid = pms.rows.reduce((s, p) => s + p.amount, 0);
    console.log(`${b.periodLabel} | status=${b.status} | grandTotal=${b.grandTotal} | paid=${paid} | numPayments=${pms.rows.length}`);
  }

  // Simulate dashboard query
  console.log("\n=== Dashboard simulation ===");
  const now = new Date();
  const since = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  console.log("now:", now.toISOString(), "| month:", now.getMonth());
  console.log("since:", since.toISOString(), "| month:", since.getMonth());

  const dashPayments = await client.execute({
    sql: "SELECT amount, paidAt FROM Payment WHERE paidAt >= ? ORDER BY paidAt",
    args: [since.toISOString()],
  });
  console.log(`Payments since ${since.toISOString()}: ${dashPayments.rows.length}`);
  for (const p of dashPayments.rows) {
    const d = new Date(p.paidAt);
    console.log(`  paidAt=${p.paidAt} | jsMonth=${d.getMonth()}+1=${d.getMonth()+1} | amount=${p.amount}`);
  }

  // Manual monthlyRevenue simulation
  console.log("\n=== Manual monthlyRevenue ===");
  const months = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: `Th${d.getMonth() + 1}/${d.getFullYear()}`,
      total: 0,
    });
  }
  console.log("Months:", months.map(m => m.key + " " + m.label).join(", "));
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
