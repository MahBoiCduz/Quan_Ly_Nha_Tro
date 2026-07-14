// Mimics exactly what hoa-don/page.tsx queries
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const url = process.env.DATABASE_URL;
const token = process.env.DATABASE_AUTH_TOKEN;
const adapter = new PrismaLibSql({ url, authToken: token });
const db = new PrismaClient({ adapter });

db.bill.findMany({
  orderBy: { createdAt: "desc" },
  include: {
    lease: { include: { unit: true, tenant: true } },
    payments: { select: { amount: true } },
  },
}).then(function (bills) {
  console.log("bills.length:", bills.length);
  if (bills.length > 0) {
    const b = bills[0];
    console.log("First bill:", JSON.stringify({
      id: b.id,
      periodLabel: b.periodLabel,
      unitName: b.lease?.unit?.name,
      tenantName: b.lease?.tenant?.fullName,
      grandTotal: b.grandTotal,
      paymentsCount: b.payments?.length,
    }, null, 2));
  }
  const rows = bills.map(function (b) {
    return {
      id: b.id,
      unitName: b.lease.unit.name,
      periodLabel: b.periodLabel,
      tenantName: b.lease.tenant.fullName,
      grandTotal: b.grandTotal,
      dueDate: b.dueDate,
      totalPaid: (b.payments || []).reduce(function (s, p) { return s + p.amount; }, 0),
    };
  });
  console.log("rows.length:", rows.length);
  console.log("All rows:");
  rows.forEach(function (r) {
    console.log(r.unitName, "|", r.periodLabel, "|", r.tenantName, "|", r.grandTotal.toLocaleString("vi-VN") + "d");
  });
  return db.$disconnect();
}).catch(function (e) {
  console.error("QUERY ERROR:", e.message);
  console.error(e.stack);
  return db.$disconnect();
});
