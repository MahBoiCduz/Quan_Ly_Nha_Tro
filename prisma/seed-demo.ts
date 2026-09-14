// Writes the fake showcase dataset (lib/demo-data.ts) into a LOCAL SQLite file.
//
// Safety rails — this script deletes rows before it writes:
//   1. DATABASE_URL must be a `file:` URL. Remote Turso/libSQL URLs are refused,
//      and no DATABASE_AUTH_TOKEN is ever read.
//   2. The database file name must end with `demo.db` (override with
//      `--allow-other-file` if you really know what you are doing).
//
// Usage:
//   DATABASE_URL="file:./prisma/demo.db" npx tsx prisma/seed-demo.ts
// Usually you just run: npm run demo:reset

import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { hashPassword } from "../lib/auth-password";
import { billStatusFor } from "../lib/billing";
import { buildDemoDataset, DEMO_SERVICES } from "../lib/demo-data";

const url = process.env.DATABASE_URL ?? "file:./dev.db";
const allowOtherFile = process.argv.includes("--allow-other-file");

function refuse(reason: string): never {
  console.error(`\n✖ Từ chối chạy seed demo: ${reason}`);
  console.error(`  DATABASE_URL hiện tại: ${url}`);
  console.error("  Script này XOÁ dữ liệu trong file DB trước khi ghi dữ liệu giả.");
  console.error('  Chỉ chạy với DB demo, ví dụ: DATABASE_URL="file:./prisma/demo.db"\n');
  process.exit(1);
}

if (!url.startsWith("file:")) {
  refuse("chỉ cho phép DB dạng file: (không bao giờ ghi lên Turso).");
}
if (!allowOtherFile && !url.replace(/\\/g, "/").toLowerCase().endsWith("demo.db")) {
  refuse("tên file DB phải kết thúc bằng demo.db (thêm --allow-other-file nếu chắc chắn).");
}

const adapter = new PrismaLibSql({ url, authToken: undefined });
const db = new PrismaClient({ adapter });

async function wipe() {
  // Order matters: children before parents. Tenants point at leases via
  // coLeaseId, and units/bills point at billing profiles.
  await db.payment.deleteMany();
  await db.bill.deleteMany();
  await db.tenant.updateMany({ data: { coLeaseId: null } });
  await db.lease.deleteMany();
  await db.tenant.deleteMany();
  await db.serviceItem.deleteMany();
  await db.maintenanceLog.deleteMany();
  await db.maintenanceSchedule.deleteMany();
  await db.expense.deleteMany();
  await db.unit.updateMany({ data: { billingProfileId: null } });
  await db.unit.deleteMany();
  await db.billingProfile.deleteMany({ where: { isDefault: false } });
}

