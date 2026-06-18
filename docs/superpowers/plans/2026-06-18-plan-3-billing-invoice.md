# Plan 3 — Billing & Invoice PDF Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate a bill for a unit and period (auto-filling rent + service line items, with manual electricity/water entry), record payments against it (with a receipt screenshot), and export a PDF invoice that matches the family's existing template.

**Architecture:** All money math lives in pure, unit-tested functions in `lib/billing.ts`; the bill is a row whose `lineItems` JSON is a frozen snapshot taken at generation time (so later edits to a room's services never mutate past bills). Payments roll up to set the bill's `status`. The PDF is rendered server-side with `@react-pdf/renderer` and streamed from a route handler.

**Tech Stack:** Next.js 14 Server Actions, Prisma, zod, `@react-pdf/renderer`, Vitest.

## Global Constraints

- Carried from Plans 1–2: Next.js 14 App Router, TypeScript, Vietnamese UI, Prisma, money as integer đồng, secrets from env, ServiceItem field is `measureUnit`.
- Electricity and water are NOT part of the service line items and NOT part of `subtotal`; they are separate manual fields added only to `grandTotal` (matches the template's "Tổng tiền nhà và DV (trừ điện, nước)").
- A bill's `lineItems` is an immutable snapshot stored as JSON at generation time.
- Reuse the `/api/upload` route from Plan 2 for receipt screenshots.

---

### Task 1: Billing calculation logic

**Files:**
- Create: `lib/billing.ts`
- Test: `lib/billing.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces (all pure):
  - `type LineItem = { name: string; measureUnit: string; quantity: number; unitPrice: number; total: number }`
  - `lineTotal(quantity: number, unitPrice: number): number`
  - `buildDefaultLineItems(services: { name: string; measureUnit: string; defaultPrice: number }[], agreedRent: number): LineItem[]` — one line per service (quantity 1) plus a final "Tiền thuê phòng" line at `agreedRent`.
  - `computeSubtotal(items: LineItem[]): number`
  - `computeGrandTotal(subtotal: number, electricity: number, water: number): number`
  - `billStatusFor(grandTotal: number, totalPaid: number, dueDate: Date, now?: Date): "paid" | "overdue" | "unpaid"`
  - Tasks 2–4 consume all of these.

- [ ] **Step 1: Write the failing tests**

Create `lib/billing.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import {
  lineTotal, buildDefaultLineItems, computeSubtotal, computeGrandTotal, billStatusFor,
} from "@/lib/billing";

describe("lineTotal", () => {
  it("multiplies quantity by unit price", () => {
    expect(lineTotal(2, 150000)).toBe(300000);
  });
});

describe("buildDefaultLineItems", () => {
  it("adds a line per service plus a rent line", () => {
    const items = buildDefaultLineItems(
      [{ name: "Internet", measureUnit: "phòng", defaultPrice: 100000 }],
      4800000,
    );
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ name: "Internet", quantity: 1, unitPrice: 100000, total: 100000 });
    expect(items[1]).toMatchObject({ name: "Tiền thuê phòng", unitPrice: 4800000, total: 4800000 });
  });
});

describe("computeSubtotal", () => {
  it("sums the line totals", () => {
    expect(computeSubtotal([
      { name: "a", measureUnit: "x", quantity: 1, unitPrice: 100, total: 100 },
      { name: "b", measureUnit: "x", quantity: 2, unitPrice: 50, total: 100 },
    ])).toBe(200);
  });
});

describe("computeGrandTotal", () => {
  it("adds electricity and water to the subtotal", () => {
    expect(computeGrandTotal(5100000, 559000, 250000)).toBe(5909000);
  });
});

