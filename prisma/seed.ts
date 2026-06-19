import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";
import { hashPassword } from "../lib/auth-password";

const adapter = new PrismaBetterSqlite3({ url: path.resolve(process.cwd(), "dev.db") });
const db = new PrismaClient({ adapter });

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@nhatro.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "doimatkhau";

  await db.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: { email: adminEmail, passwordHash: await hashPassword(adminPassword), role: "admin" },
  });

  // 15 rooms: floors 1-3, rooms x01..x05 per floor.
  for (const floor of [1, 2, 3]) {
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

  console.log("Seed complete: admin user + 16 units.");
}

main().finally(() => db.$disconnect());
