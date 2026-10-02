// Populate only the bundled fake demo database; keep Phòng 303 as legacy examples.
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const db = new PrismaClient({ adapter: new PrismaLibSql({ url: `file:${path.join(root, "prisma/demo.db").replace(/\\/g, "/")}` }) });
try {
  const bills = await db.bill.findMany({ include: { trackingPeriods: true, lease: { include: { unit: true } } } });
  let assigned = 0;
  for (const b of bills) {
    if (b.trackingPeriods.length || b.lease.unit.name === "Phòng 303") continue;
    const match = /^Tháng (\d{1,2})\/(\d{4})$/.exec(b.periodLabel);
    if (!match) continue;
    const month = `${match[2]}-${match[1].padStart(2, "0")}`;
    const categories = b.type === "both" ? ["room", "elec_water"] : [b.type];
    await db.billTrackingPeriod.createMany({ data: categories.map(category => ({ billId: b.id, leaseId: b.leaseId, month, category })) });
    assigned++;
  }
  console.log(`Demo: assigned ${assigned} invoices; legacy examples retained in Phòng 303.`);
} finally { await db.$disconnect(); }
