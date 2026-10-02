// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { copyFileSync, mkdtempSync, readFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { replaceTracking } from "./tracking-server";

const artifactRoot = path.resolve("test-results");
mkdirSync(artifactRoot, { recursive: true });
const temp = mkdtempSync(path.join(artifactRoot, "tracking-db-"));
const file = path.join(temp, "test.db");
copyFileSync(path.resolve("prisma/demo.db"), file);
const db = new PrismaClient({ adapter: new PrismaLibSql({ url: `file:${file.replace(/\\/g, "/")}` }) });
let leaseId: string;
beforeAll(async () => {
  const sql = readFileSync(path.resolve("prisma/migrations/20261001010000_bill_tracking_periods/migration.sql"), "utf8");
  for (const statement of sql.split(";").filter(s => s.trim())) await db.$executeRawUnsafe(statement.replace("CREATE TABLE ", "CREATE TABLE IF NOT EXISTS ").replace("CREATE UNIQUE INDEX ", "CREATE UNIQUE INDEX IF NOT EXISTS ").replace("CREATE INDEX ", "CREATE INDEX IF NOT EXISTS "));
  await db.billTrackingPeriod.deleteMany();
  const lease = await db.lease.findFirstOrThrow({ where: { endDate: null } });
  leaseId = lease.id;
});
// Retain the fixture under ignored test-results: libSQL may hold native file
// handles on Windows after disconnect, and the DB is useful for diagnostics.
afterAll(async () => { await db.$disconnect(); });
async function bill(type = "both") {
  return db.bill.create({ data: { leaseId, type, periodLabel: "Giữ nguyên nhãn", dueDate: new Date("2032-01-05"), lineItems: [], grandTotal: 123456, subtotal: 123456 } });
}
describe("tracking transactions on a real SQLite copy", () => {
  it("assigns cross-year periods without changing money and excludes itself on edit", async () => {
    const b = await bill();
    const input = { type: "both" as const, roomMonths: ["2031-11", "2031-12", "2032-01"], utilityMonths: ["2031-12"] };
    await db.$transaction(tx => replaceTracking(tx, b.id, input));
    await db.$transaction(tx => replaceTracking(tx, b.id, input));
    const result = await db.bill.findUniqueOrThrow({ where: { id: b.id }, include: { trackingPeriods: true } });
    expect(result.trackingPeriods).toHaveLength(4);
    expect(result.grandTotal).toBe(123456);
    expect(result.periodLabel).toBe("Giữ nguyên nhãn");
  });
  it("rejects duplicates and rolls back all changes to an existing invoice", async () => {
    const first = await bill("room"), second = await bill("room");
    await db.$transaction(tx => replaceTracking(tx, first.id, { type: "room", roomMonths: ["2033-01"], utilityMonths: [] }));
    await db.$transaction(tx => replaceTracking(tx, second.id, { type: "room", roomMonths: ["2033-02"], utilityMonths: [] }));
    await expect(db.$transaction(async tx => {
      await tx.bill.update({ where: { id: second.id }, data: { grandTotal: 99 } });
      await replaceTracking(tx, second.id, { type: "room", roomMonths: ["2033-01"], utilityMonths: [] });
    })).rejects.toThrow("Kỳ này đã có hóa đơn");
    const unchanged = await db.bill.findUniqueOrThrow({ where: { id: second.id }, include: { trackingPeriods: true } });
    expect(unchanged.grandTotal).toBe(123456);
    expect(unchanged.trackingPeriods[0].month).toBe("2033-02");
    // Database constraint also protects writes that bypass the preflight check.
    await expect(db.billTrackingPeriod.create({ data: { billId: second.id, leaseId, category: "room", month: "2033-01" } })).rejects.toThrow();
    await db.bill.delete({ where: { id: second.id } });
    expect(await db.billTrackingPeriod.count({ where: { billId: second.id } })).toBe(0);
  });
});
