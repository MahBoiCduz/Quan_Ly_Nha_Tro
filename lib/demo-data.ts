// Deterministic generator for the *demo* (showcase) dataset.
//
// Everything here is pure: no Prisma, no I/O, no Date.now() unless the caller
// omits `today`. `prisma/seed-demo.ts` takes this dataset and writes it to a
// throwaway local SQLite file so the app can be shown off without exposing the
// family's real tenants, rents or bank details.
//
// All money is an integer number of VND, and every bill's totals come from the
// production helpers in lib/billing.ts — the demo data therefore satisfies the
// same invariants as data created through the UI.

import {
  billStatusFor,
  buildDefaultLineItems,
  computeGrandTotal,
  computeMeterAmount,
  computeSubtotal,
  lineTotal,
  normalizeLineItems,
  type LineItem,
} from "./billing";

export const DEMO_SEED = 20260914;
export const DEMO_MONTHS = 3;

export const ELECTRICITY_RATE = 4000; // đ/kWh
export const WATER_RATE = 35000; // đ/m³

/** Fake monthly rent by floor. */
export const ROOM_RENTS: Record<number, number> = {
  2: 2_800_000,
  3: 3_200_000,
  4: 3_500_000,
};

/** Services attached to every demo room (defaultPrice in VND). */
export const DEMO_SERVICES: DemoService[] = [
  { name: "Internet", measureUnit: "phòng", defaultPrice: 100_000 },
  { name: "Dịch vụ chung", measureUnit: "phòng", defaultPrice: 50_000 },
  { name: "Xe máy", measureUnit: "xe", defaultPrice: 60_000 },
];

export const DEMO_DEFAULT_PROFILE_ID = "default_profile";
export const DEMO_SECOND_PROFILE_ID = "demo_profile_co_owner";

/** Rooms deliberately left vacant — "Phòng 201" keeps e2e/flow.spec.ts working. */
export const VACANT_ROOM_NAMES = ["Phòng 201", "Phòng 405"];

export type DemoRoomType = "room";
export type DemoBillType = "room" | "elec_water" | "both";
export type DemoBillStatus = "unpaid" | "paid" | "overdue";

export type DemoRoom = {
  name: string;
  floor: number;
  type: DemoRoomType;
  baseRent: number;
  status: "occupied" | "vacant";
};

export type DemoTenant = {
  fullName: string;
  phone: string;
  idCardNumber: string;
  vehiclePlate: string;
  notes: string | null;
};

export type DemoService = {
  name: string;
  measureUnit: string;
  defaultPrice: number;
};

export type DemoPayment = {
  amount: number;
  paidAt: Date;
  method: "cash" | "bank_transfer";
  confirmedBy: string;
};

export type DemoBill = {
  periodLabel: string;
  dueDate: Date;
  type: DemoBillType;
  lineItems: LineItem[];
  electricityOld: number | null;
  electricityNew: number | null;
  electricityRate: number | null;
  waterOld: number | null;
  waterNew: number | null;
  waterRate: number | null;
  electricityAmount: number;
  waterAmount: number;
  subtotal: number;
  grandTotal: number;
  status: DemoBillStatus;
  payments: DemoPayment[];
  /** Billing profile for this bill; null = the room's profile / the default. */
  billingProfileId: string | null;
};

export type DemoLease = {
  roomName: string;
  tenant: DemoTenant;
  coTenants: DemoTenant[];
  startDate: Date;
  endDate: null;
  agreedRent: number;
  billingCycle: "monthly";
  depositAmount: number;
  depositCollectedAt: Date;
  depositCollectedBy: string;
  services: DemoService[];
  bills: DemoBill[];
};

export type DemoExpense = {
  date: Date;
  description: string;
  category: string;
  amount: number;
};

export type DemoMaintenance = {
  name: string;
  scope: "building" | "unit";
  roomName: string | null;
  intervalDays: number;
  lastDoneAt: Date | null;
  nextDueAt: Date;
  notes: string | null;
  log: { doneAt: Date; notes: string } | null;
};

