# Plan 8 — Draft Invoices (delete) & Meter-Based Electricity/Water Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Two related billing improvements.
1. **Hóa đơn nháp + xóa** — every bill is created as a *draft* (`draft`). A draft is editable scratch work: it does not count toward outstanding/overdue totals, is never notified over Zalo, and can be deleted freely. An explicit **Phát hành** (issue) action turns a draft into a real `unpaid` bill; from then on it follows the existing lifecycle and can no longer be deleted.
2. **Nhập điện/nước theo chỉ số công tơ** — instead of typing a final đồng amount, the operator enters the old + new meter readings and a unit price; the charge is computed as `(new − old) × price`. The old reading auto-fills from the previous bill of the same lease; unit prices default from a global Setting and stay editable per bill.

**Architecture:** All new money/meter math lives in pure, unit-tested functions in `lib/billing.ts`. The bill's `lineItems` JSON stays an immutable snapshot; electricity/water remain separate from `subtotal` and are still stored as computed `electricityAmount`/`waterAmount` integers — so the PDF, ledger (`billUtilities`), and dashboard math are untouched by Feature B. Meter readings are stored as new nullable columns on `Bill` purely as provenance/prefill data. Draft state is a fourth allowed value of the existing `Bill.status` string; no schema type change is required, but two queries that currently treat "not paid" as "owed" must be narrowed to exclude drafts.

**Tech Stack:** Next.js 14 Server Actions, Prisma (SQLite/libSQL), zod, Vitest. No new dependencies.

## Global Constraints

- Carried from Plans 1–7: Next.js 14 App Router, TypeScript, Vietnamese UI, Prisma, money as integer đồng, secrets from env, `ServiceItem` field is `measureUnit`, bill `lineItems` is an immutable JSON snapshot, electricity/water are NOT part of `subtotal` (matches "Tổng tiền nhà và DV (trừ điện, nước)").
- `Bill.status` allowed values become: `"draft" | "unpaid" | "paid" | "overdue"`. Update the comment block at the top of `prisma/schema.prisma` accordingly.
- A draft bill must never appear in: dashboard outstanding/overdue (`lib/dashboard.ts` via `app/(app)/page.tsx`), or the Zalo overdue notifier (`lib/notify-runner.ts`). Drafts carry no payments (the payment panel is hidden until issued), so the ledger and PDF need no draft-specific guards.
- Meter readings are non-negative integers; the **new** reading must be `>= old` reading. Validation lives in both the zod schema and the pure `meterCharge` helper.
- `electricityAmount` / `waterAmount` remain the source of truth consumed downstream; the new reading columns are additive and nullable so existing rows (and any bill created before this plan) keep working.

---

## FEATURE A — Draft invoices & deletion

### Task A1: Allow `draft` status + draft-aware helpers

**Files:**
- Edit: `prisma/schema.prisma` (status comment + `@default("draft")` on `Bill.status`)
- Edit: `lib/billing.ts`
- Test: `lib/billing.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces (pure):
  - `BILL_STATUS_LABEL: Record<string, string>` — `{ draft: "Nháp", unpaid: "Chưa thu", paid: "Đã thu", overdue: "Quá hạn" }`. Replaces the ad-hoc `STATUS_LABEL` maps currently duplicated in the list and detail pages.
  - `displayBillStatus(status: string, grandTotal: number, totalPaid: number, dueDate: Date, now?: Date): "draft" | "unpaid" | "paid" | "overdue"` — returns `"draft"` verbatim when the stored status is `draft`; otherwise delegates to the existing `billStatusFor`. Used by every list/detail view so drafts are never re-derived into overdue.
  - `canDeleteBill(status: string, paymentCount: number): boolean` — `true` only when `status === "draft"` and `paymentCount === 0`.
- Tasks A2–A4 consume all of these.

- [ ] **Step 1: Write the failing tests** — append to `lib/billing.test.ts`:
```typescript
import { BILL_STATUS_LABEL, displayBillStatus, canDeleteBill } from "@/lib/billing";

describe("displayBillStatus", () => {
  const due = new Date("2026-06-05");
  it("keeps a draft as draft even past its due date", () => {
    expect(displayBillStatus("draft", 5000000, 0, due, new Date("2026-07-01"))).toBe("draft");
  });
  it("delegates non-drafts to billStatusFor", () => {
    expect(displayBillStatus("unpaid", 5000000, 0, due, new Date("2026-07-01"))).toBe("overdue");
    expect(displayBillStatus("unpaid", 5000000, 5000000, due, new Date("2026-06-01"))).toBe("paid");
  });
});

