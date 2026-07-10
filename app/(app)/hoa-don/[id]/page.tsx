import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatVND, formatDate } from "@/lib/format";
import type { LineItem } from "@/lib/billing";
import { billStatusFor } from "@/lib/billing";
import { BackLink } from "@/components/back-link";
import { recordPayment } from "./payment-actions";
import { PaymentPanel } from "./payment-panel";
import { DeleteBillButton } from "./delete-bill-button";
import { FileDown, Pencil } from "lucide-react";

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1>{bill.lease.unit.name} — {bill.periodLabel}</h1>
        <div className="flex shrink-0 gap-2 self-start">
          <a
            href={`/hoa-don/${bill.id}/pdf`}
            target="_blank"
            className="btn-secondary"
          >
            <FileDown size={18} /> Xuất PDF
          </a>
          {display !== "paid" && bill.payments.length === 0 && (
            <Link href={`/hoa-don/${bill.id}/edit`} className="btn-secondary">
              <Pencil size={18} /> Sửa
            </Link>
          )}
          <DeleteBillButton billId={bill.id} />
        </div>
      </div>
      <p className="text-sm text-muted">
        Khách: {bill.lease.tenant.fullName} · {bill.lease.tenant.phone} ·
        Trạng thái: <span className={badgeClass}>{STATUS_LABEL[display]}</span>
      </p>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[480px] text-sm">
          {/* Line items section — hidden for elec_water bills */}
          {bill.type !== "elec_water" && (
            <>
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
              </tbody>
            </>
          )}
          {/* Electricity row — hidden for room bills */}
          {bill.type !== "room" && (
            <tbody>
              <tr className="border-b border-line">
                <td className="px-3 py-2 text-ink" colSpan={4}>
                  Tiền điện
                  {bill.electricityNew != null && bill.electricityOld != null && (
                    <span className="text-muted">
                      {" "}({bill.electricityNew} − {bill.electricityOld} = {bill.electricityNew - bill.electricityOld} kWh
                      × {formatVND(bill.electricityRate ?? 0)})
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-right text-ink">{formatVND(bill.electricityAmount)}</td>
              </tr>
            </tbody>
          )}
          {/* Water row — hidden for room bills */}
          {bill.type !== "room" && (
            <tbody>
              <tr className="border-b border-line">
                <td className="px-3 py-2 text-ink" colSpan={4}>
                  Tiền nước
                  {bill.waterNew != null && bill.waterOld != null && (
                    <span className="text-muted">
                      {" "}({bill.waterNew} − {bill.waterOld} = {Math.round((bill.waterNew - bill.waterOld) * 100) / 100} m³
                      × {formatVND(bill.waterRate ?? 0)})
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-right text-ink">{formatVND(bill.waterAmount)}</td>
              </tr>
            </tbody>
          )}
          {/* Grand total — always shown */}
          <tfoot>
            <tr className="font-bold">
              <td className="px-3 py-2 text-ink" colSpan={4}>Tổng cộng</td>
              <td className="px-3 py-2 text-right text-ink">{formatVND(bill.grandTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <section>
        <h2 className="mb-2">Đã thanh toán: {formatVND(paid)} / {formatVND(bill.grandTotal)}</h2>
        <ul className="card mb-3 overflow-hidden text-sm">
          {bill.payments.map((p) => {
            const receipts = (p.receiptImages as unknown as string[]) ?? [];
            return (
              <li key={p.id} className="space-y-2 border-b border-line px-4 py-3 last:border-0 hover:bg-cream">
                <div className="flex justify-between">
                  <span className="text-ink">{formatDate(p.paidAt)} · {p.method === "cash" ? "Tiền mặt" : "Chuyển khoản"}</span>
                  <span className="text-ink">{formatVND(p.amount)}</span>
                </div>
                {receipts.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {receipts.map((url, i) => (
                      <a key={url} href={url} target="_blank">
                        <img src={url} alt={`biên lai ${i + 1}`} className="h-16 w-16 rounded border object-cover" />
                      </a>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
          {bill.payments.length === 0 && <li className="px-4 py-3 text-muted">Chưa có thanh toán.</li>}
        </ul>
        <PaymentPanel billId={bill.id} remaining={Math.max(0, bill.grandTotal - paid)} action={recordPayment} />
      </section>
    </div>
  );
}
