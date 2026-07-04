// Imports monthly bills from the landlord's "Thông tin thuê nhà" Excel workbook
// into the app database.
//
// The workbook layout this understands:
//   - One sheet per billing cycle (e.g. "7.2026"): a block per room with
//     "PHÒNG <n>", "Kì thanh toán: ...", "Người thuê: ...", a service table
//     (TT / Các dịch vụ / Đơn vị tính / Số lượng / Đơn giá / Thành tiền) and a
//     "Tổng tiền nhà và DV" row. Amounts are in THOUSANDS of VND. Multi-month
//     bills put the real charged amount in the last "Thành tiền" column, so
//     quantity is derived as thànhTiền ÷ đơnGiá (e.g. 2.5 months → qty 2.5).
//   - A utility sheet ("Điện, nước theo tháng2026") whose summary block
//     (columns P..Y) holds the authoritative old/new meter readings and the
//     billed amounts for the current cycle.
//
// Usage (dry-run prints the planned bills and writes nothing):
//   node scripts/import-bills-from-xlsx.mjs --file "<path>.xlsx" --sheet 7.2026 --due 2026-07-07
// Add --apply to actually create the bills (skips any room whose active lease
// already has a bill with the same period label, so re-running is safe):
//   DATABASE_URL=... DATABASE_AUTH_TOKEN=... node scripts/import-bills-from-xlsx.mjs --file ... --sheet 7.2026 --due 2026-07-07 --apply
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const XLSX = require("xlsx");

const ELECTRICITY_RATE = 4000; // đ/kWh — cross-checked against the sheet's "Thành tiền Điện"
const WATER_RATE = 35000; // đ/m³ — cross-checked against "Thành tiền nước"
const UTILITY_SHEET = "Điện, nước theo tháng2026";

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const file = opt("file");
const sheetName = opt("sheet");
const due = opt("due");
const apply = args.includes("--apply");
if (!file || !sheetName || !due) {
  console.error('Usage: node scripts/import-bills-from-xlsx.mjs --file "<path>.xlsx" --sheet 7.2026 --due YYYY-MM-DD [--apply]');
  process.exit(1);
}

const wb = XLSX.readFile(file);
const grid = (name) => {
  if (!wb.Sheets[name]) throw new Error(`Sheet "${name}" not found. Available: ${wb.SheetNames.join(", ")}`);
  return XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true, defval: null });
};
const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const lastNum = (row, from, to) => {
  let out = null;
  for (let i = from; i <= to; i++) if (num(row[i]) != null) out = row[i];
  return out;
};
const round = (v) => Math.round(v);
// Most blocks write money in THOUSANDS ("4800" = 4.8tr) but some write full
// VND ("6600000"). Rents/fees in thousands never reach 50000, real-VND values
// are always ≥ 50000 — use that gap to normalise.
const toVnd = (v) => (v >= 50000 ? round(v) : round(v * 1000));

// ---- utility sheet: summary block at columns P..Y (indexes 15..24) ----
const utilities = new Map(); // room number -> readings
for (const row of grid(UTILITY_SHEET)) {
  const room = num(row[15]);
  if (room == null || num(row[17]) == null) continue;
  utilities.set(room, {
    elecOld: row[16], elecNew: row[17], sheetElecAmount: round(row[19] ?? 0),
    waterOld: row[20], waterNew: row[21], sheetWaterAmount: round(row[23] ?? 0),
  });
}

// ---- bill sheet: split into PHÒNG blocks ----
const rows = grid(sheetName);
const findRoom = (row) => {
  for (let i = 0; i <= 8; i++) {
    const m = /^PHÒNG\s+(\d+)/i.exec(String(row[i] ?? "").trim());
    if (m) return Number(m[1]);
  }
  return null;
};
const starts = [];
rows.forEach((row, i) => {
  const room = findRoom(row);
  if (room != null) starts.push({ i, room });
});

