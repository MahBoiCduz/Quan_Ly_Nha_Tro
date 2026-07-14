const { PrismaClient } = require("@prisma/client");
const { PrismaLibSql } = require("@prisma/adapter-libsql");

const url = process.env.DATABASE_URL;
const token = process.env.DATABASE_AUTH_TOKEN;
console.log("Connecting to:", url);

const adapter = new PrismaLibSql({ url, authToken: token });
const db = new PrismaClient({ adapter });

db.bill.findMany({
  include: { lease: { include: { unit: true, tenant: true } }, payments: true },
  orderBy: { createdAt: "desc" },
}).then(function (bills) {
  console.log("Total bills:", bills.length);
  bills.slice(0, 20).forEach(function (b) {
    console.log(
      b.lease?.unit?.name,
      "|", b.periodLabel,
      "|", b.status,
      "|", b.type,
      "|", (b.grandTotal || 0).toLocaleString("vi-VN") + "d",
      "| payments:", b.payments.length,
      "|", b.createdAt?.toISOString().slice(0, 10)
    );
  });
  return db.$disconnect();
}).catch(function (e) {
  console.error("ERR:", e.message);
  return db.$disconnect();
});
