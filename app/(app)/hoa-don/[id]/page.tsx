import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatVND } from "@/lib/format";
import type { LineItem } from "@/lib/billing";
import { billStatusFor } from "@/lib/billing";
import { recordPayment } from "./payment-actions";
import { PaymentPanel } from "./payment-panel";

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{bill.lease.unit.name} — {bill.periodLabel}</h1>
        <a href={`/hoa-don/${bill.id}/pdf`} target="_blank"
          className="rounded bg-gray-800 px-3 py-2 text-white">Xuất PDF</a>
      </div>
      <p className="text-sm text-gray-500">
        Khách: {bill.lease.tenant.fullName} · {bill.lease.tenant.phone} ·
        Trạng thái: {STATUS_LABEL[display]}
      </p>

      <table className="w-full border bg-white text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-2 py-1 text-left">Dịch vụ</th>
            <th className="border px-2 py-1">ĐVT</th>
            <th className="border px-2 py-1">SL</th>
            <th className="border px-2 py-1 text-right">Đơn giá</th>
            <th className="border px-2 py-1 text-right">Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={i}>
              <td className="border px-2 py-1">{it.name}</td>
              <td className="border px-2 py-1 text-center">{it.measureUnit}</td>
              <td className="border px-2 py-1 text-center">{it.quantity}</td>
              <td className="border px-2 py-1 text-right">{formatVND(it.unitPrice)}</td>
              <td className="border px-2 py-1 text-right">{formatVND(it.total)}</td>
            </tr>
          ))}
          <tr className="font-semibold">
            <td className="border px-2 py-1" colSpan={4}>Tổng tiền nhà và DV (trừ điện, nước)</td>
            <td className="border px-2 py-1 text-right">{formatVND(bill.subtotal)}</td>
          </tr>
          <tr>
            <td className="border px-2 py-1" colSpan={4}>Tiền điện</td>
            <td className="border px-2 py-1 text-right">{formatVND(bill.electricityAmount)}</td>
          </tr>
          <tr>
            <td className="border px-2 py-1" colSpan={4}>Tiền nước</td>
            <td className="border px-2 py-1 text-right">{formatVND(bill.waterAmount)}</td>
          </tr>
          <tr className="font-bold">
            <td className="border px-2 py-1" colSpan={4}>Tổng cộng</td>
            <td className="border px-2 py-1 text-right">{formatVND(bill.grandTotal)}</td>
          </tr>
        </tbody>
      </table>

      <section>
        <h2 className="mb-2 font-semibold">Đã thanh toán: {formatVND(paid)} / {formatVND(bill.grandTotal)}</h2>
        <ul className="mb-3 rounded border bg-white text-sm">
          {bill.payments.map((p) => (
            <li key={p.id} className="flex justify-between border-b px-3 py-2 last:border-0">
              <span>{p.paidAt.toLocaleDateString("vi-VN")} · {p.method === "cash" ? "Tiền mặt" : "Chuyển khoản"}</span>
              <span className="flex items-center gap-2">
                {formatVND(p.amount)}
                {p.receiptImageUrl && <a href={p.receiptImageUrl} target="_blank" className="text-blue-600 underline">biên lai</a>}
              </span>
            </li>
          ))}
          {bill.payments.length === 0 && <li className="px-3 py-2 text-gray-400">Chưa có thanh toán.</li>}
        </ul>
        <PaymentPanel billId={bill.id} action={recordPayment} />
      </section>

      <Link href="/hoa-don" className="text-blue-600 underline">← Về danh sách hóa đơn</Link>
    </div>
  );
}