describe("canDeleteBill", () => {
  it("allows deleting an unpaid-free draft", () => {
    expect(canDeleteBill("draft", 0)).toBe(true);
  });
  it("refuses a draft that somehow has payments", () => {
    expect(canDeleteBill("draft", 1)).toBe(false);
  });
  it("refuses an issued bill", () => {
    expect(canDeleteBill("unpaid", 0)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails** — `npm test -- billing` → FAIL (missing exports).

- [ ] **Step 3: Implement** in `lib/billing.ts` (keep existing exports):
```typescript
export const BILL_STATUS_LABEL: Record<string, string> = {
  draft: "Nháp",
  unpaid: "Chưa thu",
  paid: "Đã thu",
  overdue: "Quá hạn",
};

export function displayBillStatus(
  status: string,
  grandTotal: number,
  totalPaid: number,
  dueDate: Date,
  now: Date = new Date(),
): "draft" | "unpaid" | "paid" | "overdue" {
  if (status === "draft") return "draft";
  return billStatusFor(grandTotal, totalPaid, dueDate, now);
}

export function canDeleteBill(status: string, paymentCount: number): boolean {
  return status === "draft" && paymentCount === 0;
}
```
Then in `prisma/schema.prisma`: change `status String @default("unpaid")` → `@default("draft")` on `Bill`, and update the comment to `//   Bill.status:          "draft" | "unpaid" | "paid" | "overdue"`.

- [ ] **Step 4: Run the test to verify it passes** — `npm test -- billing` → PASS.

- [ ] **Step 5: Migration** — `npx prisma migrate dev --name bill_draft_status_default`. (Only the default changes; existing rows are unaffected and stay `unpaid`/`paid`.)

- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat: draft bill status helpers and default"`.

---

### Task A2: Create bills as draft; add issue + delete actions

**Files:**
- Edit: `app/(app)/hoa-don/bill-actions.ts`
- Test: `app/(app)/hoa-don/bill-actions.test.ts` (new — covers the pure guard wiring via `canDeleteBill`; the actions themselves are thin DB calls)

**Interfaces:**
- Consumes: `db`, `billStatusFor`, `canDeleteBill`.
- Produces:
  - `generateBill` now writes `status: "draft"` and **redirects to the draft detail page** (unchanged target, new status). (This is also where Feature B plugs in — see Task B2; if both features land together, write the merged version once.)
  - `issueBill(billId: string)` server action → loads the bill; if `status !== "draft"` returns `{ error: "Hóa đơn đã phát hành" }`; otherwise sets status via `billStatusFor(grandTotal, 0, dueDate)` (so an already-overdue due date issues straight to `overdue`), revalidates `/hoa-don` + detail, returns `{ ok: true }`.
  - `deleteBill(billId: string)` server action → loads the bill with `_count.payments`; if `!canDeleteBill(status, count)` returns `{ error: "Chỉ xóa được hóa đơn nháp chưa thanh toán" }`; otherwise `db.bill.delete`, revalidates `/hoa-don`, returns `{ ok: true }`. (No redirect inside the action — the page handles navigation after the toast, or the action runs from the list row.)

- [ ] **Step 1:** Change the `generateBill` create to `status: "draft"` (line ~44).

- [ ] **Step 2:** Add `issueBill`:
```typescript
export async function issueBill(billId: string) {
  const bill = await db.bill.findUnique({ where: { id: billId } });
  if (!bill) return { error: "Không tìm thấy hóa đơn" };
  if (bill.status !== "draft") return { error: "Hóa đơn đã phát hành" };
  const status = billStatusFor(bill.grandTotal, 0, bill.dueDate);
  await db.bill.update({ where: { id: billId }, data: { status } });
  revalidatePath("/hoa-don");
  revalidatePath(`/hoa-don/${billId}`);
  return { ok: true };
}
```

- [ ] **Step 3:** Add `deleteBill`:
```typescript
export async function deleteBill(billId: string) {
  const bill = await db.bill.findUnique({
    where: { id: billId },
    include: { _count: { select: { payments: true } } },
  });
  if (!bill) return { error: "Không tìm thấy hóa đơn" };
  if (!canDeleteBill(bill.status, bill._count.payments)) {
    return { error: "Chỉ xóa được hóa đơn nháp chưa thanh toán" };
  }
  await db.bill.delete({ where: { id: billId } });
  revalidatePath("/hoa-don");
  return { ok: true };
}
```
Add `import { billStatusFor, canDeleteBill } from "@/lib/billing";` (extend the existing import line).

- [ ] **Step 4:** Optional guard test in `app/(app)/hoa-don/bill-actions.test.ts` asserting `canDeleteBill` covers the cases (the DB actions are integration-level; keep unit coverage on the pure helper from A1). Run `npm test -- bill-actions`.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: issue and delete actions for draft bills"`.

---

### Task A3: Surface draft state in list & detail UI

**Files:**
- Edit: `app/(app)/hoa-don/page.tsx` (list — badge + inline delete on drafts)
- Edit: `app/(app)/hoa-don/[id]/page.tsx` (detail — draft badge, **Phát hành** + **Xóa** buttons, hide PaymentPanel while draft)
- Create: `app/(app)/hoa-don/[id]/draft-actions-bar.tsx` (client component wiring `issueBill`/`deleteBill` to toasts + navigation)

**Interfaces:**
- Consumes: `displayBillStatus`, `BILL_STATUS_LABEL` (A1), `issueBill`/`deleteBill` (A2), existing `ActionButton` pattern (`components/action-button.tsx`), `useToast`.
- Produces: UI only.

- [ ] **Step 1:** In `app/(app)/hoa-don/page.tsx`, replace the inline `billStatusFor(...)` call with `displayBillStatus(b.status, b.grandTotal, totalPaid, b.dueDate)`. Add a 4th badge branch: `display === "draft"` → a neutral/grey badge reading `BILL_STATUS_LABEL.draft` ("Nháp"). (Add a `badge-muted`/grey style if none exists; otherwise reuse `badge-warn`.) Optionally add a small `Trash2` `ActionButton` on rows where `b.status === "draft"`, bound to `deleteBill.bind(null, b.id)` with `confirm="Xóa hóa đơn nháp này?"`.

- [ ] **Step 2:** Create `draft-actions-bar.tsx`:
```tsx
"use client";

import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";
import { issueBill, deleteBill } from "../bill-actions";
import { Send, Trash2 } from "lucide-react";

export function DraftActionsBar({ billId }: { billId: string }) {
  const toast = useToast();
  const router = useRouter();

  async function onIssue() {
    const res = await issueBill(billId);
    if (res?.error) toast.error(res.error);
    else { toast.success("Đã phát hành hóa đơn"); router.refresh(); }
  }
  async function onDelete() {
    if (!window.confirm("Xóa hóa đơn nháp này?")) return;
    const res = await deleteBill(billId);
    if (res?.error) toast.error(res.error);
    else { toast.success("Đã xóa hóa đơn nháp"); router.push("/hoa-don"); }
  }

  return (
    <div className="flex gap-2">
      <button onClick={onIssue} className="btn-primary flex items-center gap-1"><Send size={16}/> Phát hành</button>
      <button onClick={onDelete} className="btn-link-danger flex items-center gap-1"><Trash2 size={16}/> Xóa nháp</button>
    </div>
  );
}
```

- [ ] **Step 3:** In `app/(app)/hoa-don/[id]/page.tsx`:
  - Replace the local `STATUS_LABEL` with the imported `BILL_STATUS_LABEL`; compute `const display = displayBillStatus(bill.status, bill.grandTotal, paid, bill.dueDate);`.
  - Add the `draft` badge branch (grey).
  - When `bill.status === "draft"`: render `<DraftActionsBar billId={bill.id} />` near the header and **do not** render `<PaymentPanel />` (a draft cannot take payments). When not draft: keep the existing PaymentPanel + payments list. (PDF export link can stay available for both, or be hidden for drafts — keep it available; harmless for previewing.)

- [ ] **Step 4: Manually verify** — `npm run dev`. Generate a bill → it shows "Nháp" in the list and detail; PaymentPanel is absent. Click **Phát hành** → badge flips to "Chưa thu"/"Quá hạn" and PaymentPanel appears; the **Phát hành/Xóa** bar disappears. On a fresh draft click **Xóa nháp** → redirected to the list, row gone. Confirm deleting via the list row also works and that an issued bill offers no delete control.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: draft badge, issue and delete controls in bill UI"`.

---

### Task A4: Exclude drafts from dashboard & Zalo notifier

**Files:**
- Edit: `app/(app)/page.tsx` (dashboard data query feeding `computeDashboardStats`)
- Edit: `lib/notify-runner.ts` (overdue bill query)
- Test: `lib/notify-runner.test.ts` (add a draft-excluded case if the suite stubs bill rows)

**Interfaces:**
- Consumes: nothing new — these are query-scope narrowings.
- Produces: drafts no longer inflate outstanding/overdue counts or trigger reminders.

- [ ] **Step 1:** In `app/(app)/page.tsx`, change the bills query `where` from `{ status: { not: "paid" } }` to `{ status: { notIn: ["paid", "draft"] } }`. `computeDashboardStats`/`lib/dashboard.ts` itself needs no change — it only sees non-draft, non-paid rows.

- [ ] **Step 2:** In `lib/notify-runner.ts` (line ~21), change `where: { status: { not: "paid" } }` to `where: { status: { notIn: ["paid", "draft"] } }`.

- [ ] **Step 3:** If `lib/notify-runner.test.ts` feeds bill fixtures, add a `status: "draft"` row and assert it is not notified. Run `npm test -- notify-runner dashboard`.

- [ ] **Step 4: Manually verify** — create a draft with a past due date; dashboard "Quá hạn"/"Còn nợ" must not move and no reminder fires for it. Issue it → it now counts.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "fix: keep draft bills out of dashboard totals and reminders"`.

---

## FEATURE B — Electricity/water by meter readings

### Task B1: Pure meter-charge helper + global unit-price settings

**Files:**
- Edit: `lib/billing.ts`
- Edit: `prisma/schema.prisma` (`Setting` gets `electricityUnitPrice`/`waterUnitPrice`; `Bill` gets reading columns)
- Edit: `lib/setting-schema.ts` + `lib/setting-schema.test.ts` (accept the two new prices)
- Edit: `app/(app)/cai-dat/setting-form.tsx` + `app/(app)/cai-dat/setting-actions.ts` (edit the defaults)
- Test: `lib/billing.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces (pure):
  - `type MeterCharge = { consumption: number; amount: number }`
  - `meterCharge(prevReading: number, currReading: number, unitPrice: number): MeterCharge` — throws/returns guard when `currReading < prevReading`; otherwise `consumption = currReading - prevReading`, `amount = consumption * unitPrice`. Decide convention: **return** is cleaner for the action — `meterCharge` returns the object and the *zod schema* enforces `curr >= prev`, so the helper can assume valid input and stay total. Keep it total: `{ consumption: Math.max(0, curr - prev), amount: Math.max(0, curr - prev) * unitPrice }`.
- Schema additions:
  - `Setting`: `electricityUnitPrice Int @default(0)`, `waterUnitPrice Int @default(0)`.
  - `Bill` (all nullable, additive): `electricityPrevReading Int?`, `electricityCurrReading Int?`, `electricityUnitPrice Int?`, `waterPrevReading Int?`, `waterCurrReading Int?`, `waterUnitPrice Int?`.

- [ ] **Step 1: Write the failing test** — append to `lib/billing.test.ts`:
```typescript
import { meterCharge } from "@/lib/billing";

describe("meterCharge", () => {
  it("computes consumption × unit price", () => {
    expect(meterCharge(1200, 1350, 3500)).toEqual({ consumption: 150, amount: 525000 });
  });
  it("is zero when the reading did not advance", () => {
    expect(meterCharge(1350, 1350, 3500)).toEqual({ consumption: 0, amount: 0 });
  });
  it("never goes negative on a bad (decreasing) reading", () => {
    expect(meterCharge(1350, 1200, 3500)).toEqual({ consumption: 0, amount: 0 });
  });
});
```

- [ ] **Step 2: Run** — `npm test -- billing` → FAIL.

- [ ] **Step 3: Implement** in `lib/billing.ts`:
```typescript
export type MeterCharge = { consumption: number; amount: number };

export function meterCharge(prevReading: number, currReading: number, unitPrice: number): MeterCharge {
  const consumption = Math.max(0, currReading - prevReading);
  return { consumption, amount: consumption * unitPrice };
}
```

- [ ] **Step 4: Run** — `npm test -- billing` → PASS.

- [ ] **Step 5: Schema + migration** — add the `Setting` and `Bill` columns above; `npx prisma migrate dev --name meter_readings`. Existing bills get NULL readings (rendered as "—"); existing settings get price `0`.

- [ ] **Step 6: Settings UI** — extend `lib/setting-schema.ts` (two `z.coerce.number().int().min(0)` fields), its test, `setting-actions.ts` (persist them), and `setting-form.tsx` (two number inputs: "Đơn giá điện (đ/kWh)", "Đơn giá nước (đ/m³)"). Run `npm test -- setting-schema`.

- [ ] **Step 7: Commit** — `git add -A && git commit -m "feat: meterCharge helper and global electricity/water unit prices"`.

---

### Task B2: Generate form & action capture readings, compute amounts

**Files:**
- Edit: `lib/bill-schema.ts` + `lib/bill-schema.test.ts`
- Edit: `app/(app)/hoa-don/bill-actions.ts` (`generateBill`)
- Edit: `app/(app)/hoa-don/new/page.tsx` (load Setting defaults + last readings per occupied unit)
- Edit: `app/(app)/hoa-don/generate-form.tsx` (meter inputs + live amount preview)

**Interfaces:**
- Consumes: `db`, `getActiveLease`, `buildDefaultLineItems`/`computeSubtotal`/`computeGrandTotal`, `meterCharge`, the `Setting` prices.
- Produces: a `Bill` whose `electricityAmount`/`waterAmount` are computed from readings, with the raw readings + per-bill unit prices stored alongside.

- [ ] **Step 1:** Rewrite `billGenerateSchema` (and update `lib/bill-schema.test.ts`) to replace the two flat amount fields with meter fields:
```typescript
export const billGenerateSchema = z.object({
  unitId: z.string().min(1),
  periodLabel: z.string().min(1),
  dueDate: z.string().min(1),
  electricityPrevReading: z.number().int().min(0),
  electricityCurrReading: z.number().int().min(0),
  electricityUnitPrice: z.number().int().min(0),
  waterPrevReading: z.number().int().min(0),
  waterCurrReading: z.number().int().min(0),
  waterUnitPrice: z.number().int().min(0),
}).refine((d) => d.electricityCurrReading >= d.electricityPrevReading, {
  message: "Chỉ số điện mới phải ≥ chỉ số cũ", path: ["electricityCurrReading"],
}).refine((d) => d.waterCurrReading >= d.waterPrevReading, {
  message: "Chỉ số nước mới phải ≥ chỉ số cũ", path: ["waterCurrReading"],
});
```
Update the existing schema tests (they currently pass `electricityAmount`/`waterAmount`) to the new shape, plus a "rejects decreasing reading" case. Run `npm test -- bill-schema`.

- [ ] **Step 2:** In `generateBill`, parse the new fields, compute:
```typescript
const e = meterCharge(d.electricityPrevReading, d.electricityCurrReading, d.electricityUnitPrice);
const w = meterCharge(d.waterPrevReading, d.waterCurrReading, d.waterUnitPrice);
const grandTotal = computeGrandTotal(subtotal, e.amount, w.amount);
```
and store on create: `electricityAmount: e.amount, waterAmount: w.amount,` plus the six reading/price columns from `d`, with `status: "draft"` (Feature A). Keep `redirect` to the detail page.

- [ ] **Step 3:** In `new/page.tsx`, also load `db.setting.findUnique({ where: { id: "singleton" } })` for default prices, and the **most recent bill per occupied unit** to prefill the old readings:
```typescript
// last reading per unit: latest bill's curr readings, keyed by unitId
const lastBills = await db.bill.findMany({
  where: { lease: { unit: { status: "occupied" } } },
  orderBy: { createdAt: "desc" },
  select: { electricityCurrReading: true, waterCurrReading: true, lease: { select: { unitId: true } } },
});
const lastReadingByUnit: Record<string, { e: number; w: number }> = {};
for (const b of lastBills) {
  const uid = b.lease.unitId;
  if (!(uid in lastReadingByUnit)) {
    lastReadingByUnit[uid] = { e: b.electricityCurrReading ?? 0, w: b.waterCurrReading ?? 0 };
  }
}
```
Pass `defaultElectricityPrice`, `defaultWaterPrice`, and `lastReadingByUnit` into `<GenerateForm/>`.

- [ ] **Step 4:** In `generate-form.tsx` (client), on unit change prefill `electricityPrevReading`/`waterPrevReading` from `lastReadingByUnit[unitId]` (default 0) and the unit-price inputs from the Setting defaults. Replace the two `…Amount` inputs with grouped rows:
  - Điện: Chỉ số cũ (prefilled, editable) · Chỉ số mới · Đơn giá · **→ Thành tiền (live)**
  - Nước: same.
  Compute the live preview with `meterCharge` (import the pure helper into the client component — it has no server deps). Show consumption and amount so the operator can sanity-check before submitting.

- [ ] **Step 5: Manually verify** — `npm run dev`. Set unit prices in Cài đặt. Create a bill for a room with a prior bill: old readings prefill from that bill's new readings; enter new readings; the live amounts and grand total update; submit → the draft's `electricityAmount`/`waterAmount` match `(new−old)×price`. Create a bill for a room with no history → old readings default to 0. Verify the decreasing-reading guard surfaces the zod error message.

- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat: capture electricity/water meter readings when generating bills"`.

---

### Task B3: Show readings in bill detail + PDF

**Files:**
- Edit: `app/(app)/hoa-don/[id]/page.tsx` (detail table)
- Edit: `lib/invoice-pdf.tsx` + `lib/invoice-pdf.test.ts` (model + document rows)

**Interfaces:**
- Consumes: the new `Bill` reading columns.
- Produces: human-readable "chỉ số cũ → mới (tiêu thụ) × đơn giá = thành tiền" lines; falls back to just the amount when readings are NULL (legacy bills).

- [ ] **Step 1:** In the detail page, expand the "Tiền điện"/"Tiền nước" rows: when readings are present show e.g. `Tiền điện (1200 → 1350, 150 kWh × 3.500đ)` with the amount on the right; when NULL keep the bare amount. Reuse `formatVND` for the price; readings render as plain numbers.

- [ ] **Step 2:** In `lib/invoice-pdf.tsx`, extend `buildInvoiceModel`'s input + `InvoiceModel` with optional reading/price fields, and render the same provenance in the electricity/water rows of the PDF (kept conditional so legacy bills still render). Update `lib/invoice-pdf.test.ts` to assert the model carries the readings through. Run `npm test -- invoice-pdf`.

- [ ] **Step 3: Manually verify** — open an issued meter-based bill → detail and "Xuất PDF" both show the readings/consumption breakdown; open a legacy bill (or one created with 0/0) → renders the plain amount without a broken breakdown.

- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat: show meter readings on bill detail and invoice PDF"`.

---

## Self-Review

**Feature A coverage:** draft is the creation default (A1 schema + A2 action) ✓; issue action draft→unpaid/overdue (A2) ✓; delete restricted to payment-free drafts via `canDeleteBill` (A1/A2) ✓; draft badge + Phát hành/Xóa controls + hidden PaymentPanel (A3) ✓; drafts excluded from dashboard outstanding/overdue and Zalo reminders (A4 — the two `status: { not: "paid" }` queries are the only owed-money readers, both narrowed) ✓.

**Feature B coverage:** `(new − old) × price` via pure tested `meterCharge` (B1) ✓; global default prices in Settings, editable per bill (B1/B2) ✓; old reading auto-prefills from the previous bill of the same unit (B2 Step 3) ✓; computed amounts stored in the unchanged `electricityAmount`/`waterAmount` so PDF/ledger/dashboard math is untouched (B2 Step 2) ✓; readings shown on detail + PDF with legacy NULL fallback (B3) ✓.

**Backward compatibility:** new `Bill` columns are nullable and additive; `Setting` prices default to 0; existing bills keep `unpaid`/`paid` status and render with the plain-amount fallback. No existing downstream consumer of `electricityAmount`/`waterAmount` (`lib/ledger-source.ts` `billUtilities`, `lib/invoice-pdf.tsx`, dashboard) changes behavior.

**Test surface touched:** `lib/billing.test.ts` (+display/canDelete/meterCharge), `lib/bill-schema.test.ts` (reshaped to meter fields), `lib/setting-schema.test.ts` (+2 prices), `lib/invoice-pdf.test.ts` (+readings), `lib/notify-runner.test.ts` (draft excluded). No placeholder/TBD left.

**Ordering note:** Features A and B both edit `generateBill` and the bill detail page. If implemented in one branch, do **A1→A2→A4** then **B1→B2→B3**, and when B2 rewrites `generateBill` keep the `status: "draft"` line from A2 (write the merged create once). A3's detail-page edits and B3's detail-page edits are in different table regions and do not conflict.
