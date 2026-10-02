import React from "react";
import { Document, Page, View, Text, Image, StyleSheet, Font } from "@react-pdf/renderer";
import path from "path";
import type { LineItem } from "@/lib/billing";
import { monthsOrOne } from "@/lib/billing";
import { formatMonths } from "@/lib/tracking";
import { formatVND, formatDate } from "@/lib/format";

// Register Noto Sans (full Vietnamese diacritic support) from local TTF files.
// Paths resolve at module load whether running in test or the Next.js server runtime.
const fontsDir = path.join(process.cwd(), "public", "fonts");

Font.register({
  family: "NotoSans",
  fonts: [
    { src: path.join(fontsDir, "NotoSans-Regular.ttf"), fontWeight: "normal" },
    { src: path.join(fontsDir, "NotoSans-Bold.ttf"), fontWeight: "bold" },
  ],
});

export type InvoiceModel = {
  type: string;
  unitName: string;
  periodLabel: string;
  dueDate?: string;
  roomPeriod?: string;
  utilityPeriod?: string;
  tenantName: string;
  phone: string;
  vehiclePlate: string;
  rows: LineItem[];
  subtotal: number;
  electricityAmount: number;
  waterAmount: number;
  electricityOld: number | null;
  electricityNew: number | null;
  electricityUsage: number | null;
  electricityRate: number;
  waterOld: number | null;
  waterNew: number | null;
  waterUsage: number | null;
  waterRate: number;
  grandTotal: number;
  depositAmount: number;
  notes: string;
  bankAccountName: string;
  bankAccountNo: string;
  bankName: string;
  qrImageUrl: string | null;
};

type MeterBill = {
  dueDate?: Date | string;
  trackingPeriods?: { month: string; category: string }[];
  type: string;
  periodLabel: string; subtotal: number; electricityAmount: number; waterAmount: number;
  grandTotal: number; lineItems: unknown;
  electricityOld?: number | null; electricityNew?: number | null; electricityRate?: number | null;
  waterOld?: number | null; waterNew?: number | null; waterRate?: number | null;
};

// Consumption = new − old reading (rounded to 2 decimals for water), or null
// when the bill has no meter readings (legacy bills).
function meterUsage(oldR: number | null | undefined, newR: number | null | undefined): number | null {
  if (oldR == null || newR == null) return null;
  return Math.round((newR - oldR) * 100) / 100;
}

export function buildInvoiceModel(
  bill: MeterBill,
  lease: { depositAmount: number },
  unit: { name: string },
  tenant: { fullName: string; phone: string; vehiclePlate: string | null },
  profile: { bankAccountName: string | null; bankAccountNo: string | null; bankName: string | null; qrImageUrl: string | null; invoiceNotes: string | null } | null,
): InvoiceModel {
  return {
    type: bill.type,
    unitName: unit.name,
    periodLabel: bill.periodLabel,
    dueDate: bill.dueDate ? formatDate(bill.dueDate) : undefined,
    roomPeriod: formatMonths((bill.trackingPeriods ?? []).filter(p => p.category === "room").map(p => p.month)),
    utilityPeriod: formatMonths((bill.trackingPeriods ?? []).filter(p => p.category === "elec_water").map(p => p.month)),
    tenantName: tenant.fullName,
    phone: tenant.phone,
    vehiclePlate: tenant.vehiclePlate ?? "",
    rows: bill.lineItems as LineItem[],
    subtotal: bill.subtotal,
    electricityAmount: bill.electricityAmount,
    waterAmount: bill.waterAmount,
    electricityOld: bill.electricityOld ?? null,
    electricityNew: bill.electricityNew ?? null,
    electricityUsage: meterUsage(bill.electricityOld, bill.electricityNew),
    electricityRate: bill.electricityRate ?? 0,
    waterOld: bill.waterOld ?? null,
    waterNew: bill.waterNew ?? null,
    waterUsage: meterUsage(bill.waterOld, bill.waterNew),
    waterRate: bill.waterRate ?? 0,
    grandTotal: bill.grandTotal,
    depositAmount: lease.depositAmount,
    notes: profile?.invoiceNotes ?? "",
    bankAccountName: profile?.bankAccountName ?? "",
    bankAccountNo: profile?.bankAccountNo ?? "",
    bankName: profile?.bankName ?? "",
    qrImageUrl: profile?.qrImageUrl ?? null,
  };
}

