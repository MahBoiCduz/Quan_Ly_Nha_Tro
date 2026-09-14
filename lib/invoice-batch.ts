// Pure helpers for the batch invoice export (select many bills on /hoa-don →
// export all their PNGs at once).
//
// The period filter works on `Bill.periodLabel`, which is free text typed by the
// user (or imported from the family's Excel). Real data is inconsistent — the
// workbook contains "Tháng 6/2026", "Tháng 5+6+7/2026",
// "Tháng 5+6+7/2026 (giữa tháng)", "15/6 đến hết tháng 8/2026",
// "Tháng 7+8+9/ 2026" — so labels are grouped by a whitespace-insensitive key
// while the raw label stays visible.

import { billTypeLabel } from "./billing";
import { sanitizeFilenamePart } from "./invoice-image";
import { normalize } from "./search";

export type BatchBill = {
  id: string;
  unitName: string;
  periodLabel: string;
  type: string;
};

export type PeriodOption = {
  /** Normalised key used for comparison (see periodKey). */
  key: string;
  /** The raw label as it appears in the data. */
  label: string;
  count: number;
  /** `yyyymm` of the latest month mentioned in the label; 0 when unknown. */
  sortKey: number;
};

export const ALL_PERIODS = "all";
export const ALL_TYPES = "all";

/**
 * Comparison key for a period label: accent/case-insensitive (like the app's
 * search) and **whitespace-insensitive**, so "Tháng 7+8+9/ 2026" and
 * "Tháng 7+8+9/2026" are the same period. "(giữa tháng)" deliberately stays a
 * separate key — that suffix marks a genuinely different bill.
 */
export function periodKey(periodLabel: string): string {
  return normalize(periodLabel).replace(/\s+/g, "");
}

/**
 * Latest period mentioned in a label as `yyyymm`, so "Tháng 7+8+9/2026" sorts as
 * September 2026 and "15/6 đến hết tháng 8/2026" as August 2026. Labels with no
 * `M/YYYY` pair return 0 and sort last.
 */
export function periodSortKey(periodLabel: string): number {
  // A plain exec loop (not matchAll) keeps this working with the project's ES5
  // type-check target, which has no downlevel iteration.
  const pattern = /(\d{1,2})\s*\/\s*(\d{4})/g;
  let latest = 0;
  let match = pattern.exec(periodLabel);
  while (match !== null) {
    const month = Number(match[1]);
    const year = Number(match[2]);
    if (month >= 1 && month <= 12) latest = Math.max(latest, year * 100 + month);
    match = pattern.exec(periodLabel);
  }
  return latest;
}

/** Distinct periods, newest first; ties broken alphabetically. */
export function buildPeriodOptions(bills: BatchBill[]): PeriodOption[] {
  const groups = new Map<string, PeriodOption>();

  for (const bill of bills) {
    const key = periodKey(bill.periodLabel);
    const raw = bill.periodLabel.trim();
    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
      // Keep the cleanest spelling of the label (the real data has both
      // "Tháng 7+8+9/2026" and "Tháng 7+8+9/ 2026"); ties keep the first seen.
      if (raw.length > 0 && raw.length < existing.label.length) existing.label = raw;
      continue;
    }
    groups.set(key, { key, label: raw, count: 1, sortKey: periodSortKey(bill.periodLabel) });
  }

  return Array.from(groups.values()).sort((a, b) => {
    if (b.sortKey !== a.sortKey) return b.sortKey - a.sortKey;
    return a.label.localeCompare(b.label, "vi");
  });
}

/** `Tháng 9/2026 (13)` — the label shown inside the period dropdown. */
export function periodOptionLabel(option: PeriodOption): string {
  const label = option.label.length > 0 ? option.label : "(không có kỳ)";
  return `${label} (${option.count})`;
}

const BILL_TYPE_SLUGS: Record<string, string> = {
  room: "Tien-phong",
  elec_water: "Dien-nuoc",
  both: "Phong-va-Dien-nuoc",
};

/** ASCII slug for the bill type, so a room's two bills in one period differ. */
export function billTypeSlug(type: string): string {
  return BILL_TYPE_SLUGS[type] ?? (sanitizeFilenamePart(billTypeLabel(type)) || "Hoa-don");
}

/**
 * `hoa-don-Phong-201-Thang-9-2026-Dien-nuoc.png`.
 * A page suffix is added only when the invoice really has more than one page.
 */
export function buildBatchInvoiceFilename(
  unitName: string,
  periodLabel: string,
  type: string,
  pageIndex = 0,
  pageCount = 1,
): string {
  const parts = [
    sanitizeFilenamePart(unitName),
    sanitizeFilenamePart(periodLabel),
    billTypeSlug(type),
  ].filter(Boolean);
  const base = ["hoa-don", ...parts].join("-");
  const pageSuffix = pageCount > 1 ? `-trang-${pageIndex + 1}` : "";
  return `${base}${pageSuffix}.png`;
}

/** Appends `-2`, `-3`… when a name is already used inside the ZIP/folder. */
export function uniqueFileName(name: string, taken: ReadonlySet<string>): string {
  if (!taken.has(name)) return name;
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const extension = dot > 0 ? name.slice(dot) : "";
  let suffix = 2;
  let candidate = `${base}-${suffix}${extension}`;
  while (taken.has(candidate)) {
    suffix += 1;
    candidate = `${base}-${suffix}${extension}`;
  }
  return candidate;
}

/**
 * `hoa-don-Thang-9-2026.zip` when every exported bill shares one period, else
 * `hoa-don-13-anh-2026-09-14.zip`.
 */
export function zipFileName(
  periodLabels: string[],
  count: number,
  today: Date = new Date(),
): string {
  const keys = new Set(periodLabels.filter((label) => label.trim() !== "").map(periodKey));
  if (count > 0 && keys.size === 1) {
    const label = sanitizeFilenamePart(periodLabels.find((l) => l.trim() !== "") ?? "");
    if (label) return `hoa-don-${label}.zip`;
  }
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `hoa-don-${count}-anh-${year}-${month}-${day}.zip`;
}
