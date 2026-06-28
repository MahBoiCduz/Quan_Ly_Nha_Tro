import Link from "next/link";
import { FileDown } from "lucide-react";
import { formatVND } from "@/lib/format";
import { billStatusFor } from "@/lib/billing";

const STATUS_LABEL: Record<string, string> = { unpaid: "Chưa thu", paid: "Đã thu", overdue: "Quá hạn" };

export type BillRow = {
  id: string;
  periodLabel: string;
  grandTotal: number;
  dueDate: Date;
  payments: { amount: number }[];
};

/** The card-list of a lease's bills, shared by the room page and the history page. */
export function LeaseBillsList({ bills, emptyLabel = "Chưa có hóa đơn nào." }: { bills: BillRow[]; emptyLabel?: string }) {
  return (
    <ul className="card overflow-hidden text-sm">
      {bills.map((b) => {
        const totalPaid = b.payments.reduce((s, p) => s + p.amount, 0);
        const display = billStatusFor(b.grandTotal, totalPaid, b.dueDate);
        const badgeClass =
          display === "overdue" ? "badge-danger" : display === "paid" ? "badge-ok" : "badge-warn";
        return (
          <li
            key={b.id}
            className="flex flex-col gap-1.5 border-b border-line px-4 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
          >
            <Link href={`/hoa-don/${b.id}`} className="min-w-0 text-ink hover:underline">
              {b.periodLabel}
            </Link>
            <span className="flex shrink-0 items-center gap-3">
              <span className="text-ink">{formatVND(b.grandTotal)}</span>
              <span className={badgeClass}>{STATUS_LABEL[display]}</span>
              <a
                href={`/hoa-don/${b.id}/pdf`}
                target="_blank"
                className="btn-secondary py-1 text-xs"
              >
                <FileDown size={14} /> PDF
              </a>
            </span>
          </li>
        );
      })}
      {bills.length === 0 && <li className="px-4 py-3 text-muted">{emptyLabel}</li>}
    </ul>
  );
}
