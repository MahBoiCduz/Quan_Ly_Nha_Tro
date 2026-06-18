# Plan 4 — Ledger & Expenses Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the manual Google Sheet — log building expenses, and present a chronological income/expense ledger with a running balance and monthly summaries, exportable to Excel.

**Architecture:** The ledger is a derived view, not a stored table: it merges `Payment` rows (income) with `Expense` rows (outflow), sorts by date, and computes a running balance. Each payment's income is split between the two columns the family uses ("phòng và DV" vs "điện nước") in proportion to its bill's composition. All merging/splitting/summary math is pure and unit-tested. Excel export reuses the same derived rows.

**Tech Stack:** Next.js 14 Server Components + Server Actions, Prisma, zod, `xlsx` (SheetJS), Vitest.

## Global Constraints

- Carried from Plans 1–3: Next.js 14 App Router, TypeScript, Vietnamese UI, Prisma, money as integer đồng, secrets from env.
- The ledger is derived at request time from `Payment` + `Expense`; never persisted.
- Income split is deterministic integer arithmetic; any rounding remainder goes to the "phòng và DV" column.
- Expense categories are a fixed Vietnamese list: `Điện`, `Nước`, `Internet`, `Sửa chữa`, `Mua sắm`, `Khác`.

---

### Task 1: Ledger derivation logic

**Files:**
- Create: `lib/ledger.ts`
- Test: `lib/ledger.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces (all pure):
  - `type LedgerRow = { date: Date; description: string; incomeRoom: number; incomeUtilities: number; expense: number; balance: number }`
  - `allocatePaymentIncome(amount: number, billSubtotal: number, billUtilities: number): { room: number; utilities: number }`
  - `buildLedger(payments: LedgerPayment[], expenses: LedgerExpense[], opening?: number): LedgerRow[]` where `LedgerPayment = { date: Date; description: string; amount: number; billSubtotal: number; billUtilities: number }` and `LedgerExpense = { date: Date; description: string; amount: number }`.
  - `monthlySummary(rows: LedgerRow[]): { month: string; incomeRoom: number; incomeUtilities: number; expense: number }[]` keyed by `YYYY-MM`.
  - Tasks 2–3 consume `buildLedger` and `monthlySummary`.

- [ ] **Step 1: Write the failing tests**

Create `lib/ledger.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { allocatePaymentIncome, buildLedger, monthlySummary } from "@/lib/ledger";

describe("allocatePaymentIncome", () => {
  it("splits proportionally by subtotal vs utilities", () => {
    // grandTotal 1000 = subtotal 800 + utilities 200; pay 1000
    expect(allocatePaymentIncome(1000, 800, 200)).toEqual({ room: 800, utilities: 200 });
  });
  it("puts the rounding remainder in the room column", () => {
    // subtotal 1, utilities 1 (grand 2); pay 1 → utilities floor(0.5)=0, room gets the rest
    expect(allocatePaymentIncome(1, 1, 1)).toEqual({ room: 1, utilities: 0 });
  });
  it("treats a zero-total bill as all room income", () => {
    expect(allocatePaymentIncome(500, 0, 0)).toEqual({ room: 500, utilities: 0 });
  });
});

describe("buildLedger", () => {
  it("merges, sorts by date, and runs a balance", () => {
    const rows = buildLedger(
      [{ date: new Date("2026-01-02"), description: "P301", amount: 1000, billSubtotal: 800, billUtilities: 200 }],
      [{ date: new Date("2026-01-01"), description: "Internet", amount: 300 }],
      100,
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ description: "Internet", expense: 300, balance: -200 });
    expect(rows[1]).toMatchObject({ description: "P301", incomeRoom: 800, incomeUtilities: 200, balance: 800 });
  });
});

