import { z } from "zod";
import { billStatusFor } from "./billing";

export const monthSchema = z.string().regex(/^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/, "Tháng không hợp lệ");
export type TrackingPeriod = { month: string; category: string };
export type TrackingBill = {
  id: string; periodLabel: string; type: string; grandTotal: number; dueDate: string;
  payments: { amount: number }[]; trackingPeriods: TrackingPeriod[];
  electricityNew?: number | null; waterNew?: number | null;
};
export type TrackingContext = {
  leaseId: string; tenantName: string; startDate: string; endDate: string | null; bills: TrackingBill[];
};
export function monthIndex(month: string): number {
  const [year, m] = month.split("-").map(Number);
  return year * 12 + m - 1;
}
export function consecutive(months: string[]): boolean {
  const sorted = Array.from(new Set(months)).sort();
  return sorted.every((m, i) => i === 0 || monthIndex(m) === monthIndex(sorted[i - 1]) + 1);
}
export const trackingInputSchema = z.object({
  type: z.enum(["room", "elec_water", "both"]),
  roomMonths: z.array(monthSchema).max(120),
  utilityMonths: z.array(monthSchema).max(120),
}).superRefine((d, ctx) => {
  if (d.type !== "elec_water" && !d.roomMonths.length) ctx.addIssue({ code: "custom", path: ["roomMonths"], message: "Vui lòng chọn kỳ tiền phòng." });
  if (d.type !== "room" && !d.utilityMonths.length) ctx.addIssue({ code: "custom", path: ["utilityMonths"], message: "Vui lòng chọn kỳ điện/nước." });
  if (d.type !== "room" && !consecutive(d.utilityMonths)) ctx.addIssue({ code: "custom", message: "Kỳ điện/nước phải liên tiếp. Vui lòng lập hóa đơn riêng cho các kỳ cách nhau." });
  if (new Set(d.roomMonths).size !== d.roomMonths.length || new Set(d.utilityMonths).size !== d.utilityMonths.length) ctx.addIssue({ code: "custom", message: "Không chọn trùng tháng." });
});
export function trackingPeriods(input: z.infer<typeof trackingInputSchema>): TrackingPeriod[] {
  return [...(input.type === "elec_water" ? [] : input.roomMonths.map(month => ({ month, category: "room" }))), ...(input.type === "room" ? [] : input.utilityMonths.map(month => ({ month, category: "elec_water" })))];
}
export function formatMonths(months: string[]): string {
  const groups = new Map<string, number[]>();
  Array.from(new Set(months)).sort().forEach(m => {
    const [y, n] = m.split("-");
    groups.set(y, [...(groups.get(y) ?? []), Number(n)]);
  });
  return Array.from(groups).map(([y, ms]) => `${ms.join("+")}/${y}`).join(" và ");
}
export function trackingTitle(room: string[], utility: string[], type: string): string {
  if (type === "room") return room.length ? `Tháng ${formatMonths(room)}` : "";
  if (type === "elec_water") return utility.length ? `Tháng ${formatMonths(utility)}` : "";
  if (room.length && utility.length && [...room].sort().join() === [...utility].sort().join()) return `Tháng ${formatMonths(room)}`;
  return `Phòng: ${formatMonths(room) || "—"}; Điện/nước: ${formatMonths(utility) || "—"}`;
}
export function vietnamMonth(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit" }).formatToParts(date);
  return `${parts.find(p => p.type === "year")?.value}-${parts.find(p => p.type === "month")?.value}`;
}
export function withinLease(periods: TrackingPeriod[], start: Date, end: Date | null): boolean {
  return periods.every(p => p.month >= vietnamMonth(start) && (!end || p.month <= vietnamMonth(end)));
}
export function trackingState(bills: Pick<TrackingBill, "grandTotal" | "payments" | "dueDate">[], now = new Date()) {
  if (!bills.length) return { label: "Chưa có hóa đơn", state: "empty", overdue: false };
  const paid = (b: typeof bills[number]) => b.payments.reduce((s, p) => s + p.amount, 0);
  const complete = bills.every(b => paid(b) >= b.grandTotal);
  const state = complete ? (bills.every(b => b.grandTotal === 0) ? "free" : "paid") : bills.some(b => paid(b) > 0) ? "partial" : "unpaid";
  return { state, label: ({ free: "Không phải thu", paid: "Đã đóng", partial: "Đang trả", unpaid: "Chưa đóng" })[state], overdue: bills.some(b => billStatusFor(b.grandTotal, paid(b), new Date(b.dueDate), now) === "overdue") };
}
// Deliberately excludes partial-month and ambiguous free-text periods.
export function suggestLegacyMonths(label: string): string[] {
  const m = /^\s*Tháng\s+(\d{1,2}(?:\s*\+\s*\d{1,2})*)\s*\/\s*((?:19|20|21)\d{2})\s*$/i.exec(label);
  if (!m) return [];
  const months = m[1].split("+").map(n => `${m[2]}-${String(Number(n.trim())).padStart(2, "0")}`);
  return months.every(n => monthSchema.safeParse(n).success) && new Set(months).size === months.length ? months.sort() : [];
}