// Print theme: mirrors the app's warm neutral / terra-cotta tokens.
// Bank details and notes remain editable via Cài đặt → Hồ sơ thu tiền.
export const INVOICE_THEME = {
  ink: "#141413", muted: "#6b6a63", line: "#e8e6dc",
  surface: "#ffffff", cream: "#faf9f5", accent: "#8a3f25", tint: "#fbeee8",
  pagePadding: 36, bodySize: 10,
} as const;
const t = INVOICE_THEME;
const s = StyleSheet.create({
  page: { paddingTop: t.pagePadding, paddingHorizontal: t.pagePadding, paddingBottom: 48, fontSize: t.bodySize, fontFamily: "NotoSans", color: t.ink, backgroundColor: t.surface, lineHeight: 1.3 },
  header: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 3, borderTopColor: t.accent, paddingTop: 14, marginBottom: 12 },
  eyebrow: { fontSize: 8, color: t.muted, marginBottom: 4 },
  title: { fontSize: 22, fontWeight: "bold", lineHeight: 1.2 },
  room: { fontSize: 19, lineHeight: 1.3, fontWeight: "bold", textAlign: "right" },
  headerLeft: { width: "60%" }, headerRight: { width: "38%" },
  period: { fontSize: 10, marginTop: 6, color: t.muted },
  meta: { flexDirection: "row", backgroundColor: t.cream, padding: 10, marginBottom: 12, borderRadius: 6 },
  customer: { width: "65%", paddingRight: 12 },
  due: { width: "35%", textAlign: "right" },
  label: { color: t.muted, fontSize: 8, marginBottom: 3 },
  value: { fontWeight: "bold", fontSize: 11 },
  secondary: { color: t.muted, fontSize: 9, marginTop: 3 },
  section: { marginBottom: 10 },
  sectionHeading: { fontWeight: "bold", fontSize: 11, marginBottom: 3 },
  sectionPeriod: { fontSize: 9, color: t.muted, marginBottom: 8 },
  table: { borderBottomWidth: 0.75, borderBottomColor: t.line },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: t.line },
  tableHead: { backgroundColor: t.cream, fontSize: 8, color: t.muted, fontWeight: "bold" },
  cell: { paddingVertical: 5, paddingHorizontal: 5, fontSize: 9 },
  cTT: { width: "5%", textAlign: "center" },
  cName: { width: "28%" },
  cUnit: { width: "10%", textAlign: "center" },
  cQty: { width: "8%", textAlign: "center" },
  cMonths: { width: "9%", textAlign: "center" },
  cPrice: { width: "18%", textAlign: "right" },
  cTotal: { width: "22%", textAlign: "right", fontWeight: "bold" },
  subtotal: { flexDirection: "row", backgroundColor: t.cream },
  subtotalLabel: { width: "78%", paddingVertical: 8, paddingHorizontal: 5, fontSize: 9 },
  mName: { width: "25%" },
  mOld: { width: "12%", textAlign: "center" },
  mNew: { width: "12%", textAlign: "center" },
  mQty: { width: "12%", textAlign: "center" },
  mPrice: { width: "17%", textAlign: "right" },
  total: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: t.tint, borderRadius: 6, padding: 12, marginBottom: 12 },
  totalLabel: { fontSize: 10, fontWeight: "bold", color: t.accent },
  totalValue: { fontSize: 20, lineHeight: 1.3, fontWeight: "bold", color: t.accent },
  payment: { borderTopWidth: 0.75, borderTopColor: t.line, paddingTop: 12, flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  bank: { flexGrow: 1, flexShrink: 1, paddingRight: 14 },
  bankValue: { fontSize: 13, fontWeight: "bold", marginVertical: 4 },
  qrBlock: { width: 88, flexShrink: 0, alignItems: "center" },
  qr: { width: 80, height: 80, objectFit: "contain" },
  qrCaption: { fontSize: 7, color: t.muted, marginTop: 4 },
  notes: { fontSize: 9, color: t.muted },
  footer: { position: "absolute", bottom: 18, left: 36, right: 36, height: 20, borderTopWidth: 0.5, borderTopColor: t.line, paddingTop: 5, fontSize: 7, lineHeight: 1.3, color: t.muted, flexDirection: "row", justifyContent: "space-between" },
});

