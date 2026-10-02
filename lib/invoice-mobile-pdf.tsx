import React from "react";
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { INVOICE_THEME, type InvoiceModel } from "./invoice-pdf";
import { formatVND } from "./format";

const t = INVOICE_THEME;
export const MOBILE_INVOICE_WIDTH = 360;
// Conservative height, trimmed after rasterisation. Very long invoices paginate
// rather than producing a canvas beyond browser limits.
export function mobileInvoiceHeight(model: InvoiceModel) {
  const lines = (text: string, chars: number) => text.split("\n").reduce((n, line) => n + Math.max(1, Math.ceil(line.length / chars)), 0);
  const rows = model.type === "elec_water" ? 0 : model.rows.reduce((n, r) => n + 82 + lines(r.name, 19) * 22, 0);
  return Math.min(4800, 900 + rows + lines(model.periodLabel, 28) * 22 + lines(model.roomPeriod ?? "", 30) * 22 + lines(model.utilityPeriod ?? "", 30) * 22 + lines(model.tenantName, 28) * 22 + lines(model.notes, 35) * 22);
}
const s = StyleSheet.create({
  page: { padding: 20, fontFamily: "NotoSans", fontSize: 14, lineHeight: 1.4, color: t.ink, backgroundColor: "#ffffff" },
  eyebrow: { fontSize: 12, color: t.muted, marginBottom: 6 },
  room: { fontSize: 28, lineHeight: 1.3, fontWeight: "bold", marginBottom: 8 },
  period: { color: t.muted, marginBottom: 12 },
  person: { marginBottom: 16 },
  total: { backgroundColor: t.tint, padding: 16, borderRadius: 8, marginBottom: 24 },
  totalLabel: { color: t.accent, fontSize: 13, marginBottom: 6 },
  totalValue: { color: t.accent, fontSize: 29, lineHeight: 1.35, fontWeight: "bold", marginBottom: 6 },
  section: { marginBottom: 22 },
  heading: { fontSize: 17, lineHeight: 1.4, fontWeight: "bold", marginBottom: 5 },
  muted: { fontSize: 14, color: t.muted },
  sectionPeriod: { color: t.muted, marginBottom: 6 },
  item: { borderBottomWidth: 0.75, borderBottomColor: t.line, paddingVertical: 12 },
  itemTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  itemName: { width: "57%", paddingRight: 8, fontSize: 15, lineHeight: 1.4 },
  amount: { width: "43%", textAlign: "right", fontSize: 15, lineHeight: 1.4, fontWeight: "bold" },
  subtotal: { flexDirection: "row", justifyContent: "space-between", paddingTop: 10 },
  notes: { color: t.muted, marginBottom: 12 },
  footer: { color: t.muted, fontSize: 12, borderTopWidth: 0.75, borderTopColor: t.line, paddingTop: 10 },
});
function quantityText(value: number) {
  return value.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
}
function MobileMeter({ label, unit, oldReading, newReading, usage, rate, amount }: {
  label: string; unit: string; oldReading: number | null; newReading: number | null; usage: number | null; rate: number; amount: number;
}) {
  return <View style={s.item} wrap={false}>
    <View style={s.itemTop}><Text style={s.itemName}>{label}</Text><Text style={s.amount}>{formatVND(amount)}</Text></View>
    {oldReading != null && newReading != null && usage != null ? <>
      <Text style={s.muted}>Cũ: {quantityText(oldReading)} · Mới: {quantityText(newReading)}</Text>
      <Text style={s.muted}>{quantityText(usage)} {unit} × {formatVND(rate)}</Text>
    </> : <Text style={s.muted}>Không có chi tiết chỉ số</Text>}
  </View>;
}
export function MobileInvoiceDocument({ model }: { model: InvoiceModel }) {
  return <Document title={`Hóa đơn · ${model.unitName}`} language="vi">
    <Page size={{ width: MOBILE_INVOICE_WIDTH, height: mobileInvoiceHeight(model) }} style={s.page}>
      <View wrap={false}>
        <Text style={s.eyebrow}>HÓA ĐƠN THANH TOÁN</Text>
        <Text style={s.room}>{model.unitName}</Text>
        <Text style={s.period}>{model.periodLabel}</Text>
        <Text style={s.person}>{model.tenantName}</Text>
        <View style={s.total}>
          <Text style={s.totalLabel}>TỔNG TIỀN HÓA ĐƠN</Text>
          <Text style={s.totalValue}>{formatVND(model.grandTotal)}</Text>
          {model.dueDate ? <Text>Hạn thanh toán: {model.dueDate}</Text> : null}
        </View>
      </View>
      {model.type !== "elec_water" && <View style={s.section}>
        <Text style={s.heading} minPresenceAhead={100}>Tiền phòng & dịch vụ</Text>
        <Text style={s.sectionPeriod}>Kỳ: {model.roomPeriod ? `Tháng ${model.roomPeriod}` : model.periodLabel}</Text>
        {model.rows.map((r, i) => <View key={i} style={s.item} wrap={false}>
          <View style={s.itemTop}><Text style={s.itemName}>{r.name}</Text><Text style={s.amount}>{formatVND(r.total)}</Text></View>
          <Text style={s.muted}>{quantityText(r.quantity)}{r.measureUnit && r.measureUnit !== "tháng" ? ` ${r.measureUnit}` : ""} × {formatVND(r.unitPrice)}{r.months != null ? ` × ${r.months} tháng` : ""}</Text>
        </View>)}
        <View style={s.subtotal} wrap={false}><Text style={s.itemName}>Tổng tiền</Text><Text style={s.amount}>{formatVND(model.subtotal)}</Text></View>
      </View>}
      {model.type !== "room" && <View style={s.section}>
        <Text style={s.heading} minPresenceAhead={100}>Điện & nước</Text>
        <Text style={s.sectionPeriod}>Kỳ: {model.utilityPeriod ? `Tháng ${model.utilityPeriod}` : model.periodLabel}</Text>
        <MobileMeter label="Tiền điện" unit="kWh" oldReading={model.electricityOld} newReading={model.electricityNew} usage={model.electricityUsage} rate={model.electricityRate} amount={model.electricityAmount} />
        <MobileMeter label="Tiền nước" unit="m³" oldReading={model.waterOld} newReading={model.waterNew} usage={model.waterUsage} rate={model.waterRate} amount={model.waterAmount} />
      </View>}
      {model.notes.trim() ? <View style={s.notes}><Text style={s.heading} minPresenceAhead={40}>Ghi chú</Text><Text>{model.notes}</Text></View> : null}
      <Text style={s.footer}>{model.unitName} · Hóa đơn thanh toán</Text>
    </Page>
  </Document>;
}
