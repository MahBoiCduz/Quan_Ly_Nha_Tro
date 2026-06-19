import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { db } from "@/lib/db";
import { buildLedger } from "@/lib/ledger";
import { loadLedgerInputs } from "@/lib/ledger-source";

export async function GET() {
  const { payments, expenses } = await loadLedgerInputs(db);
  const rows = buildLedger(payments, expenses);

  const data = rows.map((r, i) => ({
    TT: i + 1,
    Ngày: r.date.toLocaleDateString("vi-VN"),
    "Nội dung": r.description,
    "Thu tiền phòng và DV": r.incomeRoom || "",
    "Thu tiền điện nước": r.incomeUtilities || "",
    Chi: r.expense || "",
    "Tổng thu": (r.incomeRoom + r.incomeUtilities) || "",
    Tồn: r.balance,
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "So sach");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="so-sach.xlsx"',
    },
  });
}
