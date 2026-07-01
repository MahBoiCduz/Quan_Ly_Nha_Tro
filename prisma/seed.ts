import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { hashPassword } from "../lib/auth-password";

// Same libSQL adapter as lib/db.ts: seeds a local file DB or a remote Turso DB
// depending on DATABASE_URL / DATABASE_AUTH_TOKEN.
const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
  authToken: process.env.DATABASE_AUTH_TOKEN,
});
const db = new PrismaClient({ adapter });

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@nhatro.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "doimatkhau";

  await db.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: { email: adminEmail, passwordHash: await hashPassword(adminPassword), role: "admin" },
  });

  // 15 rooms on floors 2-4: 201..205, 301..305, 401..405 (floor 1 is the gym).
  for (const floor of [2, 3, 4]) {
    for (let n = 1; n <= 5; n++) {
      const name = `Phòng ${floor}0${n}`;
      const existing = await db.unit.findFirst({ where: { name } });
      if (!existing) {
        await db.unit.create({
          data: { name, floor, type: "room", baseRent: 0, status: "vacant" },
        });
      }
    }
  }

  // 1 commercial space (gym) on floor 1.
  const gymName = "Mặt bằng tầng 1 (Gym)";
  const gym = await db.unit.findFirst({ where: { name: gymName } });
  if (!gym) {
    await db.unit.create({
      data: { name: gymName, floor: 1, type: "commercial", baseRent: 0, status: "occupied" },
    });
  }

  // Settings singleton row.
  await db.setting.upsert({ where: { id: "singleton" }, update: {}, create: { id: "singleton" } });

  // Default payment profile — the invoice fallback when a bill/room picks none.
  await db.billingProfile.upsert({
    where: { id: "default_profile" },
    update: {},
    create: { id: "default_profile", name: "Mặc định", isDefault: true },
  });

  console.log("Seed complete: admin user + 16 units + default billing profile.");
}

main().finally(() => db.$disconnect());