const warnings = [];
const bills = [];
for (let b = 0; b < starts.length; b++) {
  const { i: start, room } = starts[b];
  const end = b + 1 < starts.length ? starts[b + 1].i : rows.length;
  const block = rows.slice(start, end);

  let periodLabel = null, tenant = null, expectedSubtotal = null;
  const items = [];
  // Multi-month blocks add extra "Thành tiền N tháng" columns — the real
  // charged amount is always in the LAST "Thành tiền" column of the header.
  let chargedCol = 6;
  let inTable = false;
  for (const row of block) {
    const c1 = String(row[1] ?? "").trim();
    if (c1.startsWith("Kì thanh toán:")) periodLabel = c1.replace("Kì thanh toán:", "").trim();
    else if (c1.startsWith("Người thuê:")) tenant = c1.replace("Người thuê:", "").replace(/\s+/g, " ").trim();
    else if (c1 === "TT") {
      inTable = true;
      for (let i = 2; i <= 10; i++) if (String(row[i] ?? "").includes("Thành tiền")) chargedCol = i;
    } else if (c1.startsWith("Tổng tiền nhà")) {
      inTable = false;
      const v = num(row[chargedCol]) ?? lastNum(row, 2, chargedCol);
      if (v != null) expectedSubtotal = toVnd(v);
    } else if (inTable && num(row[1]) != null && String(row[2] ?? "").trim() !== "") {
      const name = String(row[2]).trim();
      const measureUnit = String(row[3] ?? "").trim();
      const sl = num(row[4]) ?? 0;
      const rawPrice = num(row[5]) ?? 0;
      const unitPrice = rawPrice > 0 ? toVnd(rawPrice) : 0;
      const rawCharged = num(row[chargedCol]) ?? 0;
      const charged = rawCharged > 0 ? toVnd(rawCharged) : 0;
      // Multi-month bills: the charged amount already covers the whole period.
      const quantity = unitPrice > 0 ? Math.round((charged / unitPrice) * 100) / 100 : sl;
      items.push({ name, measureUnit, quantity, unitPrice, total: round(quantity * unitPrice) });
    }
  }

  const subtotal = items.reduce((s, it) => s + it.total, 0);
  if (expectedSubtotal != null && subtotal !== expectedSubtotal) {
    warnings.push(`Phòng ${room}: tổng dịch vụ tính ra ${subtotal} ≠ ${expectedSubtotal} trong sheet`);
  }

  const u = utilities.get(room);
  if (!u) warnings.push(`Phòng ${room}: không có dữ liệu điện nước trong sheet — điện nước = 0`);
  const electricityAmount = u ? round((u.elecNew - u.elecOld) * ELECTRICITY_RATE) : 0;
  const waterAmount = u ? round((u.waterNew - u.waterOld) * WATER_RATE) : 0;
  if (u && electricityAmount !== u.sheetElecAmount) {
    warnings.push(`Phòng ${room}: tiền điện tính ra ${electricityAmount} ≠ ${u.sheetElecAmount} trong sheet`);
  }
  if (u && Math.abs(waterAmount - u.sheetWaterAmount) > 1) {
    warnings.push(`Phòng ${room}: tiền nước tính ra ${waterAmount} ≠ ${u.sheetWaterAmount} trong sheet`);
  }

  bills.push({
    room, unitName: `Phòng ${room}`, periodLabel, tenant, items, subtotal,
    electricityOld: u?.elecOld ?? 0, electricityNew: u?.elecNew ?? 0, electricityRate: ELECTRICITY_RATE, electricityAmount,
    waterOld: u?.waterOld ?? 0, waterNew: u?.waterNew ?? 0, waterRate: WATER_RATE, waterAmount,
    grandTotal: subtotal + electricityAmount + waterAmount,
  });
}

// Rooms that have utility usage this cycle but no bill block in the sheet.
for (const [room, u] of utilities) {
  if (!bills.some((x) => x.room === room) && (u.elecNew > u.elecOld || u.waterNew > u.waterOld)) {
    warnings.push(`Phòng/khu ${room}: có điện nước (${u.sheetElecAmount + u.sheetWaterAmount}đ) nhưng không có khối hoá đơn trong sheet ${sheetName} — bỏ qua`);
  }
}

const fmt = (n) => n.toLocaleString("vi-VN");
console.log(`\n=== ${bills.length} hoá đơn từ sheet "${sheetName}" — hạn thanh toán ${due} ===\n`);
for (const bl of bills) {
  console.log(`Phòng ${bl.room} — "${bl.periodLabel}" — ${bl.tenant ?? "?"}`);
  for (const it of bl.items) console.log(`   ${it.name}: ${it.quantity} × ${fmt(it.unitPrice)} = ${fmt(it.total)}`);
  console.log(`   Điện: ${bl.electricityOld} → ${bl.electricityNew} = ${fmt(bl.electricityAmount)} | Nước: ${bl.waterOld} → ${bl.waterNew} = ${fmt(bl.waterAmount)}`);
  console.log(`   TỔNG: ${fmt(bl.grandTotal)}\n`);
}
if (warnings.length) {
  console.log("=== CẢNH BÁO ===");
  warnings.forEach((w) => console.log(" ⚠ " + w));
}

if (!apply) {
  console.log("\nDry-run: chưa ghi gì vào database. Thêm --apply để tạo hoá đơn.");
  process.exit(0);
}

// ---- write to the database (same adapter setup as prisma/seed.ts) ----
const { PrismaClient } = require("@prisma/client");
const { PrismaLibSql } = require("@prisma/adapter-libsql");
const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
  authToken: process.env.DATABASE_AUTH_TOKEN,
});
const db = new PrismaClient({ adapter });

const today = new Date();
let created = 0, skipped = 0;
for (const bl of bills) {
  const unit = await db.unit.findFirst({ where: { name: bl.unitName }, include: { leases: true } });
  if (!unit) { console.log(`✗ ${bl.unitName}: không có phòng này trong app — BỎ QUA`); skipped++; continue; }
  const lease = unit.leases
    .filter((l) => l.startDate <= today && (!l.endDate || l.endDate >= today))
    .sort((a, b) => b.startDate - a.startDate)[0];
  if (!lease) { console.log(`✗ ${bl.unitName}: không có hợp đồng đang hiệu lực — BỎ QUA`); skipped++; continue; }
  const existing = await db.bill.findFirst({ where: { leaseId: lease.id, periodLabel: bl.periodLabel } });
  if (existing) { console.log(`• ${bl.unitName}: đã có hoá đơn "${bl.periodLabel}" — BỎ QUA`); skipped++; continue; }
  await db.bill.create({
    data: {
      leaseId: lease.id,
      periodLabel: bl.periodLabel,
      dueDate: new Date(due),
      status: "unpaid",
      lineItems: bl.items,
      electricityAmount: bl.electricityAmount,
      waterAmount: bl.waterAmount,
      electricityOld: Math.round(bl.electricityOld),
      electricityNew: Math.round(bl.electricityNew),
      electricityRate: bl.electricityRate,
      waterOld: bl.waterOld,
      waterNew: bl.waterNew,
      waterRate: bl.waterRate,
      subtotal: bl.subtotal,
      grandTotal: bl.grandTotal,
    },
  });
  console.log(`✓ ${bl.unitName}: đã tạo "${bl.periodLabel}" — ${fmt(bl.grandTotal)}đ`);
  created++;
}
console.log(`\nXong: tạo ${created}, bỏ qua ${skipped}.`);
await db.$disconnect();
