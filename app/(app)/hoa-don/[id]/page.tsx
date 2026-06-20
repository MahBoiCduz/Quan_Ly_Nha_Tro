import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatVND } from "@/lib/format";
import type { LineItem } from "@/lib/billing";
import { billStatusFor } from "@/lib/billing";
import { BackLink } from "@/components/back-link";
import { recordPayment } from "./payment-actions";
import { PaymentPanel } from "./payment-panel";
import { FileDown } from "lucide-react";

const STATUS_LABEL: Record<string, string> = { unpaid: "Chưa thu", paid: "Đã thu", overdue: "Quá hạn" };

export default async function BillDetailPage({ params }: { params: { id: string } }) {
  const bill = await db.bill.findUnique({
    where: { id: params.id },
    include: { lease: { include: { unit: true, tenant: true } }, payments: { orderBy: { paidAt: "asc" } } },
  });
  if (!bill) notFound();

  const items = bill.lineItems as unknown as LineItem[];
  const paid = bill.payments.reduce((s, p) => s + p.amount, 0);
  const display = billStatusFor(bill.grandTotal, paid, bill.dueDate);
  const badgeClass =
    display === "overdue" ? "badge-danger" :
    display === "paid" ? "badge-ok" :
    "badge-warn";

  return (
    <div className="space-y-6">
      <BackLink href="/hoa-don" label="Danh sách hóa đơn" />
      <div className="flex items-center justify-between">
        <h1>{bill.lease.unit.name} — {bill.periodLabel}</h1>
        <a
          href={`/hoa-don/${bill.id}/pdf`}
          target="_blank"
          className="btn-secondary"
        >
          <FileDown size={18} /> Xuất PDF
        </a>
      </div>
      <p className="text-sm text-muted">
        Khách: {bill.lease.tenant.fullName} · {bill.lease.tenant.phone} ·
        Trạng thái: <span className={badgeClass}>{STATUS_LABEL[display]}</span>
      </p>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-cream text-muted">
              <th className="border-b border-line px-3 py-2 text-left text-sm">Dịch vụ</th>
              <th className="border-b border-line px-3 py-2 text-sm">ĐVT</th>
              <th className="border-b border-line px-3 py-2 text-sm">SL</th>
              <th className="border-b border-line px-3 py-2 text-right text-sm">Đơn giá</th>
              <th className="border-b border-line px-3 py-2 text-right text-sm">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i} className="border-b border-line hover:bg-cream">
                <td className="px-3 py-2 text-ink">{it.name}</td>
                <td className="px-3 py-2 text-center text-ink">{it.measureUnit}</td>
                <td className="px-3 py-2 text-center text-ink">{it.quantity}</td>
                <td className="px-3 py-2 text-right text-ink">{formatVND(it.unitPrice)}</td>
                <td className="px-3 py-2 text-right text-ink">{formatVND(it.total)}</td>
              </tr>
            ))}
            <tr className="border-b border-line font-semibold">
              <td className="px-3 py-2 text-ink" colSpan={4}>Tổng tiền nhà và DV (trừ điện, nước)</td>
              <td className="px-3 py-2 text-right text-ink">{formatVND(bill.subtotal)}</td>
            </tr>
            <tr className="border-b border-line">
              <td className="px-3 py-2 text-ink" colSpan={4}>Tiền điện</td>
              <td className="px-3 py-2 text-right text-ink">{formatVND(bill.electricityAmount)}</td>
            </tr>
            <tr className="border-b border-line">
              <td className="px-3 py-2 text-ink" colSpan={4}>Tiền nước</td>
              <td className="px-3 py-2 text-right text-ink">{formatVND(bill.waterAmount)}</td>
            </tr>
            <tr className="font-bold">
              <td className="px-3 py-2 text-ink" colSpan={4}>Tổng cộng</td>
              <td className="px-3 py-2 text-right text-ink">{formatVND(bill.grandTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <section>
        <h2 className="mb-2">Đã thanh toán: {formatVND(paid)} / {formatVND(bill.grandTotal)}</h2>
        <ul className="card mb-3 overflow-hidden text-sm">
          {bill.payments.map((p) => (
            <li key={p.id} className="flex justify-between border-b border-line px-4 py-3 last:border-0 hover:bg-cream">
              <span className="text-ink">{p.paidAt.toLocaleDateString("vi-VN")} · {p.method === "cash" ? "Tiền mặt" : "Chuyển khoản"}</span>
              <span className="flex items-center gap-2">
                <span className="text-ink">{formatVND(p.amount)}</span>
                {p.receiptImageUrl && <a href={p.receiptImageUrl} target="_blank" className="text-sm underline">biên lai</a>}
              </span>
            </li>
          ))}
          {bill.payments.length === 0 && <li className="px-4 py-3 text-muted">Chưa có thanh toán.</li>}
        </ul>
        <PaymentPanel billId={bill.id} action={recordPayment} />
      </section>
    </div>
  );
}
