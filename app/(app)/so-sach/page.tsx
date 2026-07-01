import { db } from "@/lib/db";
import { formatVND } from "@/lib/format";
import { buildLedger, monthlySummary } from "@/lib/ledger";
import { loadLedgerInputs } from "@/lib/ledger-source";
import { LedgerTable } from "./ledger-table";
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

      <LedgerTable rows={rows} />

      <div>
        <h2 className="mb-3">Tổng kết theo tháng</h2>
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
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