describe("billStatusFor", () => {
  const due = new Date("2026-06-05");
  it("is paid when fully covered", () => {
    expect(billStatusFor(5000000, 5000000, due, new Date("2026-06-10"))).toBe("paid");
  });
  it("is overdue when unpaid past the due date", () => {
    expect(billStatusFor(5000000, 0, due, new Date("2026-06-10"))).toBe("overdue");
  });
  it("is unpaid when before the due date", () => {
    expect(billStatusFor(5000000, 0, due, new Date("2026-06-01"))).toBe("unpaid");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- billing`
Expected: FAIL — cannot resolve `@/lib/billing`.

- [ ] **Step 3: Implement `lib/billing.ts`**

```typescript
export type LineItem = {
  name: string;
  measureUnit: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

export function lineTotal(quantity: number, unitPrice: number): number {
  return quantity * unitPrice;
}

export function buildDefaultLineItems(
  services: { name: string; measureUnit: string; defaultPrice: number }[],
  agreedRent: number,
): LineItem[] {
  const items: LineItem[] = services.map((s) => ({
    name: s.name,
    measureUnit: s.measureUnit,
    quantity: 1,
    unitPrice: s.defaultPrice,
    total: lineTotal(1, s.defaultPrice),
  }));
  items.push({
    name: "Tiền thuê phòng",
    measureUnit: "phòng",
    quantity: 1,
    unitPrice: agreedRent,
    total: agreedRent,
  });
  return items;
}

export function computeSubtotal(items: LineItem[]): number {
  return items.reduce((sum, i) => sum + i.total, 0);
}

export function computeGrandTotal(subtotal: number, electricity: number, water: number): number {
  return subtotal + electricity + water;
}

export function billStatusFor(
  grandTotal: number,
  totalPaid: number,
  dueDate: Date,
  now: Date = new Date(),
): "paid" | "overdue" | "unpaid" {
  if (totalPaid >= grandTotal) return "paid";
  if (now > dueDate) return "overdue";
  return "unpaid";
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- billing`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: pure billing calculation helpers"
```

---

### Task 2: Generate a bill for a unit + period

**Files:**
- Create: `lib/bill-schema.ts`, `app/(app)/hoa-don/page.tsx`, `app/(app)/hoa-don/new/page.tsx`, `app/(app)/hoa-don/bill-actions.ts`, `app/(app)/hoa-don/generate-form.tsx`
- Test: `lib/bill-schema.test.ts`

**Interfaces:**
- Consumes: `db`, `getActiveLease` (`@/lib/rooms`), `buildDefaultLineItems`/`computeSubtotal`/`computeGrandTotal` (`@/lib/billing`), `formatVND`.
- Produces:
  - `billGenerateSchema` (zod): `unitId`, `periodLabel`, `dueDate` required; `electricityAmount`, `waterAmount` int >= 0.
  - Server action `generateBill(formData)` → snapshots the active lease's services into `lineItems`, computes `subtotal`/`grandTotal`, creates the `Bill`, returns `{ billId }`, redirects to the bill detail page (Task 3).
  - Task 3 reads the `Bill` rows produced here.

- [ ] **Step 1: Write the failing schema test**

Create `lib/bill-schema.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { billGenerateSchema } from "@/lib/bill-schema";

describe("billGenerateSchema", () => {
  it("accepts a valid generation request", () => {
    const r = billGenerateSchema.safeParse({
      unitId: "u1", periodLabel: "Tháng 6/2026", dueDate: "2026-06-05",
      electricityAmount: 559000, waterAmount: 250000,
    });
    expect(r.success).toBe(true);
  });
  it("rejects an empty period label", () => {
    expect(billGenerateSchema.safeParse({
      unitId: "u1", periodLabel: "", dueDate: "2026-06-05",
      electricityAmount: 0, waterAmount: 0,
    }).success).toBe(false);
  });
  it("rejects a negative electricity amount", () => {
    expect(billGenerateSchema.safeParse({
      unitId: "u1", periodLabel: "X", dueDate: "2026-06-05",
      electricityAmount: -1, waterAmount: 0,
    }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- bill-schema`
Expected: FAIL — cannot resolve `@/lib/bill-schema`.

- [ ] **Step 3: Implement the schema**

Create `lib/bill-schema.ts`:
```typescript
import { z } from "zod";

export const billGenerateSchema = z.object({
  unitId: z.string().min(1),
  periodLabel: z.string().min(1),
  dueDate: z.string().min(1),
  electricityAmount: z.number().int().min(0),
  waterAmount: z.number().int().min(0),
});

export type BillGenerateInput = z.infer<typeof billGenerateSchema>;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- bill-schema`
Expected: PASS (3 tests).

- [ ] **Step 5: Write the generate action**

Create `app/(app)/hoa-don/bill-actions.ts`:
```typescript
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getActiveLease } from "@/lib/rooms";
import { buildDefaultLineItems, computeSubtotal, computeGrandTotal } from "@/lib/billing";
import { billGenerateSchema } from "@/lib/bill-schema";

export async function generateBill(formData: FormData) {
  const parsed = billGenerateSchema.safeParse({
    unitId: formData.get("unitId"),
    periodLabel: formData.get("periodLabel"),
    dueDate: formData.get("dueDate"),
    electricityAmount: Number(formData.get("electricityAmount") ?? 0),
    waterAmount: Number(formData.get("waterAmount") ?? 0),
  });
  if (!parsed.success) return { error: "Dữ liệu không hợp lệ" };
  const d = parsed.data;

  const unit = await db.unit.findUnique({
    where: { id: d.unitId },
    include: { serviceItems: true, leases: true },
  });
  if (!unit) return { error: "Không tìm thấy phòng" };

  const lease = getActiveLease(unit.leases);
  if (!lease) return { error: "Phòng chưa có hợp đồng đang hiệu lực" };

  const lineItems = buildDefaultLineItems(unit.serviceItems, lease.agreedRent);
  const subtotal = computeSubtotal(lineItems);
  const grandTotal = computeGrandTotal(subtotal, d.electricityAmount, d.waterAmount);

  const bill = await db.bill.create({
    data: {
      leaseId: lease.id,
      periodLabel: d.periodLabel,
      dueDate: new Date(d.dueDate),
      lineItems,
      electricityAmount: d.electricityAmount,
      waterAmount: d.waterAmount,
      subtotal,
      grandTotal,
      status: "unpaid",
    },
  });

  revalidatePath("/hoa-don");
  redirect(`/hoa-don/${bill.id}`);
}
```

- [ ] **Step 6: Build the generate form**

Create `app/(app)/hoa-don/generate-form.tsx`:
```tsx
"use client";

import { useState } from "react";
import { generateBill } from "./bill-actions";

type Unit = { id: string; name: string };

export function GenerateForm({ units }: { units: Unit[] }) {
  const [error, setError] = useState("");

  async function onSubmit(formData: FormData) {
    setError("");
    const res = await generateBill(formData);
    if (res?.error) setError(res.error);
  }

  return (
    <form action={onSubmit} className="max-w-md space-y-3">
      <select name="unitId" required className="w-full rounded border px-3 py-2">
        <option value="">— Chọn phòng —</option>
        {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
      </select>
      <input name="periodLabel" placeholder="Kì thanh toán (vd: Tháng 6/2026)" required className="w-full rounded border px-3 py-2" />
      <label className="block text-sm">Hạn thanh toán
        <input name="dueDate" type="date" required className="w-full rounded border px-3 py-2" />
      </label>
      <input name="electricityAmount" type="number" min="0" placeholder="Tiền điện" defaultValue={0} className="w-full rounded border px-3 py-2" />
      <input name="waterAmount" type="number" min="0" placeholder="Tiền nước" defaultValue={0} className="w-full rounded border px-3 py-2" />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="rounded bg-blue-600 px-4 py-2 text-white">Tạo hóa đơn</button>
    </form>
  );
}
```

- [ ] **Step 7: Build the bills list + new pages**

Create `app/(app)/hoa-don/page.tsx`:
```tsx
import Link from "next/link";
import { db } from "@/lib/db";
import { formatVND } from "@/lib/format";

const STATUS_LABEL: Record<string, string> = { unpaid: "Chưa thu", paid: "Đã thu", overdue: "Quá hạn" };

export default async function BillsPage() {
  const bills = await db.bill.findMany({
    orderBy: { createdAt: "desc" },
    include: { lease: { include: { unit: true, tenant: true } } },
  });
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Hóa đơn</h1>
        <Link href="/hoa-don/new" className="rounded bg-blue-600 px-3 py-2 text-white">+ Tạo hóa đơn</Link>
      </div>
      <ul className="rounded border bg-white">
        {bills.map((b) => (
          <li key={b.id} className="border-b last:border-0">
            <Link href={`/hoa-don/${b.id}`} className="flex justify-between px-3 py-2 hover:bg-gray-50">
              <span>{b.lease.unit.name} · {b.periodLabel} · {b.lease.tenant.fullName}</span>
              <span className="flex gap-3">
                <span>{formatVND(b.grandTotal)}</span>
                <span className={b.status === "overdue" ? "text-red-600" : b.status === "paid" ? "text-green-600" : "text-gray-500"}>
                  {STATUS_LABEL[b.status]}
                </span>
              </span>
            </Link>
          </li>
        ))}
        {bills.length === 0 && <li className="px-3 py-2 text-sm text-gray-400">Chưa có hóa đơn.</li>}
      </ul>
    </div>
  );
}
```

Create `app/(app)/hoa-don/new/page.tsx`:
```tsx
import { db } from "@/lib/db";
import { GenerateForm } from "../generate-form";

export default async function NewBillPage() {
  const units = await db.unit.findMany({
    where: { status: "occupied" },
    orderBy: [{ floor: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Tạo hóa đơn</h1>
      <GenerateForm units={units} />
    </div>
  );
}
```

- [ ] **Step 8: Manually verify**

Run `npm run dev`. Ensure a room has services + an active lease (from Plan 2). Go to `/hoa-don/new`, pick the room, enter period "Tháng 6/2026", a due date, electricity 559000, water 250000 → submit. You're redirected to a (currently bare) bill detail URL; the bill shows in `/hoa-don` with the correct grand total. Stop the server.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: generate bills with snapshotted line items"
```

---

### Task 3: Bill detail + record payments

**Files:**
- Create: `app/(app)/hoa-don/[id]/page.tsx`, `app/(app)/hoa-don/[id]/payment-actions.ts`, `app/(app)/hoa-don/[id]/payment-panel.tsx`
- Test: `app/(app)/hoa-don/[id]/payment-actions.test.ts`

**Interfaces:**
- Consumes: `db`, `billStatusFor` (`@/lib/billing`), `formatVND`, `/api/upload` route.
- Produces:
  - Server action `recordPayment(billId, formData)` → creates a `Payment`, recomputes the bill `status` from the sum of payments via `billStatusFor`, revalidates.
  - `totalPaid(payments: { amount: number }[]): number` helper exported from the actions file for testing.
  - Plan 4's ledger reads the `Payment` rows produced here.

- [ ] **Step 1: Write the failing test for the rollup helper**

Create `app/(app)/hoa-don/[id]/payment-actions.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { totalPaid } from "./payment-actions";

describe("totalPaid", () => {
  it("sums payment amounts", () => {
    expect(totalPaid([{ amount: 2000000 }, { amount: 3000000 }])).toBe(5000000);
  });
  it("is zero for no payments", () => {
    expect(totalPaid([])).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- payment-actions`
Expected: FAIL — cannot resolve `./payment-actions`.

- [ ] **Step 3: Implement the payment actions**

Create `app/(app)/hoa-don/[id]/payment-actions.ts`:
```typescript
"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { billStatusFor } from "@/lib/billing";
import { z } from "zod";

export function totalPaid(payments: { amount: number }[]): number {
  return payments.reduce((sum, p) => sum + p.amount, 0);
}

const paymentSchema = z.object({
  amount: z.number().int().positive(),
  paidAt: z.string().min(1),
  method: z.enum(["cash", "bank_transfer"]),
  confirmedBy: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().optional(),
  ),
  notes: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().optional(),
  ),
  receiptImageUrl: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().optional(),
  ),
});

export async function recordPayment(billId: string, formData: FormData) {
  const parsed = paymentSchema.safeParse({
    amount: Number(formData.get("amount") ?? 0),
    paidAt: formData.get("paidAt"),
    method: formData.get("method"),
    confirmedBy: formData.get("confirmedBy"),
    notes: formData.get("notes"),
    receiptImageUrl: formData.get("receiptImageUrl"),
  });
  if (!parsed.success) return { error: "Dữ liệu không hợp lệ" };
  const d = parsed.data;

  await db.payment.create({
    data: {
      billId,
      amount: d.amount,
      paidAt: new Date(d.paidAt),
      method: d.method,
      confirmedBy: d.confirmedBy ?? null,
      notes: d.notes ?? null,
      receiptImageUrl: d.receiptImageUrl ?? null,
    },
  });

  const bill = await db.bill.findUnique({ where: { id: billId }, include: { payments: true } });
  if (bill) {
    const status = billStatusFor(bill.grandTotal, totalPaid(bill.payments), bill.dueDate);
    await db.bill.update({ where: { id: billId }, data: { status } });
  }

  revalidatePath(`/hoa-don/${billId}`);
  revalidatePath("/hoa-don");
  return { ok: true };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- payment-actions`
Expected: PASS (2 tests).

- [ ] **Step 5: Build the payment panel**

Create `app/(app)/hoa-don/[id]/payment-panel.tsx`:
```tsx
"use client";

import { useState } from "react";
import { recordPayment } from "./payment-actions";

async function uploadImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  if (!res.ok) throw new Error("upload failed");
  return (await res.json()).url as string;
}

export function PaymentPanel({ billId }: { billId: string }) {
  const [receipt, setReceipt] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(formData: FormData) {
    setError("");
    formData.set("receiptImageUrl", receipt);
    const res = await recordPayment(billId, formData);
    if (res?.error) setError(res.error);
    else setReceipt("");
  }

  return (
    <form action={onSubmit} className="max-w-md space-y-2 rounded border bg-white p-3">
      <h3 className="font-semibold">Ghi nhận thanh toán</h3>
      <input name="amount" type="number" min="1" placeholder="Số tiền" required className="w-full rounded border px-2 py-1" />
      <label className="block text-sm">Ngày thanh toán
        <input name="paidAt" type="date" required className="w-full rounded border px-2 py-1" />
      </label>
      <select name="method" required className="w-full rounded border px-2 py-1">
        <option value="bank_transfer">Chuyển khoản</option>
        <option value="cash">Tiền mặt</option>
      </select>
      <input name="confirmedBy" placeholder="Người xác nhận" className="w-full rounded border px-2 py-1" />
      <input name="notes" placeholder="Ghi chú" className="w-full rounded border px-2 py-1" />
      <label className="block text-sm">Ảnh chuyển khoản (từ Zalo)
        <input type="file" accept="image/*" className="mt-1 block"
          onChange={async (e) => e.target.files?.[0] && setReceipt(await uploadImage(e.target.files[0]))} />
      </label>
      {receipt && <img src={receipt} alt="biên lai" className="h-24 rounded border object-cover" />}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="rounded bg-green-600 px-4 py-2 text-white">Lưu thanh toán</button>
    </form>
  );
}
```

- [ ] **Step 6: Build the bill detail page**

Create `app/(app)/hoa-don/[id]/page.tsx`:
```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatVND } from "@/lib/format";
import type { LineItem } from "@/lib/billing";
import { PaymentPanel } from "./payment-panel";

const STATUS_LABEL: Record<string, string> = { unpaid: "Chưa thu", paid: "Đã thu", overdue: "Quá hạn" };

export default async function BillDetailPage({ params }: { params: { id: string } }) {
  const bill = await db.bill.findUnique({
    where: { id: params.id },
    include: { lease: { include: { unit: true, tenant: true } }, payments: { orderBy: { paidAt: "asc" } } },
  });
  if (!bill) notFound();

  const items = bill.lineItems as unknown as LineItem[];
  const paid = bill.payments.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{bill.lease.unit.name} — {bill.periodLabel}</h1>
        <a href={`/hoa-don/${bill.id}/pdf`} target="_blank"
          className="rounded bg-gray-800 px-3 py-2 text-white">Xuất PDF</a>
      </div>
      <p className="text-sm text-gray-500">
        Khách: {bill.lease.tenant.fullName} · {bill.lease.tenant.phone} ·
        Trạng thái: {STATUS_LABEL[bill.status]}
      </p>

      <table className="w-full border bg-white text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-2 py-1 text-left">Dịch vụ</th>
            <th className="border px-2 py-1">ĐVT</th>
            <th className="border px-2 py-1">SL</th>
            <th className="border px-2 py-1 text-right">Đơn giá</th>
            <th className="border px-2 py-1 text-right">Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={i}>
              <td className="border px-2 py-1">{it.name}</td>
              <td className="border px-2 py-1 text-center">{it.measureUnit}</td>
              <td className="border px-2 py-1 text-center">{it.quantity}</td>
              <td className="border px-2 py-1 text-right">{formatVND(it.unitPrice)}</td>
              <td className="border px-2 py-1 text-right">{formatVND(it.total)}</td>
            </tr>
          ))}
          <tr className="font-semibold">
            <td className="border px-2 py-1" colSpan={4}>Tổng tiền nhà và DV (trừ điện, nước)</td>
            <td className="border px-2 py-1 text-right">{formatVND(bill.subtotal)}</td>
          </tr>
          <tr><td className="border px-2 py-1" colSpan={4}>Tiền điện</td><td className="border px-2 py-1 text-right">{formatVND(bill.electricityAmount)}</td></tr>
          <tr><td className="border px-2 py-1" colSpan={4}>Tiền nước</td><td className="border px-2 py-1 text-right">{formatVND(bill.waterAmount)}</td></tr>
          <tr className="font-bold">
            <td className="border px-2 py-1" colSpan={4}>Tổng cộng</td>
            <td className="border px-2 py-1 text-right">{formatVND(bill.grandTotal)}</td>
          </tr>
        </tbody>
      </table>

      <section>
        <h2 className="mb-2 font-semibold">Đã thanh toán: {formatVND(paid)} / {formatVND(bill.grandTotal)}</h2>
        <ul className="mb-3 rounded border bg-white text-sm">
          {bill.payments.map((p) => (
            <li key={p.id} className="flex justify-between border-b px-3 py-2 last:border-0">
              <span>{p.paidAt.toLocaleDateString("vi-VN")} · {p.method === "cash" ? "Tiền mặt" : "Chuyển khoản"}</span>
              <span className="flex items-center gap-2">
                {formatVND(p.amount)}
                {p.receiptImageUrl && <a href={p.receiptImageUrl} target="_blank" className="text-blue-600 underline">biên lai</a>}
              </span>
            </li>
          ))}
          {bill.payments.length === 0 && <li className="px-3 py-2 text-gray-400">Chưa có thanh toán.</li>}
        </ul>
        <PaymentPanel billId={bill.id} />
      </section>

      <Link href="/hoa-don" className="text-blue-600 underline">← Về danh sách hóa đơn</Link>
    </div>
  );
}
```

- [ ] **Step 7: Manually verify status transition**

Run `npm run dev`. Open a bill, record a partial payment (less than total) → still "Chưa thu"/"Quá hạn"; record the remainder → becomes "Đã thu". Upload a receipt image and confirm the "biên lai" link opens it. Stop the server.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: bill detail with payment recording and status rollup"
```

---

### Task 4: Invoice PDF matching the template

**Files:**
- Create: `lib/invoice-pdf.tsx`, `app/(app)/hoa-don/[id]/pdf/route.ts`
- Test: `lib/invoice-pdf.test.ts`

**Interfaces:**
- Consumes: `db`, `LineItem` (`@/lib/billing`), `Setting` row, `formatVND`.
- Produces:
  - `buildInvoiceModel(bill, lease, unit, tenant, setting): InvoiceModel` — a pure function assembling everything the PDF needs (header fields, rows, totals, deposit, bank info, notes, qr url). Unit-tested.
  - `InvoiceDocument(model: InvoiceModel): JSX.Element` — the `@react-pdf/renderer` document.
  - `GET /hoa-don/[id]/pdf` → streams `application/pdf`.

- [ ] **Step 1: Install the PDF library**

Run:
```bash
npm install @react-pdf/renderer
```

- [ ] **Step 2: Write the failing model test**

Create `lib/invoice-pdf.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { buildInvoiceModel } from "@/lib/invoice-pdf";

const base = {
  bill: {
    periodLabel: "Tháng 6/2026", subtotal: 5100000, electricityAmount: 559000,
    waterAmount: 250000, grandTotal: 5909000,
    lineItems: [{ name: "Internet", measureUnit: "phòng", quantity: 1, unitPrice: 100000, total: 100000 }],
  },
  lease: { depositAmount: 4800000 },
  unit: { name: "Phòng 301" },
  tenant: { fullName: "Nguyễn Mạnh Cường", phone: "0969920947", vehiclePlate: "29A-12345" },
  setting: { bankAccountName: "HO KINH DOANH NGUYEN SY DUC", bankAccountNo: "88859988888", bankName: "TP Bank", qrImageUrl: "/api/files/qr.png", invoiceNotes: "Thu trước 5 ngày." },
};

describe("buildInvoiceModel", () => {
  it("maps header fields from the entities", () => {
    const m = buildInvoiceModel(base.bill as any, base.lease as any, base.unit as any, base.tenant as any, base.setting as any);
    expect(m.unitName).toBe("Phòng 301");
    expect(m.tenantName).toBe("Nguyễn Mạnh Cường");
    expect(m.phone).toBe("0969920947");
    expect(m.depositAmount).toBe(4800000);
    expect(m.rows).toHaveLength(1);
    expect(m.bankAccountNo).toBe("88859988888");
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test -- invoice-pdf`
Expected: FAIL — cannot resolve `@/lib/invoice-pdf`.

- [ ] **Step 4: Implement the model + document**

Create `lib/invoice-pdf.tsx`:
```tsx
import React from "react";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import type { LineItem } from "@/lib/billing";
import { formatVND } from "@/lib/format";

export type InvoiceModel = {
  unitName: string;
  periodLabel: string;
  tenantName: string;
  phone: string;
  vehiclePlate: string;
  rows: LineItem[];
  subtotal: number;
  electricityAmount: number;
  waterAmount: number;
  grandTotal: number;
  depositAmount: number;
  notes: string;
  bankAccountName: string;
  bankAccountNo: string;
  bankName: string;
  qrImageUrl: string | null;
};

export function buildInvoiceModel(
  bill: { periodLabel: string; subtotal: number; electricityAmount: number; waterAmount: number; grandTotal: number; lineItems: unknown },
  lease: { depositAmount: number },
  unit: { name: string },
  tenant: { fullName: string; phone: string; vehiclePlate: string | null },
  setting: { bankAccountName: string | null; bankAccountNo: string | null; bankName: string | null; qrImageUrl: string | null; invoiceNotes: string | null } | null,
): InvoiceModel {
  return {
    unitName: unit.name,
    periodLabel: bill.periodLabel,
    tenantName: tenant.fullName,
    phone: tenant.phone,
    vehiclePlate: tenant.vehiclePlate ?? "",
    rows: bill.lineItems as LineItem[],
    subtotal: bill.subtotal,
    electricityAmount: bill.electricityAmount,
    waterAmount: bill.waterAmount,
    grandTotal: bill.grandTotal,
    depositAmount: lease.depositAmount,
    notes: setting?.invoiceNotes ?? "",
    bankAccountName: setting?.bankAccountName ?? "",
    bankAccountNo: setting?.bankAccountNo ?? "",
    bankName: setting?.bankName ?? "",
    qrImageUrl: setting?.qrImageUrl ?? null,
  };
}

const s = StyleSheet.create({
  page: { padding: 28, fontSize: 10, fontFamily: "Helvetica" },
  title: { textAlign: "center", fontSize: 14, fontWeight: "bold", marginBottom: 10 },
  headerLine: { marginBottom: 3 },
  table: { marginTop: 8, borderWidth: 1, borderColor: "#000" },
  row: { flexDirection: "row" },
  cell: { borderRightWidth: 1, borderBottomWidth: 1, borderColor: "#000", padding: 4 },
  cTT: { width: "8%", textAlign: "center" },
  cName: { width: "34%" },
  cUnit: { width: "14%", textAlign: "center" },
  cQty: { width: "10%", textAlign: "center" },
  cPrice: { width: "16%", textAlign: "right" },
  cTotal: { width: "18%", textAlign: "right", borderRightWidth: 0 },
  notes: { marginTop: 10 },
  bank: { marginTop: 10, color: "#b00" },
  qr: { width: 120, height: 120, marginTop: 8 },
};

export function InvoiceDocument({ model }: { model: InvoiceModel }) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.title}>{model.unitName.toUpperCase()}</Text>
        <Text style={s.headerLine}>Kì thanh toán: {model.periodLabel}</Text>
        <Text style={s.headerLine}>Người thuê: {model.tenantName} (ĐT: {model.phone})    Biển số XM: {model.vehiclePlate}</Text>

        <View style={s.table}>
          <View style={s.row}>
            <Text style={[s.cell, s.cTT]}>TT</Text>
            <Text style={[s.cell, s.cName]}>Các dịch vụ</Text>
            <Text style={[s.cell, s.cUnit]}>Đơn vị tính</Text>
            <Text style={[s.cell, s.cQty]}>Số lượng</Text>
            <Text style={[s.cell, s.cPrice]}>Đơn giá</Text>
            <Text style={[s.cell, s.cTotal]}>Thành tiền</Text>
          </View>
          {model.rows.map((r, i) => (
            <View style={s.row} key={i}>
              <Text style={[s.cell, s.cTT]}>{i + 1}</Text>
              <Text style={[s.cell, s.cName]}>{r.name}</Text>
              <Text style={[s.cell, s.cUnit]}>{r.measureUnit}</Text>
              <Text style={[s.cell, s.cQty]}>{r.quantity}</Text>
              <Text style={[s.cell, s.cPrice]}>{formatVND(r.unitPrice)}</Text>
              <Text style={[s.cell, s.cTotal]}>{formatVND(r.total)}</Text>
            </View>
          ))}
          <View style={s.row}>
            <Text style={[s.cell, { width: "66%" }]}>Tổng tiền nhà và DV (trừ điện, nước)</Text>
            <Text style={[s.cell, s.cPrice]}>{formatVND(model.subtotal)}</Text>
            <Text style={[s.cell, s.cTotal]}>Cọc {formatVND(model.depositAmount)}</Text>
          </View>
        </View>

        <View style={s.notes}>
          <Text>Ghi chú:</Text>
          <Text>{model.notes}</Text>
        </View>

        <View style={s.bank}>
          <Text>Khách hàng vui lòng thanh toán theo thông tin TK sau:</Text>
          <Text>Số tài khoản: {model.bankAccountNo} – {model.bankAccountName}</Text>
          <Text>{model.bankName}</Text>
        </View>

        {model.qrImageUrl ? <Image style={s.qr} src={model.qrImageUrl} /> : null}
      </Page>
    </Document>
  );
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- invoice-pdf`
Expected: PASS (1 test).

- [ ] **Step 6: Build the PDF route**

Create `app/(app)/hoa-don/[id]/pdf/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { db } from "@/lib/db";
import { buildInvoiceModel, InvoiceDocument } from "@/lib/invoice-pdf";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const bill = await db.bill.findUnique({
    where: { id: params.id },
    include: { lease: { include: { unit: true, tenant: true } } },
  });
  if (!bill) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });

  const setting = await db.setting.findUnique({ where: { id: "singleton" } });
  const model = buildInvoiceModel(bill, bill.lease, bill.lease.unit, bill.lease.tenant, setting);

  // Resolve a relative qr url to an absolute one so @react-pdf can fetch it.
  if (model.qrImageUrl?.startsWith("/")) {
    model.qrImageUrl = new URL(model.qrImageUrl, _req.nextUrl.origin).toString();
  }

  const buffer = await renderToBuffer(React.createElement(InvoiceDocument, { model }));
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="hoa-don-${bill.id}.pdf"`,
    },
  });
}
```

Note: the QR image is fetched by `@react-pdf` over HTTP; since `/api/files` requires auth, for phase 1 store the QR via the public-safe path in Plan 7's settings (the QR is not sensitive). Plan 7 Task notes this — the settings QR upload writes to a non-auth public location. Until then, leaving `qrImageUrl` null renders the invoice without the QR, which is acceptable for testing this task.

- [ ] **Step 7: Manually verify the PDF**

Run `npm run dev`. Open a bill → "Xuất PDF". A PDF opens in a new tab with the room title, header line, the service table, subtotal + deposit row, notes, and bank info — matching the template layout. Stop the server.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: invoice PDF export matching the family template"
```

