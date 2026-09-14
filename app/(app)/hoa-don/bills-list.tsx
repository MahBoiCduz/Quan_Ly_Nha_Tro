"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatVND } from "@/lib/format";
import { billStatusFor, billTypeLabel } from "@/lib/billing";
import { matchesQuery } from "@/lib/search";
import { SearchBox } from "@/components/search-box";
import {
  ALL_PERIODS,
  ALL_TYPES,
  buildPeriodOptions,
  periodKey,
  periodOptionLabel,
} from "@/lib/invoice-batch";
import { BillsBatchExport } from "@/components/bills-batch-export";

type BillRow = {
  id: string;
  unitName: string;
  periodLabel: string;
  tenantName: string;
  type: string;
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

const TYPE_FILTERS: { key: string; label: string }[] = [
  { key: ALL_TYPES, label: "Tất cả loại" },
  { key: "room", label: billTypeLabel("room") },
  { key: "elec_water", label: billTypeLabel("elec_water") },
  { key: "both", label: billTypeLabel("both") },
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
  // The period filter works on Bill.periodLabel (free text), grouped by a
  // whitespace-insensitive key — see lib/invoice-batch.ts.
  const [period, setPeriod] = useState<string>(ALL_PERIODS);
  const [type, setType] = useState<string>(ALL_TYPES);
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set<string>());
  const selectAllRef = useRef<HTMLInputElement>(null);

  // Attach the computed status and push overdue bills to the top. Array.sort is
  // stable, so bills keep their createdAt-desc order within each status group.
  const ranked = useMemo(
    () =>
      bills
        .map((b) => ({ ...b, status: billStatusFor(b.grandTotal, b.totalPaid, b.dueDate) }))
        .sort((a, b) => RANK[a.status] - RANK[b.status]),
    [bills],
  );

  const periods = useMemo(() => buildPeriodOptions(bills), [bills]);

  const filtered = useMemo(
    () =>
      ranked.filter(
        (b) =>
          (filter === "all" || b.status === filter) &&
          (period === ALL_PERIODS || periodKey(b.periodLabel) === period) &&
          (type === ALL_TYPES || b.type === type) &&
          matchesQuery(`${b.unitName} ${b.periodLabel} ${b.tenantName} ${billTypeLabel(b.type)}`, q),
      ),
    [ranked, filter, period, type, q],
  );

  // The selection follows the bills, not the filters: narrowing the list must
  // not silently drop bills the user already ticked.
  const selectedBills = useMemo(() => ranked.filter((b) => selected.has(b.id)), [ranked, selected]);
  const hiddenSelectedCount = useMemo(() => {
    const visible = new Set(filtered.map((b) => b.id));
    return selectedBills.filter((b) => !visible.has(b.id)).length;
  }, [filtered, selectedBills]);
  const allVisibleSelected = filtered.length > 0 && filtered.every((b) => selected.has(b.id));
  const someVisibleSelected = filtered.some((b) => selected.has(b.id));

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someVisibleSelected && !allVisibleSelected;
    }
  }, [someVisibleSelected, allVisibleSelected]);

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) filtered.forEach((b) => next.delete(b.id));
      else filtered.forEach((b) => next.add(b.id));
      return next;
    });
  }

  return (
    <div>
      <SearchBox value={q} onChange={setQ} placeholder="Tìm theo phòng, tháng hoặc tên… (vd: 301, tháng 6)" />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label htmlFor="period-filter" className="text-sm text-muted">
          Kỳ
        </label>
        <select
          id="period-filter"
          className="input w-auto max-w-full"
          value={period}
          onChange={(event) => setPeriod(event.target.value)}
        >
          <option value={ALL_PERIODS}>Tất cả các kỳ ({bills.length})</option>
          {periods.map((option) => (
            <option key={option.key} value={option.key}>
              {periodOptionLabel(option)}
            </option>
          ))}
        </select>

        <label htmlFor="type-filter" className="text-sm text-muted">
          Loại
        </label>
        <select
          id="type-filter"
          className="input w-auto max-w-full"
          value={type}
          onChange={(event) => setType(event.target.value)}
        >
          {TYPE_FILTERS.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

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

      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-line bg-surface px-4 py-2.5">
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            ref={selectAllRef}
            type="checkbox"
            className="h-4 w-4 accent-brand"
            checked={allVisibleSelected}
            onChange={toggleAllVisible}
            disabled={filtered.length === 0}
          />
          Chọn tất cả ({filtered.length})
        </label>
        {hiddenSelectedCount > 0 && (
          <span className="text-xs text-muted">
            ({hiddenSelectedCount} hoá đơn đã chọn không hiện trong danh sách)
          </span>
        )}
        <BillsBatchExport bills={selectedBills} onClearSelection={() => setSelected(new Set())} />
      </div>

      <ul className="card overflow-hidden">
        {filtered.map((b) => {
          const badgeClass =
            b.status === "overdue" ? "badge-danger" : b.status === "paid" ? "badge-ok" : "badge-warn";
          return (
            <li
              key={b.id}
              className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-0 hover:bg-cream"
            >
              <input
                type="checkbox"
                className="h-4 w-4 shrink-0 accent-brand"
                checked={selected.has(b.id)}
                onChange={() => toggleOne(b.id)}
                aria-label={`Chọn hoá đơn ${b.unitName} ${b.periodLabel}`}
              />
              <Link
                href={`/hoa-don/${b.id}`}
                className="flex min-w-0 flex-1 flex-col gap-1.5 text-[15px] sm:flex-row sm:items-center sm:justify-between sm:gap-3"
              >
                <span className="flex min-w-0 items-center gap-2 text-ink">
                  <span className="badge-muted shrink-0">{billTypeLabel(b.type)}</span>
                  <span className="truncate">
                    {b.unitName} · {b.periodLabel} · {b.tenantName}
                  </span>
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
