import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // All payments in 2026 grouped by month
  const payments = await prisma.payment.findMany({
    where: { paidAt: { gte: new Date("2026-01-01") } },
    select: { amount: true, paidAt: true, bill: { select: { periodLabel: true, status: true } } },
    orderBy: { paidAt: "asc" },
  });
  console.log("=== All payments in 2026 ===");
  const byMonth = {};
  for (const p of payments) {
    const key = p.paidAt.toISOString().substring(0, 7);
    byMonth[key] = (byMonth[key] || 0) + p.amount;
  }
  for (const [k, v] of Object.entries(byMonth)) {
    console.log(k + ": " + v.toLocaleString() + " VND");
  }

  // Bills with periodLabel containing 6/2026 or T6
  console.log("\n=== June 2026 bills ===");
  const bills = await prisma.bill.findMany({
    where: {
      OR: [
        { periodLabel: { contains: "6/2026" } },
        { periodLabel: { contains: "06/2026" } },
        { periodLabel: { contains: "T6" } },
      ],
    },
    include: { payments: { select: { amount: true, paidAt: true } } },
    orderBy: { periodLabel: "asc" },
  });
  for (const b of bills) {
    const paid = b.payments.reduce((s, p) => s + p.amount, 0);
    console.log(
      b.periodLabel +
        " | status=" +
        b.status +
        " | grandTotal=" +
        b.grandTotal +
        " | paid=" +
        paid +
        " | payments=" +
        b.payments.length
    );
  }

  // Also check all periodLabels to understand format
  console.log("\n=== All distinct periodLabel values ===");
  const allBills = await prisma.bill.findMany({
    select: { periodLabel: true },
    distinct: ["periodLabel"],
    orderBy: { periodLabel: "asc" },
  });
  console.log(allBills.map((b) => b.periodLabel).join("\n"));

  // Show the dashboard query exactly as it would run
  const now = new Date();
  const since = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  console.log("\n=== Dashboard query debug ===");
  console.log("now:", now);
  console.log("now.getMonth():", now.getMonth());
  console.log("since:", since);

  const dashPayments = await prisma.payment.findMany({
    where: { paidAt: { gte: since } },
    select: { amount: true, paidAt: true },
    orderBy: { paidAt: "asc" },
  });
  console.log("Payments found since " + since.toISOString() + ": " + dashPayments.length);
  for (const p of dashPayments) {
    console.log("  " + p.paidAt.toISOString() + " -> " + p.amount);
  }

  await prisma.$disconnect();
}

main();