describe("monthlySummary", () => {
  it("aggregates rows by year-month", () => {
    const rows = buildLedger(
      [
        { date: new Date("2026-01-10"), description: "a", amount: 1000, billSubtotal: 600, billUtilities: 400 },
        { date: new Date("2026-02-10"), description: "b", amount: 500, billSubtotal: 500, billUtilities: 0 },
      ],
      [],
    );
    const sums = monthlySummary(rows);
    expect(sums).toContainEqual({ month: "2026-01", incomeRoom: 600, incomeUtilities: 400, expense: 0 });
    expect(sums).toContainEqual({ month: "2026-02", incomeRoom: 500, incomeUtilities: 0, expense: 0 });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- ledger`
Expected: FAIL — cannot resolve `@/lib/ledger`.

- [ ] **Step 3: Implement `lib/ledger.ts`**

```typescript
export type LedgerRow = {
  date: Date;
  description: string;
  incomeRoom: number;
  incomeUtilities: number;
  expense: number;
  balance: number;
};

export type LedgerPayment = {
  date: Date;
  description: string;
  amount: number;
  billSubtotal: number;
  billUtilities: number;
};

export type LedgerExpense = { date: Date; description: string; amount: number };

export function allocatePaymentIncome(
  amount: number,
  billSubtotal: number,
  billUtilities: number,
): { room: number; utilities: number } {
  const grand = billSubtotal + billUtilities;
  if (grand <= 0) return { room: amount, utilities: 0 };
  const utilities = Math.floor((amount * billUtilities) / grand);
  return { room: amount - utilities, utilities };
}

export function buildLedger(
  payments: LedgerPayment[],
  expenses: LedgerExpense[],
  opening: number = 0,
): LedgerRow[] {
  type Pre = Omit<LedgerRow, "balance">;
  const pre: Pre[] = [];

  for (const p of payments) {
    const { room, utilities } = allocatePaymentIncome(p.amount, p.billSubtotal, p.billUtilities);
    pre.push({ date: p.date, description: p.description, incomeRoom: room, incomeUtilities: utilities, expense: 0 });
  }
  for (const e of expenses) {
    pre.push({ date: e.date, description: e.description, incomeRoom: 0, incomeUtilities: 0, expense: e.amount });
  }

  pre.sort((a, b) => a.date.getTime() - b.date.getTime());

  let balance = opening;
  return pre.map((r) => {
    balance += r.incomeRoom + r.incomeUtilities - r.expense;
    return { ...r, balance };
  });
}

export function monthlySummary(
  rows: LedgerRow[],
): { month: string; incomeRoom: number; incomeUtilities: number; expense: number }[] {
  const map = new Map<string, { incomeRoom: number; incomeUtilities: number; expense: number }>();
  for (const r of rows) {
    const month = `${r.date.getFullYear()}-${String(r.date.getMonth() + 1).padStart(2, "0")}`;
    const acc = map.get(month) ?? { incomeRoom: 0, incomeUtilities: 0, expense: 0 };
    acc.incomeRoom += r.incomeRoom;
    acc.incomeUtilities += r.incomeUtilities;
    acc.expense += r.expense;
    map.set(month, acc);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({ month, ...v }));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- ledger`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: pure ledger derivation and monthly summary logic"
```

---

### Task 2: Expense logging

**Files:**
- Create: `lib/expense-schema.ts`, `app/(app)/chi-tieu/page.tsx`, `app/(app)/chi-tieu/expense-actions.ts`, `app/(app)/chi-tieu/expense-form.tsx`
- Test: `lib/expense-schema.test.ts`

**Interfaces:**
- Consumes: `db`, `formatVND`.
- Produces:
  - `EXPENSE_CATEGORIES: readonly string[]` = `["Điện","Nước","Internet","Sửa chữa","Mua sắm","Khác"]`.
  - `expenseSchema` (zod): `date`, `description` (min 1), `category` (must be in `EXPENSE_CATEGORIES`), `amount` int positive.
  - Server actions `createExpense(formData)` and `deleteExpense(id)`.
  - Task 3's ledger reads the `Expense` rows produced here.

- [ ] **Step 1: Write the failing schema test**

Create `lib/expense-schema.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { expenseSchema, EXPENSE_CATEGORIES } from "@/lib/expense-schema";

describe("expenseSchema", () => {
  it("exposes the fixed category list", () => {
    expect(EXPENSE_CATEGORIES).toContain("Sửa chữa");
  });
  it("accepts a valid expense", () => {
    expect(expenseSchema.safeParse({
      date: "2026-01-08", description: "Internet Viettel", category: "Internet", amount: 3228000,
    }).success).toBe(true);
  });
  it("rejects an unknown category", () => {
    expect(expenseSchema.safeParse({
      date: "2026-01-08", description: "x", category: "Du lịch", amount: 1,
    }).success).toBe(false);
  });
  it("rejects a non-positive amount", () => {
    expect(expenseSchema.safeParse({
      date: "2026-01-08", description: "x", category: "Khác", amount: 0,
    }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- expense-schema`
Expected: FAIL — cannot resolve `@/lib/expense-schema`.

- [ ] **Step 3: Implement the schema**

Create `lib/expense-schema.ts`:
```typescript
import { z } from "zod";

export const EXPENSE_CATEGORIES = ["Điện", "Nước", "Internet", "Sửa chữa", "Mua sắm", "Khác"] as const;

export const expenseSchema = z.object({
  date: z.string().min(1),
  description: z.string().min(1),
  category: z.enum(EXPENSE_CATEGORIES),
  amount: z.number().int().positive(),
});

export type ExpenseInput = z.infer<typeof expenseSchema>;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- expense-schema`
Expected: PASS (4 tests).

- [ ] **Step 5: Write the expense actions**

Create `app/(app)/chi-tieu/expense-actions.ts`:
```typescript
"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { expenseSchema } from "@/lib/expense-schema";

export async function createExpense(formData: FormData) {
  const parsed = expenseSchema.safeParse({
    date: formData.get("date"),
    description: formData.get("description"),
    category: formData.get("category"),
    amount: Number(formData.get("amount") ?? 0),
  });
  if (!parsed.success) return { error: "Dữ liệu không hợp lệ" };
  const d = parsed.data;
  await db.expense.create({
    data: { date: new Date(d.date), description: d.description, category: d.category, amount: d.amount },
  });
  revalidatePath("/chi-tieu");
  revalidatePath("/so-sach");
  return { ok: true };
}

export async function deleteExpense(id: string) {
  await db.expense.delete({ where: { id } });
  revalidatePath("/chi-tieu");
  revalidatePath("/so-sach");
  return { ok: true };
}
```

- [ ] **Step 6: Build the expense form**

Create `app/(app)/chi-tieu/expense-form.tsx`:
```tsx
"use client";

import { useState } from "react";
import { EXPENSE_CATEGORIES } from "@/lib/expense-schema";
import { createExpense } from "./expense-actions";

export function ExpenseForm() {
  const [error, setError] = useState("");
  async function onSubmit(formData: FormData) {
    setError("");
    const res = await createExpense(formData);
    if (res?.error) setError(res.error);
  }
  return (
    <form action={onSubmit} className="mb-4 flex flex-wrap items-end gap-2">
      <input name="date" type="date" required className="rounded border px-2 py-1" />
      <input name="description" placeholder="Nội dung" required className="rounded border px-2 py-1" />
      <select name="category" required className="rounded border px-2 py-1">
        {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <input name="amount" type="number" min="1" placeholder="Số tiền" required className="w-32 rounded border px-2 py-1" />
      <button className="rounded bg-blue-600 px-3 py-1 text-white">Thêm chi tiêu</button>
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </form>
  );
}
```

- [ ] **Step 7: Build the expenses page**

Create `app/(app)/chi-tieu/page.tsx`:
```tsx
import { db } from "@/lib/db";
import { formatVND } from "@/lib/format";
import { ExpenseForm } from "./expense-form";
import { deleteExpense } from "./expense-actions";

export default async function ExpensesPage() {
  const expenses = await db.expense.findMany({ orderBy: { date: "desc" } });
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Chi tiêu</h1>
      <ExpenseForm />
      <table className="w-full border bg-white text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-2 py-1 text-left">Ngày</th>
            <th className="border px-2 py-1 text-left">Nội dung</th>
            <th className="border px-2 py-1">Phân loại</th>
            <th className="border px-2 py-1 text-right">Số tiền</th>
            <th className="border px-2 py-1"></th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((e) => (
            <tr key={e.id}>
              <td className="border px-2 py-1">{e.date.toLocaleDateString("vi-VN")}</td>
              <td className="border px-2 py-1">{e.description}</td>
              <td className="border px-2 py-1 text-center">{e.category}</td>
              <td className="border px-2 py-1 text-right">{formatVND(e.amount)}</td>
              <td className="border px-2 py-1 text-center">
                <form action={deleteExpense.bind(null, e.id)}>
                  <button className="text-red-600 hover:underline">Xóa</button>
                </form>
              </td>
            </tr>
          ))}
          {expenses.length === 0 && <tr><td colSpan={5} className="px-2 py-2 text-center text-gray-400">Chưa có chi tiêu.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 8: Manually verify**

Run `npm run dev`, go to `/chi-tieu`, add "Internet Viettel năm 2026 / Internet / 3228000", see it listed, delete it. Stop the server.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: expense logging with fixed categories"
```

---

### Task 3: Ledger view + Excel export

**Files:**
- Create: `lib/ledger-source.ts`, `app/(app)/so-sach/page.tsx`, `app/(app)/so-sach/export/route.ts`
- Test: `lib/ledger-source.test.ts`

**Interfaces:**
- Consumes: `db`, `buildLedger`/`monthlySummary` (`@/lib/ledger`), `formatVND`, `Setting` (for opening balance — optional, default 0), `xlsx`.
- Produces:
  - `loadLedgerInputs(db): Promise<{ payments: LedgerPayment[]; expenses: LedgerExpense[] }>` — maps `Payment` (joined to its bill for `subtotal`/utilities and to the unit for the description) and `Expense` rows into the shapes `buildLedger` expects.
  - `GET /so-sach/export` → streams an `.xlsx` of the ledger rows.

- [ ] **Step 1: Write the failing mapping test**

Create `lib/ledger-source.test.ts`:
```typescript
import { describe, it, expect, vi } from "vitest";
import { loadLedgerInputs } from "@/lib/ledger-source";

describe("loadLedgerInputs", () => {
  it("maps payments and expenses into ledger inputs", async () => {
    const fakeDb = {
      payment: {
        findMany: vi.fn().mockResolvedValue([
          {
            amount: 1000, paidAt: new Date("2026-01-02"),
            bill: { subtotal: 800, electricityAmount: 150, waterAmount: 50, lease: { unit: { name: "P301" } }, periodLabel: "T1" },
          },
        ]),
      },
      expense: {
        findMany: vi.fn().mockResolvedValue([
          { amount: 300, date: new Date("2026-01-01"), description: "Internet", category: "Internet" },
        ]),
      },
    };
    const { payments, expenses } = await loadLedgerInputs(fakeDb as any);
    expect(payments[0]).toMatchObject({ amount: 1000, billSubtotal: 800, billUtilities: 200 });
    expect(payments[0].description).toContain("P301");
    expect(expenses[0]).toMatchObject({ amount: 300, description: "Internet" });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- ledger-source`
Expected: FAIL — cannot resolve `@/lib/ledger-source`.

- [ ] **Step 3: Implement the mapping**

Create `lib/ledger-source.ts`:
```typescript
import type { PrismaClient } from "@prisma/client";
import type { LedgerPayment, LedgerExpense } from "@/lib/ledger";

export async function loadLedgerInputs(
  db: PrismaClient,
): Promise<{ payments: LedgerPayment[]; expenses: LedgerExpense[] }> {
  const paymentRows = await db.payment.findMany({
    include: { bill: { include: { lease: { include: { unit: true } } } } },
    orderBy: { paidAt: "asc" },
  });
  const expenseRows = await db.expense.findMany({ orderBy: { date: "asc" } });

  const payments: LedgerPayment[] = paymentRows.map((p) => ({
    date: p.paidAt,
    description: `${p.bill.lease.unit.name} - ${p.bill.periodLabel}`,
    amount: p.amount,
    billSubtotal: p.bill.subtotal,
    billUtilities: p.bill.electricityAmount + p.bill.waterAmount,
  }));

  const expenses: LedgerExpense[] = expenseRows.map((e) => ({
    date: e.date,
    description: `${e.description} (${e.category})`,
    amount: e.amount,
  }));

  return { payments, expenses };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- ledger-source`
Expected: PASS (1 test).

- [ ] **Step 5: Build the ledger page**

Create `app/(app)/so-sach/page.tsx`:
```tsx
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
        <a href="/so-sach/export" className="rounded bg-green-700 px-3 py-2 text-white">Xuất Excel</a>
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
              <td className="border px-2 py-1 text-right">{r.incomeRoom ? formatVND(r.incomeRoom) : ""}</td>
              <td className="border px-2 py-1 text-right">{r.incomeUtilities ? formatVND(r.incomeUtilities) : ""}</td>
              <td className="border px-2 py-1 text-right text-red-600">{r.expense ? formatVND(r.expense) : ""}</td>
              <td className="border px-2 py-1 text-right font-medium">{formatVND(r.balance)}</td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={7} className="px-2 py-2 text-center text-gray-400">Chưa có giao dịch.</td></tr>}
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
```

- [ ] **Step 6: Install xlsx and build the export route**

Run:
```bash
npm install xlsx
```
Create `app/(app)/so-sach/export/route.ts`:
```typescript
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
```

- [ ] **Step 7: Manually verify**

Run `npm run dev`. With at least one recorded payment (Plan 3) and one expense, visit `/so-sach`: rows are sorted by date with a running "Tồn" balance, and the monthly summary totals appear. Click "Xuất Excel" → an `.xlsx` downloads and opens with the same rows. Stop the server.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: derived ledger view with monthly summary and Excel export"
```

---

## Self-Review

**Spec coverage (Plan 4 portion):** Ledger columns TT/Ngày/Nội dung/Thu phòng+DV/Thu điện nước/Chi/Tồn — Task 3 ✓ (TT is the row index; "Tổng thu"/"TK có" from the old sheet are represented by the running "Tồn" balance + monthly summary, which is the faithful modern equivalent). Monthly summary auto-calculated — Tasks 1 & 3 ✓. Running balance — Task 1 ✓. Excel export — Task 3 ✓. Expense logging with the six categories, feeding the ledger's Chi column — Tasks 2–3 ✓.

**Placeholder scan:** No TBDs; all steps are runnable. The opening-balance parameter defaults to 0 (documented) rather than being left unspecified.

**Type consistency:** `LedgerRow`/`LedgerPayment`/`LedgerExpense` defined in Task 1, consumed by Tasks 1 & 3 ✓. `buildLedger`/`monthlySummary`/`allocatePaymentIncome` signatures match between definition and use ✓. `EXPENSE_CATEGORIES`/`expenseSchema` defined in Task 2, reused in the form ✓. `loadLedgerInputs` returns exactly the shape `buildLedger` consumes ✓.

---

**Carries into Plan 5:** Maintenance is independent of the ledger; it only needs the Plan 1 foundation (`db`, app shell, units).
