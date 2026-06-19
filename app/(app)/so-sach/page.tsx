import { db } from "@/lib/db";
import { formatVND } from "@/lib/format";
import { buildLedger, monthlySummary } from "@/lib/ledger";
import { loadLedgerInputs } from "@/lib/ledger-source";

export default async function LedgerPage() {
  const { payments, expenses } = await loadLedgerInputs(db);
  const rows = buildLedger(payments, expenses);
  const sums = monthlySummary(rows);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sổ sách</h1>
        <a href="/so-sach/export" className="rounded bg-green-700 px-3 py-2 text-white">
          Xuất Excel
        </a>
      </div>

      <table className="mb-6 w-full border bg-white text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-2 py-1">TT</th>
            <th className="border px-2 py-1 text-left">Ngày</th>
            <th className="border px-2 py-1 text-left">Nội dung</th>
            <th className="border px-2 py-1 text-right">Thu tiền phòng và DV</th>
            <th className="border px-2 py-1 text-right">Thu tiền điện nước</th>
            <th className="border px-2 py-1 text-right">Chi</th>
            <th className="border px-2 py-1 text-right">Tồn</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="border px-2 py-1 text-center">{i + 1}</td>
              <td className="border px-2 py-1">{r.date.toLocaleDateString("vi-VN")}</td>
              <td className="border px-2 py-1">{r.description}</td>
              <td className="border px-2 py-1 text-right">
                {r.incomeRoom ? formatVND(r.incomeRoom) : ""}
              </td>
              <td className="border px-2 py-1 text-right">
                {r.incomeUtilities ? formatVND(r.incomeUtilities) : ""}
              </td>
              <td className="border px-2 py-1 text-right text-red-600">
                {r.expense ? formatVND(r.expense) : ""}
              </td>
              <td className="border px-2 py-1 text-right font-medium">{formatVND(r.balance)}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={7} className="px-2 py-2 text-center text-gray-400">
                Chưa có giao dịch.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <h2 className="mb-2 font-semibold">Tổng kết theo tháng</h2>
      <table className="w-full border bg-white text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-2 py-1">Tháng</th>
            <th className="border px-2 py-1 text-right">Thu phòng và DV</th>
            <th className="border px-2 py-1 text-right">Thu điện nước</th>
            <th className="border px-2 py-1 text-right">Chi</th>
          </tr>
        </thead>
        <tbody>
          {sums.map((s) => (
            <tr key={s.month}>
              <td className="border px-2 py-1">{s.month}</td>
              <td className="border px-2 py-1 text-right">{formatVND(s.incomeRoom)}</td>
              <td className="border px-2 py-1 text-right">{formatVND(s.incomeUtilities)}</td>
              <td className="border px-2 py-1 text-right text-red-600">{formatVND(s.expense)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
