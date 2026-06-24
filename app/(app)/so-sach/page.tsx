import { db } from "@/lib/db";
import { formatVND, formatDate } from "@/lib/format";
import { buildLedger, monthlySummary } from "@/lib/ledger";
import { loadLedgerInputs } from "@/lib/ledger-source";
import { FileDown } from "lucide-react";

export default async function LedgerPage() {
  const { payments, expenses } = await loadLedgerInputs(db);
  const rows = buildLedger(payments, expenses);
  const sums = monthlySummary(rows);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1>Sổ sách</h1>
        <a href="/so-sach/export" className="btn-secondary">
          <FileDown size={18} />
          Xuất Excel
        </a>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
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
            {rows.map((r, i) => (
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
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-4 text-center text-muted">
                  Chưa có giao dịch.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="mb-3">Tổng kết theo tháng</h2>
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-cream text-muted">
                <th className="px-4 py-3 text-left">Tháng</th>
                <th className="px-4 py-3 text-right">Thu phòng và DV</th>
                <th className="px-4 py-3 text-right">Thu điện nước</th>
                <th className="px-4 py-3 text-right">Chi</th>
              </tr>
            </thead>
            <tbody>
              {sums.map((s) => (
                <tr key={s.month} className="border-t border-line">
                  <td className="px-4 py-3">{s.month}</td>
                  <td className="px-4 py-3 text-right">{formatVND(s.incomeRoom)}</td>
                  <td className="px-4 py-3 text-right">{formatVND(s.incomeUtilities)}</td>
                  <td className="px-4 py-3 text-right text-danger">{formatVND(s.expense)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