async function main() {
  const today = new Date();
  const data = buildDemoDataset(today);

  console.log(`→ Ghi dữ liệu demo vào: ${url}`);
  await wipe();

  // --- admin account (credentials come from the environment) -----------------
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@nhatro.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "doimatkhau";
  await db.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: { email: adminEmail, passwordHash: await hashPassword(adminPassword), role: "admin" },
  });

  // --- settings + billing profiles ------------------------------------------
  await db.setting.upsert({
    where: { id: "singleton" },
    update: { defaultElectricityRate: data.rates.electricity, defaultWaterRate: data.rates.water },
    create: { id: "singleton", defaultElectricityRate: data.rates.electricity, defaultWaterRate: data.rates.water },
  });

  const profileIdByRoom = new Map<string, string>();
  for (const profile of data.billingProfiles) {
    const fields = {
      name: profile.name,
      bankAccountName: profile.bankAccountName,
      bankAccountNo: profile.bankAccountNo,
      bankName: profile.bankName,
      invoiceNotes: profile.invoiceNotes,
      isDefault: profile.isDefault,
    };
    await db.billingProfile.upsert({
      where: { id: profile.id },
      update: fields,
      create: { id: profile.id, ...fields },
    });
    for (const roomName of profile.roomNames) profileIdByRoom.set(roomName, profile.id);
  }

  // --- rooms ---------------------------------------------------------------
  const unitIdByRoom = new Map<string, string>();
  for (const room of data.rooms) {
    const unit = await db.unit.create({
      data: {
        name: room.name,
        floor: room.floor,
        type: room.type,
        baseRent: room.baseRent,
        status: room.status,
        billingProfileId: profileIdByRoom.get(room.name) ?? null,
      },
    });
    unitIdByRoom.set(room.name, unit.id);

    // Services belong to the room (not the lease), so vacant rooms get them too.
    for (const service of data.leases.find((l) => l.roomName === room.name)?.services ?? DEMO_SERVICES) {
      await db.serviceItem.create({
        data: {
          unitId: unit.id,
          name: service.name,
          measureUnit: service.measureUnit,
          defaultPrice: service.defaultPrice,
        },
      });
    }
  }

  // --- leases, tenants, bills, payments ------------------------------------
  for (const lease of data.leases) {
    const unitId = unitIdByRoom.get(lease.roomName);
    if (!unitId) throw new Error(`Không tìm thấy phòng ${lease.roomName}`);

    const tenant = await db.tenant.create({
      data: {
        fullName: lease.tenant.fullName,
        phone: lease.tenant.phone,
        idCardNumber: lease.tenant.idCardNumber,
        vehiclePlate: lease.tenant.vehiclePlate,
        notes: lease.tenant.notes,
      },
    });

    const created = await db.lease.create({
      data: {
        unitId,
        tenantId: tenant.id,
        startDate: lease.startDate,
        endDate: null,
        agreedRent: lease.agreedRent,
        billingCycle: lease.billingCycle,
        depositAmount: lease.depositAmount,
        depositCollectedAt: lease.depositCollectedAt,
        depositCollectedBy: lease.depositCollectedBy,
      },
    });

    for (const coTenant of lease.coTenants) {
      await db.tenant.create({
        data: {
          fullName: coTenant.fullName,
          phone: coTenant.phone,
          idCardNumber: coTenant.idCardNumber,
          vehiclePlate: coTenant.vehiclePlate,
          coLeaseId: created.id,
        },
      });
    }

    for (const bill of lease.bills) {
      const createdBill = await db.bill.create({
        data: {
          leaseId: created.id,
          periodLabel: bill.periodLabel,
          dueDate: bill.dueDate,
          status: bill.status,
          type: bill.type,
          lineItems: bill.lineItems,
          electricityAmount: bill.electricityAmount,
          waterAmount: bill.waterAmount,
          electricityOld: bill.electricityOld,
          electricityNew: bill.electricityNew,
          electricityRate: bill.electricityRate,
          waterOld: bill.waterOld,
          waterNew: bill.waterNew,
          waterRate: bill.waterRate,
          subtotal: bill.subtotal,
          grandTotal: bill.grandTotal,
          billingProfileId: bill.billingProfileId,
        },
      });

      for (const payment of bill.payments) {
        await db.payment.create({
          data: {
            billId: createdBill.id,
            amount: payment.amount,
            paidAt: payment.paidAt,
            method: payment.method,
            confirmedBy: payment.confirmedBy,
            receiptImages: [],
          },
        });
      }
    }
  }

  // --- expenses -------------------------------------------------------------
  for (const expense of data.expenses) {
    await db.expense.create({ data: expense });
  }

  // --- maintenance ----------------------------------------------------------
  for (const item of data.maintenance) {
    const schedule = await db.maintenanceSchedule.create({
      data: {
        name: item.name,
        scope: item.scope,
        unitId: item.roomName ? (unitIdByRoom.get(item.roomName) ?? null) : null,
        intervalDays: item.intervalDays,
        lastDoneAt: item.lastDoneAt,
        nextDueAt: item.nextDueAt,
        notes: item.notes,
      },
    });
    if (item.log) {
      await db.maintenanceLog.create({
        data: { scheduleId: schedule.id, doneAt: item.log.doneAt, notes: item.log.notes },
      });
    }
  }

  // --- read back & report ---------------------------------------------------
  const [units, occupied, leases, tenants, bills, payments, expenses, schedules] = await Promise.all([
    db.unit.count(),
    db.unit.count({ where: { status: "occupied" } }),
    db.lease.count(),
    db.tenant.count(),
    db.bill.findMany({
      select: { grandTotal: true, dueDate: true, status: true, periodLabel: true, payments: { select: { amount: true } } },
    }),
    db.payment.findMany({ select: { amount: true } }),
    db.expense.findMany({ select: { amount: true } }),
    db.maintenanceSchedule.count(),
  ]);

  const collected = payments.reduce((sum, p) => sum + p.amount, 0);
  const spent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const overdue = bills.filter(
    (b) =>
      billStatusFor(b.grandTotal, b.payments.reduce((s, p) => s + p.amount, 0), b.dueDate, today) ===
      "overdue",
  ).length;
  const outstanding = bills.reduce((sum, b) => {
    const remaining = b.grandTotal - b.payments.reduce((s, p) => s + p.amount, 0);
    return sum + Math.max(0, remaining);
  }, 0);

  console.log("\n✓ Dữ liệu demo đã ghi xong");
  console.log(`  Phòng: ${units} (${occupied} đang thuê, ${units - occupied} trống) · Hợp đồng: ${leases} · Khách: ${tenants}`);
  console.log(`  Hoá đơn: ${bills.length} (quá hạn: ${overdue}) · Lần thu: ${payments.length} · Tổng thu: ${collected.toLocaleString("vi-VN")} ₫`);
  console.log(`  Còn phải thu: ${outstanding.toLocaleString("vi-VN")} ₫ · Chi: ${spent.toLocaleString("vi-VN")} ₫ · Lịch bảo trì: ${schedules}`);
  console.log(`  Đăng nhập: ${adminEmail} / ${process.env.SEED_ADMIN_PASSWORD ?? "doimatkhau"}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
