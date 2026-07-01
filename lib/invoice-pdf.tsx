import React from "react";
import { Document, Page, View, Text, Image, StyleSheet, Font } from "@react-pdf/renderer";
import path from "path";
import type { LineItem } from "@/lib/billing";
import { formatVND } from "@/lib/format";

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
  unitName: string;
  periodLabel: string;
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
    unitName: unit.name,
    periodLabel: bill.periodLabel,
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

const s = StyleSheet.create({
  page: { padding: 28, fontSize: 10, fontFamily: "NotoSans" },
  title: { textAlign: "center", fontSize: 14, fontWeight: "bold", marginBottom: 10 },
  headerLine: { marginBottom: 3 },
  table: { marginTop: 8, borderWidth: 1, borderColor: "#000" },
  row: { flexDirection: "row" },
  cell: { borderRightWidth: 1, borderBottomWidth: 1, borderColor: "#000", padding: 4 },
  cTT: { width: "8%", textAlign: "center" },
  cName: { width: "34%" },
  cUnit: { width: "14%", textAlign: "center" },
  cQty: { width: "10%", textAlign: "center" },
  cPrice: { width: "16%", textAlign: "right" },
  cTotal: { width: "18%", textAlign: "right", borderRightWidth: 0 },
  notes: { marginTop: 10 },
  bank: { marginTop: 10, color: "#b00000" },
  qr: { width: 120, height: 120, marginTop: 8 },
});

// A metered service row (điện / nước): số lượng = chênh lệch chỉ số, đơn giá, thành tiền.
function MeterRow({
  label, unit, oldR, newR, usage, rate, amount,
}: {
  label: string; unit: string;
  oldR: number | null; newR: number | null; usage: number | null;
  rate: number; amount: number;
}) {
  return (
    <View style={s.row}>
      <Text style={[s.cell, s.cTT]}> </Text>
      <Text style={[s.cell, s.cName]}>
        {label}{oldR != null ? ` (${oldR} → ${newR})` : ""}
      </Text>
      <Text style={[s.cell, s.cUnit]}>{unit}</Text>
      <Text style={[s.cell, s.cQty]}>{usage ?? " "}</Text>
      <Text style={[s.cell, s.cPrice]}>{usage != null ? formatVND(rate) : " "}</Text>
      <Text style={[s.cell, s.cTotal]}>{formatVND(amount)}</Text>
    </View>
  );
}

export function InvoiceDocument({ model }: { model: InvoiceModel }) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.title}>{model.unitName.toUpperCase()}</Text>
        <Text style={s.headerLine}>Kì thanh toán: {model.periodLabel}</Text>
        <Text style={s.headerLine}>
          Người thuê: {model.tenantName} (ĐT: {model.phone})
        </Text>

        <View style={s.table}>
          {/* Header row */}
          <View style={s.row}>
            <Text style={[s.cell, s.cTT]}>TT</Text>
            <Text style={[s.cell, s.cName]}>Các dịch vụ</Text>
            <Text style={[s.cell, s.cUnit]}>Đơn vị tính</Text>
            <Text style={[s.cell, s.cQty]}>Số lượng</Text>
            <Text style={[s.cell, s.cPrice]}>Đơn giá</Text>
            <Text style={[s.cell, s.cTotal]}>Thành tiền</Text>
          </View>
          {/* Line item rows */}
          {model.rows.map((r, i) => (
            <View style={s.row} key={i}>
              <Text style={[s.cell, s.cTT]}>{i + 1}</Text>
              <Text style={[s.cell, s.cName]}>{r.name}</Text>
              <Text style={[s.cell, s.cUnit]}>{r.measureUnit}</Text>
              <Text style={[s.cell, s.cQty]}>{r.quantity}</Text>
              <Text style={[s.cell, s.cPrice]}>{formatVND(r.unitPrice)}</Text>
              <Text style={[s.cell, s.cTotal]}>{formatVND(r.total)}</Text>
            </View>
          ))}
          {/* Subtotal: room + services, excluding electricity & water */}
          <View style={s.row}>
            <Text style={[s.cell, { width: "82%" }]}>
              Tổng tiền nhà và DV (trừ điện, nước)
            </Text>
            <Text style={[s.cell, s.cTotal]}>{formatVND(model.subtotal)}</Text>
          </View>
          <MeterRow
            label="Tiền điện" unit="kWh"
            oldR={model.electricityOld} newR={model.electricityNew}
            usage={model.electricityUsage} rate={model.electricityRate} amount={model.electricityAmount}
          />
          <MeterRow
            label="Tiền nước" unit="m³"
            oldR={model.waterOld} newR={model.waterNew}
            usage={model.waterUsage} rate={model.waterRate} amount={model.waterAmount}
          />
          {/* Grand total */}
          <View style={s.row}>
            <Text style={[s.cell, { width: "82%", fontWeight: "bold" }]}>Tổng cộng</Text>
            <Text style={[s.cell, s.cTotal, { fontWeight: "bold" }]}>{formatVND(model.grandTotal)}</Text>
          </View>
        </View>

        <View style={s.notes}>
          <Text>Ghi chú:</Text>
          <Text>{model.notes}</Text>
        </View>

        <View style={s.bank}>
          <Text>Khách hàng vui lòng thanh toán theo thông tin TK sau:</Text>
          <Text>
            Số tài khoản: {model.bankAccountNo} - {model.bankAccountName}
          </Text>
          <Text>{model.bankName}</Text>
        </View>

        {model.qrImageUrl ? <Image style={s.qr} src={model.qrImageUrl} /> : null}
      </Page>
    </Document>
  );
}
