export type LineItem = {
  name: string;
  measureUnit: string;
  /** Quantity in the line's own unit: occupants, motorbikes, kWh, m³, rooms… */
  quantity: number;
  unitPrice: number;
  /**
   * How many months this line is charged for. Rent and services carry it so the
   * printed bill can show "quantity (units)" and "months" as two columns.
   * Bills created before this field existed have no `months`: always read it
   * through `monthsOrOne`, never directly.
   */
  months?: number;
  /** True when `quantity` is the room's occupancy (a per-person service). */
  perPerson?: boolean;
  total: number;
};

export function lineTotal(quantity: number, unitPrice: number): number {
  return quantity * unitPrice;
}

/** Months of a line item: missing, 0, negative or NaN ⇒ 1 (legacy bills). */
export function monthsOrOne(months?: number): number {
  if (typeof months !== "number" || !Number.isFinite(months) || months < 1) return 1;
  return Math.trunc(months);
}

/** A line's amount = quantity (units) × unitPrice × months. */
export function lineAmount(quantity: number, unitPrice: number, months?: number): number {
  return lineTotal(quantity * monthsOrOne(months), unitPrice);
}

/**
 * Rows for a newly generated bill. Per-person services bill every occupant
 * (`occupancy`), other services bill the room's own `defaultQuantity` — a
 * service whose quantity works out to 0 is dropped, so a room with no motorbike
 * never prints a 0 ₫ line. Months live in their own axis (`months`), which is
 * why the rent line is quantity 1 × months instead of quantity = months.
 */
export function buildDefaultLineItems(
  services: {
    name: string;
    measureUnit: string;
    defaultPrice: number;
    perPerson?: boolean;
    defaultQuantity?: number;
  }[],
  agreedRent: number,
  months = 1,
  occupancy = 1,
): LineItem[] {
  const n = monthsOrOne(months);
  const people = Math.max(1, Math.trunc(occupancy) || 1);
  const items: LineItem[] = [];
  for (const s of services) {
    const quantity = s.perPerson ? people : (s.defaultQuantity ?? 1);
    if (quantity <= 0) continue;
    items.push({
      name: s.name,
      measureUnit: s.measureUnit,
      quantity,
      unitPrice: s.defaultPrice,
      months: n,
      perPerson: s.perPerson || undefined,
      total: lineAmount(quantity, s.defaultPrice, n),
    });
  }
  items.push({
    name: "Tiền thuê phòng",
    measureUnit: "phòng",
    quantity: 1,
    unitPrice: agreedRent,
    months: n,
    total: lineAmount(1, agreedRent, n),
  });
  return items;
}

// Recompute each line's total from quantity × unitPrice × months — the server's
// source of truth for the editable bill table (client-sent totals are never
// trusted). A legacy row without `months` keeps its old amount: quantity was
// then measured in months.
export function normalizeLineItems(
  items: {
    name: string;
    measureUnit?: string;
    unitPrice: number;
    quantity: number;
    months?: number;
    perPerson?: boolean;
  }[],
): LineItem[] {
  return items.map((i) => {
    const months = monthsOrOne(i.months);
    return {
      name: i.name,
      measureUnit: i.measureUnit ?? "",
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      months,
      perPerson: i.perPerson || undefined,
      total: lineAmount(i.quantity, i.unitPrice, months),
    };
  });
}

export function computeSubtotal(items: LineItem[]): number {
  return items.reduce((sum, i) => sum + i.total, 0);
}

export function computeGrandTotal(subtotal: number, electricity: number, water: number): number {
  return subtotal + electricity + water;
}

/** Money for a metered utility: (newReading − oldReading) × unit price, never negative. */
export function computeMeterAmount(oldReading: number, newReading: number, rate: number): number {
  return Math.max(0, Math.round((newReading - oldReading) * rate));
}

/** Compare two Dates using only the Vietnam date (yyyy-mm-dd), so the result is
 *  consistent regardless of whether the server runs in UTC or ICT. */
function vnDate(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(d);
}

export function billStatusFor(
  grandTotal: number,
  totalPaid: number,
  dueDate: Date,
  now: Date = new Date(),
): "paid" | "overdue" | "unpaid" {
  if (totalPaid >= grandTotal) return "paid";
  if (vnDate(now) >= vnDate(dueDate)) return "overdue";
  return "unpaid";
}

// Vietnamese labels for a bill's `type` column, shown as a badge in the bill
// lists so electricity/water bills ("Điện nước") are distinguishable from
// room-only ("Tiền phòng") and combined ("Phòng + Điện nước") bills.
const BILL_TYPE_LABEL: Record<string, string> = {
  room: "Tiền phòng",
  elec_water: "Điện nước",
  both: "Phòng + Điện nước",
};

export function billTypeLabel(type: string): string {
  return BILL_TYPE_LABEL[type] ?? "Hóa đơn";
}