---

## Self-Review

**Spec coverage (Plan 3 portion):** List bills with status — Task 2/3 ✓. Generate bill auto-filling services + manual electricity/water — Task 2 ✓. Mark paid with method/date/amount/screenshot — Task 3 ✓. Subtotal excludes electricity/water — Task 1 (`computeSubtotal` over line items only) ✓. Overdue detection — Task 1 `billStatusFor` ✓ (the scheduled Zalo notification on overdue is Plan 6). Invoice PDF with header, service table, subtotal, notes, bank info, QR — Task 4 ✓.

**Placeholder scan:** No TBDs. The one deferred edge (QR fetch behind auth) is explicitly documented in Task 4 Step 6 with the resolution pointer to Plan 7; the invoice renders correctly without it in the meantime — not a silent gap.

**Type consistency:** `LineItem` defined in Plan 3 Task 1, reused in Tasks 3–4 ✓. `billStatusFor` signature `(grandTotal, totalPaid, dueDate, now?)` consistent between Task 1 definition and Task 3 use ✓. `totalPaid` defined and tested in Task 3 ✓. `getActiveLease` (Plan 2) reused in Task 2 ✓. `Setting` model (Plan 1) consumed in Task 4 ✓.

---

**Carries into Plan 4:** the ledger reads `Payment` rows (Task 3) for income and `Expense` rows (Plan 4) for outflow; reuses `formatVND`.
