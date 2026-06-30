"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatVND } from "@/lib/format";
import { billStatusFor } from "@/lib/billing";
import { matchesQuery } from "@/lib/search";
import { SearchBox } from "@/components/search-box";

type BillRow = {
  id: string;
  unitName: string;
  periodLabel: string;
  tenantName: string;
  grandTotal: number;
  dueDate: Date;
  totalPaid: number;
};

type Status = "overdue" | "unpaid" | "paid";
type Filter = "all" | Status;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "overdue", label: "Quá hạn" },
  { key: "unpaid", label: "Chưa thu" },
  { key: "paid", label: "Đã thu" },
];

// Overdue first, then unpaid, then paid (createdAt order preserved within a group).
const RANK: Record<Status, number> = { overdue: 0, unpaid: 1, paid: 2 };

export function BillsList({ bills, initialStatus }: { bills: BillRow[]; initialStatus?: string }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>(
    initialStatus === "overdue" || initialStatus === "unpaid" || initialStatus === "paid"
      ? initialStatus
      : "all",
  );

  // Attach the computed status and push overdue bills to the top. Array.sort is
  // stable, so bills keep their createdAt-desc order within each status group.
  const ranked = useMemo(
    () =>
      bills
        .map((b) => ({ ...b, status: billStatusFor(b.grandTotal, b.totalPaid, b.dueDate) }))
        .sort((a, b) => RANK[a.status] - RANK[b.status]),
    [bills],
  );

  const filtered = useMemo(
    () =>
      ranked.filter(
        (b) =>
          (filter === "all" || b.status === filter) &&
          matchesQuery(`${b.unitName} ${b.periodLabel} ${b.tenantName}`, q),
      ),
    [ranked, filter, q],
  );

  return (
    <div>
      <SearchBox value={q} onChange={setQ} placeholder="Tìm theo phòng, tháng hoặc tên… (vd: 301, tháng 6)" />
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={
              filter === f.key
                ? "rounded-full bg-ink px-4 py-1.5 text-sm font-medium text-surface"
                : "rounded-full border border-line px-4 py-1.5 text-sm text-muted hover:bg-cream"
            }
          >
            {f.label}
          </button>
        ))}
      </div>
      <ul className="card overflow-hidden">
        {filtered.map((b) => {
          const badgeClass =
            b.status === "overdue" ? "badge-danger" : b.status === "paid" ? "badge-ok" : "badge-warn";
          return (
            <li key={b.id} className="border-b border-line last:border-0">
              <Link
                href={`/hoa-don/${b.id}`}
                className="flex flex-col gap-1.5 px-4 py-3 text-[15px] hover:bg-cream sm:flex-row sm:items-center sm:justify-between sm:gap-3"
              >
                <span className="min-w-0 text-ink">
                  {b.unitName} · {b.periodLabel} · {b.tenantName}
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="text-ink">{formatVND(b.grandTotal)}</span>
                  <span className={badgeClass}>
                    {b.status === "overdue" ? "Quá hạn" : b.status === "paid" ? "Đã thu" : "Chưa thu"}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li className="px-4 py-3 text-sm text-muted">
            {bills.length === 0 ? "Chưa có hóa đơn." : "Không tìm thấy hóa đơn phù hợp."}
          </li>
        )}
      </ul>
    </div>
  );
}
