"use client";

import { useMemo, useState } from "react";
import { formatVND, formatDate } from "@/lib/format";
import { matchesQuery } from "@/lib/search";
import { SearchBox } from "@/components/search-box";

type Row = {
  date: Date;
  description: string;
  incomeRoom: number;
  incomeUtilities: number;
  expense: number;
  balance: number;
};

export function LedgerTable({ rows }: { rows: Row[] }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(
    () => rows.filter((r) => matchesQuery(`${formatDate(r.date)} ${r.description}`, q)),
    [rows, q],
  );

  return (
    <div>
      <SearchBox value={q} onChange={setQ} placeholder="Lọc theo ngày hoặc nội dung… (vd: 01/2026)" />
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="bg-cream text-muted">
              <th className="px-4 py-3 text-center">TT</th>
              <th className="px-4 py-3 text-left">Ngày</th>
              <th className="px-4 py-3 text-left">Nội dung</th>
              <th className="px-4 py-3 text-right">Thu tiền phòng và DV</th>
              <th className="px-4 py-3 text-right">Thu tiền điện nước</th>
              <th className="px-4 py-3 text-right">Chi</th>
              <th className="px-4 py-3 text-right">Tổng thu</th>
              <th className="px-4 py-3 text-right">Tồn</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={i} className="border-t border-line">
                <td className="px-4 py-3 text-center text-muted">{i + 1}</td>
                <td className="px-4 py-3">{formatDate(r.date)}</td>
                <td className="px-4 py-3">{r.description}</td>
                <td className="px-4 py-3 text-right">
                  {r.incomeRoom ? formatVND(r.incomeRoom) : ""}
                </td>
                <td className="px-4 py-3 text-right">
                  {r.incomeUtilities ? formatVND(r.incomeUtilities) : ""}
                </td>
                <td className="px-4 py-3 text-right text-danger">
                  {r.expense ? formatVND(r.expense) : ""}
                </td>
                <td className="px-4 py-3 text-right">
                  {r.incomeRoom + r.incomeUtilities ? formatVND(r.incomeRoom + r.incomeUtilities) : ""}
                </td>
                <td className="px-4 py-3 text-right font-medium text-ink">{formatVND(r.balance)}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-4 text-center text-muted">
                  {rows.length === 0 ? "Chưa có giao dịch." : "Không tìm thấy giao dịch phù hợp."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