function MeterRow({ label, unit, oldR, newR, usage, rate, amount }: {
  label: string; unit: string; oldR: number | null; newR: number | null;
  usage: number | null; rate: number; amount: number;
}) {
  return <View style={s.row} wrap={false}>
    <View style={[s.cell, s.mName]}><Text>{label}</Text><Text style={s.secondary}>{unit}</Text></View>
    <Text style={[s.cell, s.mOld]}>{oldR ?? "—"}</Text>
    <Text style={[s.cell, s.mNew]}>{newR ?? "—"}</Text>
    <Text style={[s.cell, s.mQty]}>{usage ?? "—"}</Text>
    <Text style={[s.cell, s.mPrice]}>{usage != null ? formatVND(rate) : "—"}</Text>
    <Text style={[s.cell, s.cTotal]}>{formatVND(amount)}</Text>
  </View>;
}

export function InvoiceDocument({ model }: { model: InvoiceModel }) {
  const hasBank = Boolean(model.bankAccountNo || model.bankAccountName || model.bankName || model.qrImageUrl);
  return <Document title={`Hóa đơn · ${model.unitName} · ${model.periodLabel}`} language="vi">
    <Page size="A4" style={s.page}>
      <View style={s.header} wrap={false}>
        <View style={s.headerLeft}>
          <Text style={s.eyebrow}>TIỀN THUÊ & CHI PHÍ SINH HOẠT</Text>
          <Text style={s.title}>HÓA ĐƠN</Text>
          <Text style={s.period}>{model.periodLabel}</Text>
        </View>
        <View style={s.headerRight}>
          <Text style={s.room}>{model.unitName}</Text>
          <Text style={[s.secondary, { textAlign: "right" }]}>{model.type === "room" ? "Tiền phòng / dịch vụ" : model.type === "elec_water" ? "Điện / nước" : "Tiền phòng · Điện / nước"}</Text>
        </View>
      </View>
      <View style={s.meta} wrap={false}>
        <View style={s.customer}>
          <Text style={s.label}>NGƯỜI THUÊ</Text>
          <Text style={s.value}>{model.tenantName}</Text>
          {model.phone ? <Text style={s.secondary}>{model.phone}</Text> : null}
        </View>
        <View style={s.due}>
          <Text style={s.label}>HẠN THANH TOÁN</Text>
          <Text style={s.value}>{model.dueDate || "—"}</Text>
        </View>
      </View>
      {model.type !== "elec_water" && <View style={s.section}>
        <Text style={s.sectionHeading} minPresenceAhead={65}>Tiền phòng & dịch vụ</Text>
        <Text style={s.sectionPeriod}>Kỳ: {model.roomPeriod ? `Tháng ${model.roomPeriod}` : model.periodLabel}</Text>
        <View style={s.table}>
          <View style={[s.row, s.tableHead]} wrap={false} minPresenceAhead={30}>
            <Text style={[s.cell, s.cTT]}>#</Text>
            <Text style={[s.cell, s.cName]}>Khoản thu</Text>
            <Text style={[s.cell, s.cUnit]}>ĐVT</Text>
            <Text style={[s.cell, s.cQty]}>SL</Text>
            <Text style={[s.cell, s.cMonths]}>Tháng</Text>
            <Text style={[s.cell, s.cPrice]}>Đơn giá</Text>
            <Text style={[s.cell, s.cTotal]}>Thành tiền</Text>
          </View>
          {model.rows.map((r, i) => <View style={s.row} key={i} wrap={false}>
            <Text style={[s.cell, s.cTT]}>{i + 1}</Text>
            <Text style={[s.cell, s.cName]}>{r.name}</Text>
            <Text style={[s.cell, s.cUnit]}>{r.measureUnit}</Text>
            <Text style={[s.cell, s.cQty]}>{r.quantity}</Text>
            <Text style={[s.cell, s.cMonths]}>{r.months == null ? "—" : monthsOrOne(r.months)}</Text>
            <Text style={[s.cell, s.cPrice]}>{formatVND(r.unitPrice)}</Text>
            <Text style={[s.cell, s.cTotal]}>{formatVND(r.total)}</Text>
          </View>)}
          <View style={s.subtotal} wrap={false}>
            <Text style={s.subtotalLabel}>Cộng tiền phòng & dịch vụ</Text>
            <Text style={[s.cell, s.cTotal]}>{formatVND(model.subtotal)}</Text>
          </View>
        </View>
      </View>}
      {model.type !== "room" && <View style={s.section}>
        <Text style={s.sectionHeading} minPresenceAhead={75}>Điện & nước</Text>
        <Text style={s.sectionPeriod}>Kỳ: {model.utilityPeriod ? `Tháng ${model.utilityPeriod}` : model.periodLabel}</Text>
        <View style={s.table}>
          <View style={[s.row, s.tableHead]} wrap={false}>
            <Text style={[s.cell, s.mName]}>Khoản thu</Text>
            <Text style={[s.cell, s.mOld]}>Chỉ số cũ</Text>
            <Text style={[s.cell, s.mNew]}>Chỉ số mới</Text>
            <Text style={[s.cell, s.mQty]}>Tiêu thụ</Text>
            <Text style={[s.cell, s.mPrice]}>Đơn giá</Text>
            <Text style={[s.cell, s.cTotal]}>Thành tiền</Text>
          </View>
          <MeterRow label="Tiền điện" unit="kWh" oldR={model.electricityOld} newR={model.electricityNew} usage={model.electricityUsage} rate={model.electricityRate} amount={model.electricityAmount} />
          <MeterRow label="Tiền nước" unit="m³" oldR={model.waterOld} newR={model.waterNew} usage={model.waterUsage} rate={model.waterRate} amount={model.waterAmount} />
        </View>
      </View>}
      <View style={s.total} wrap={false}>
        <Text style={s.totalLabel}>TỔNG THANH TOÁN</Text>
        <Text style={s.totalValue}>{formatVND(model.grandTotal)}</Text>
      </View>
      {hasBank && <View style={s.payment} wrap={false}>
        <View style={s.bank}>
          <Text style={s.sectionHeading}>Thông tin chuyển khoản</Text>
          {model.bankName ? <Text>{model.bankName}</Text> : null}
          {model.bankAccountNo ? <Text style={s.bankValue}>{model.bankAccountNo}</Text> : null}
          {model.bankAccountName ? <Text>{model.bankAccountName}</Text> : null}
          <Text style={s.secondary}>Nội dung: {model.unitName} · {model.periodLabel}</Text>
        </View>
        {model.qrImageUrl ? <View style={s.qrBlock}>
          {/* react-pdf Image is a PDF element, not an HTML image. */}
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image style={s.qr} src={model.qrImageUrl} />
          <Text style={s.qrCaption}>Quét mã chuyển khoản</Text>
        </View> : null}
      </View>}
      {model.notes.trim() ? <View style={s.notes}>
        <Text style={s.label} minPresenceAhead={20}>GHI CHÚ</Text>
        <Text>{model.notes}</Text>
      </View> : null}
      <View style={s.footer} fixed>
        <Text>{model.unitName} · Hóa đơn tiền thuê</Text>
      </View>
    </Page>
  </Document>;
}