export type DemoBillingProfile = {
  id: string;
  name: string;
  bankAccountName: string;
  bankAccountNo: string;
  bankName: string;
  invoiceNotes: string | null;
  isDefault: boolean;
  /** Rooms whose invoices use this profile. */
  roomNames: string[];
};

export type DemoDataset = {
  rooms: DemoRoom[];
  leases: DemoLease[];
  expenses: DemoExpense[];
  maintenance: DemoMaintenance[];
  billingProfiles: DemoBillingProfile[];
  rates: { electricity: number; water: number };
};

// ---------------------------------------------------------------------------
// deterministic randomness
// ---------------------------------------------------------------------------

/** mulberry32 — small, fast, and stable across runs for a given seed. */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length) % items.length];
}

function intBetween(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

// ---------------------------------------------------------------------------
// fake people
// ---------------------------------------------------------------------------

const SURNAMES = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Vũ", "Đặng", "Bùi", "Đỗ", "Ngô"];
const MIDDLE_NAMES = ["Văn", "Thị", "Minh", "Hữu", "Ngọc", "Quang", "Thu", "Anh", "Đức", "Kim"];
const GIVEN_NAMES = [
  "An", "Bình", "Châu", "Dũng", "Giang", "Hà", "Hùng", "Khánh", "Lan", "Mai",
  "Nam", "Phúc", "Quân", "Sơn", "Trang", "Tú", "Vy", "Yến",
];
const COLLECTORS = ["Chủ nhà", "Quản lý toà nhà"];

function digits(value: number, length: number): string {
  return String(value).padStart(length, "0").slice(-length);
}

/** Fake person: the CCCD is an obvious 079-099-... sequence, never a real one. */
export function demoTenant(index: number, rng: () => number): DemoTenant {
  const fullName = `${pick(rng, SURNAMES)} ${pick(rng, MIDDLE_NAMES)} ${GIVEN_NAMES[index % GIVEN_NAMES.length]}`;
  return {
    fullName,
    phone: `09${digits(index * 7 + 11, 2)}${digits(index * 37 + 1234, 4)}${digits(index * 3 + 5, 2)}`,
    idCardNumber: `0790990${digits(index + 1, 5)}`,
    vehiclePlate: `29A-${digits(100 + index * 3, 3)}.${digits(10 + index, 2)}`,
    notes: null,
  };
}

// ---------------------------------------------------------------------------
// dates
// ---------------------------------------------------------------------------

/** Noon on the given day: keeps the calendar date stable across timezones. */
function atNoon(year: number, month: number, day: number): Date {
  return new Date(year, month, day, 12, 0, 0, 0);
}

function shiftDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Start (noon) of the month `monthsAgo` before `today`. */
function monthStart(today: Date, monthsAgo: number): Date {
  return atNoon(today.getFullYear(), today.getMonth() - monthsAgo, 1);
}

export function demoPeriodLabel(today: Date, monthsAgo: number): string {
  const d = new Date(today.getFullYear(), today.getMonth() - monthsAgo, 1);
  return `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`;
}

/**
 * Due date for a period: the 5th of the billed month for past periods, the 30th
 * for the current one (so current-month unpaid bills are not overdue yet).
 */
export function demoDueDate(today: Date, monthsAgo: number): Date {
  const start = monthStart(today, monthsAgo);
  const day = monthsAgo === 0 ? 30 : 5;
  return atNoon(start.getFullYear(), start.getMonth(), day);
}

// ---------------------------------------------------------------------------
// rooms
// ---------------------------------------------------------------------------

export function demoRooms(): DemoRoom[] {
  const rooms: DemoRoom[] = [];
  for (const floor of [2, 3, 4]) {
    for (let n = 1; n <= 5; n++) {
      const name = `Phòng ${floor}0${n}`;
      rooms.push({
        name,
        floor,
        type: "room",
        baseRent: ROOM_RENTS[floor],
        status: VACANT_ROOM_NAMES.includes(name) ? "vacant" : "occupied",
      });
    }
  }
  return rooms;
}

export function demoBillingProfiles(): DemoBillingProfile[] {
  return [
    {
      id: DEMO_DEFAULT_PROFILE_ID,
      name: "Mặc định",
      bankAccountName: "NGUYEN VAN A",
      bankAccountNo: "19001234567890",
      bankName: "Ngân hàng TMCP Kỹ Thương Việt Nam",
      invoiceNotes: "Chuyển khoản ghi rõ số phòng.",
      isDefault: true,
      roomNames: [],
    },
    {
      id: DEMO_SECOND_PROFILE_ID,
      name: "Tài khoản đồng sở hữu",
      bankAccountName: "TRAN THI B",
      bankAccountNo: "0071000123456",
      bankName: "Ngân hàng TMCP Ngoại thương Việt Nam",
      invoiceNotes: null,
      isDefault: false,
      roomNames: ["Phòng 401", "Phòng 402", "Phòng 403"],
    },
  ];
}

// ---------------------------------------------------------------------------
// bills & payments
// ---------------------------------------------------------------------------

/**
 * Which room gets which bill type, so the lists show all three badges.
 * 10 rooms "both", 2 rooms "room" only, 1 room "elec_water" only.
 */
function billTypeForIndex(index: number): DemoBillType {
  if (index === 0 || index === 1) return "room";
  if (index === 2) return "elec_water";
  return "both";
}

type PaymentPlan = "full" | "partial" | "none";

/**
 * Payment behaviour per room & period (monthsAgo: 2 = oldest, 0 = current).
 * Older periods are settled; the current one mixes paid / partly paid / unpaid,
 * and two rooms still owe part of last month (the overdue source).
 */
export function demoPaymentPlan(roomIndex: number, monthsAgo: number): PaymentPlan {
  if (monthsAgo === 2) return "full";
  if (monthsAgo === 1) return roomIndex === 2 || roomIndex === 7 ? "partial" : "full";
  if (roomIndex <= 7) return "full";
  if (roomIndex <= 10) return "partial";
  return "none";
}

function paymentsFor(
  plan: PaymentPlan,
  subtotal: number,
  grandTotal: number,
  dueDate: Date,
  today: Date,
  roomIndex: number,
  rng: () => number,
): DemoPayment[] {
  if (plan === "none") return [];

  const method = roomIndex % 2 === 0 ? "bank_transfer" : "cash";
  const confirmedBy = pick(rng, COLLECTORS);

  // Never pay after "today" — the demo must not contain future receipts.
  const latest = today.getTime() < dueDate.getTime() ? today : dueDate;
  const paidAt = shiftDays(latest, -intBetween(rng, 0, 4));
  // Noon keeps the calendar date stable across timezones, but must not move the
  // timestamp past "now" when the app is seeded before noon.
  paidAt.setHours(12, 0, 0, 0);
  if (paidAt.getTime() > today.getTime()) paidAt.setTime(today.getTime());

  if (plan === "partial") {
    const target = subtotal > 0 ? subtotal : Math.round(grandTotal * 0.6);
    const amount = Math.min(Math.max(target, 1), grandTotal - 1);
    return [{ amount, paidAt, method, confirmedBy }];
  }

  // Full settlement, sometimes as two transfers (exercises multiple payments).
  if (rng() < 0.3 && grandTotal > 1) {
    const first = Math.min(Math.floor(grandTotal * 0.6), grandTotal - 1);
    const firstAt = shiftDays(paidAt, -intBetween(rng, 2, 6));
    return [
      { amount: first, paidAt: firstAt, method, confirmedBy },
      { amount: grandTotal - first, paidAt, method, confirmedBy },
    ];
  }
  return [{ amount: grandTotal, paidAt, method, confirmedBy }];
}

function buildBill(
  type: DemoBillType,
  services: DemoService[],
  agreedRent: number,
  vehicleCount: number,
  electricityOld: number,
  electricityNew: number,
  waterOld: number,
  waterNew: number,
): Omit<DemoBill, "periodLabel" | "dueDate" | "status" | "payments" | "billingProfileId"> {
  const base = buildDefaultLineItems(services, agreedRent);
  // "Xe máy" is the last service row — give this room 1 or 2 motorbikes.
  const rows = base.map((item) =>
    item.measureUnit === "xe"
      ? { ...item, quantity: vehicleCount, total: lineTotal(vehicleCount, item.unitPrice) }
      : item,
  );
  const lineItems = type === "elec_water" ? [] : normalizeLineItems(rows);
  const subtotal = type === "elec_water" ? 0 : computeSubtotal(lineItems);
  const electricityAmount =
    type === "room" ? 0 : computeMeterAmount(electricityOld, electricityNew, ELECTRICITY_RATE);
  const waterAmount =
    type === "room" ? 0 : computeMeterAmount(waterOld, waterNew, WATER_RATE);

  return {
    type,
    lineItems,
    electricityOld: type === "room" ? null : electricityOld,
    electricityNew: type === "room" ? null : electricityNew,
    electricityRate: type === "room" ? null : ELECTRICITY_RATE,
    waterOld: type === "room" ? null : waterOld,
    waterNew: type === "room" ? null : waterNew,
    waterRate: type === "room" ? null : WATER_RATE,
    electricityAmount,
    waterAmount,
    subtotal,
    grandTotal: computeGrandTotal(subtotal, electricityAmount, waterAmount),
  };
}

function buildLease(
  room: DemoRoom,
  index: number,
  today: Date,
  rng: () => number,
  secondProfileRooms: string[],
): DemoLease {
  const tenant = demoTenant(index, rng);
  // Rooms 0, 3, 6, 9 have a spouse sharing the lease (co-tenant).
  const hasCoTenant = index % 3 === 0;
  const coTenants = hasCoTenant ? [demoTenant(index + 20, rng)] : [];
  const startDate = atNoon(today.getFullYear(), today.getMonth() - intBetween(rng, 2, 8), 1);
  const type = billTypeForIndex(index);
  const vehicleCount = rng() < 0.4 ? 2 : 1;
  const billingProfileId = secondProfileRooms.includes(room.name) ? DEMO_SECOND_PROFILE_ID : null;

  // Meter readings walk forward month by month, oldest first.
  let electricity = 1000 + index * 137 + intBetween(rng, 0, 60);
  let water = 120 + index * 7 + intBetween(rng, 0, 5);
  const bills: DemoBill[] = [];

  for (let monthsAgo = DEMO_MONTHS - 1; monthsAgo >= 0; monthsAgo--) {
    const electricityOld = electricity;
    const electricityNew = electricityOld + intBetween(rng, 80, 150);
    const waterOld = water;
    const waterNew = Number((waterOld + intBetween(rng, 8, 16) / 2).toFixed(1));
    electricity = electricityNew;
    water = waterNew;

    const dueDate = demoDueDate(today, monthsAgo);
    const core = buildBill(
      type,
      DEMO_SERVICES,
      room.baseRent,
      vehicleCount,
      electricityOld,
      electricityNew,
      waterOld,
      waterNew,
    );
    const payments = paymentsFor(
      demoPaymentPlan(index, monthsAgo),
      core.subtotal,
      core.grandTotal,
      dueDate,
      today,
      index,
      rng,
    );
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

    bills.push({
      ...core,
      periodLabel: demoPeriodLabel(today, monthsAgo),
      dueDate,
      payments,
      billingProfileId,
      // Mirrors the production write path: "unpaid" on create, then the derived
      // status once at least one payment exists.
      status: payments.length > 0 ? billStatusFor(core.grandTotal, totalPaid, dueDate, today) : "unpaid",
    });
  }

  return {
    roomName: room.name,
    tenant,
    coTenants,
    startDate,
    endDate: null,
    agreedRent: room.baseRent,
    billingCycle: "monthly",
    depositAmount: room.baseRent,
    depositCollectedAt: startDate,
    depositCollectedBy: COLLECTORS[0],
    services: DEMO_SERVICES,
    bills,
  };
}

// ---------------------------------------------------------------------------
// expenses & maintenance
// ---------------------------------------------------------------------------

const EXPENSE_ROWS: { description: string; category: string; amount: number }[] = [
  { description: "Tiền điện khu vực chung", category: "Điện", amount: 1_850_000 },
  { description: "Tiền nước khu vực chung", category: "Nước", amount: 620_000 },
  { description: "Internet Viettel", category: "Internet", amount: 1_076_000 },
  { description: "Sửa máy bơm nước", category: "Sửa chữa", amount: 450_000 },
  { description: "Mua bóng đèn hành lang", category: "Mua sắm", amount: 320_000 },
];

export function demoExpenses(today: Date, rng: () => number): DemoExpense[] {
  const rows: DemoExpense[] = [];
  for (let monthsAgo = DEMO_MONTHS - 1; monthsAgo >= 0; monthsAgo--) {
    for (const row of EXPENSE_ROWS) {
      // 4 of the 5 rows each month, so months differ a little.
      if (rng() < 0.2) continue;
      const start = monthStart(today, monthsAgo);
      // Never date an expense in the future (the current month is partial, and
      // "today at noon" may still be ahead of the current clock time).
      const maxDay = monthsAgo === 0 ? today.getDate() : 26;
      const day = intBetween(rng, 2, Math.max(2, maxDay));
      const date = atNoon(start.getFullYear(), start.getMonth(), day);
      if (date.getTime() > today.getTime()) date.setTime(today.getTime());
      rows.push({
        date,
        description: row.description,
        category: row.category,
        amount: row.amount,
      });
    }
  }
  return rows;
}

export function demoMaintenance(today: Date): DemoMaintenance[] {
  return [
    {
      name: "Vệ sinh bể nước",
      scope: "building",
      roomName: null,
      intervalDays: 90,
      lastDoneAt: shiftDays(today, -98),
      nextDueAt: shiftDays(today, -8), // overdue
      notes: "Bể nước trên sân thượng",
      log: { doneAt: shiftDays(today, -98), notes: "Đã vệ sinh xong" },
    },
    {
      name: "Kiểm tra bình chữa cháy",
      scope: "building",
      roomName: null,
      intervalDays: 180,
      lastDoneAt: shiftDays(today, -176),
      nextDueAt: shiftDays(today, 4), // due soon (≤ 7 days)
      notes: null,
      log: null,
    },
    {
      name: "Thay lọc nước",
      scope: "unit",
      roomName: "Phòng 302",
      intervalDays: 120,
      lastDoneAt: shiftDays(today, -30),
      nextDueAt: shiftDays(today, 90), // ok
      notes: "Lọc nước uống của phòng",
      log: null,
    },
  ];
}

// ---------------------------------------------------------------------------
// the whole dataset
// ---------------------------------------------------------------------------

export function buildDemoDataset(today: Date = new Date(), seed: number = DEMO_SEED): DemoDataset {
  const rng = createRng(seed);
  const rooms = demoRooms();
  const profiles = demoBillingProfiles();
  const secondProfileRooms = profiles.find((p) => p.id === DEMO_SECOND_PROFILE_ID)?.roomNames ?? [];
  const occupied = rooms.filter((r) => r.status === "occupied");

  const leases = occupied.map((room, index) =>
    buildLease(room, index, today, rng, secondProfileRooms),
  );

  return {
    rooms,
    leases,
    expenses: demoExpenses(today, rng),
    maintenance: demoMaintenance(today),
    billingProfiles: profiles,
    rates: { electricity: ELECTRICITY_RATE, water: WATER_RATE },
  };
}
