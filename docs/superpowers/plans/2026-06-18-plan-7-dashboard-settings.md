# Plan 7 — Dashboard, Settings & Convergence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tie the system together — a Settings page (bank info, QR image, invoice notes, admin Zalo id) that feeds the invoice PDF and notifications, and a Dashboard summarizing occupancy, outstanding rent, overdue bills, and upcoming maintenance — then prove the whole flow with an end-to-end test.

**Architecture:** The dashboard's numbers come from a pure `computeDashboardStats` function over already-loaded rows, so the page stays a thin view. Settings persist to the single `Setting` row. The QR image, needed by the server-rendered invoice PDF, is read directly from disk into a data URL at render time (resolving the deferral noted in Plan 3) — no auth round-trip. A Playwright E2E test walks tenant → lease → bill → payment → ledger.

**Tech Stack:** Next.js 14 Server Components + Server Actions, Prisma, Vitest, Playwright.

## Global Constraints

- Carried from Plans 1–6: Next.js 14 App Router, TypeScript, Vietnamese UI, Prisma, money as integer đồng, secrets from env.
- The `Setting` row is a singleton with id `"singleton"` (seeded in Plan 1).
- The invoice PDF reads the QR file from disk (data URL); it never fetches the auth-protected `/api/files` route.

---

### Task 1: Dashboard statistics logic

**Files:**
- Create: `lib/dashboard.ts`
- Test: `lib/dashboard.test.ts`

**Interfaces:**
- Consumes: `billStatusFor` (`@/lib/billing`), `dueStatus` (`@/lib/maintenance`).
- Produces (pure):
  - `computeDashboardStats(input: { units: { status: string }[]; bills: { grandTotal: number; dueDate: Date; payments: { amount: number }[] }[]; schedules: { nextDueAt: Date }[] }, now?: Date): { occupied: number; vacant: number; outstanding: number; overdueCount: number; maintenanceDueCount: number }`.
  - Task 2 consumes it.

- [ ] **Step 1: Write the failing test**

Create `lib/dashboard.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { computeDashboardStats } from "@/lib/dashboard";

describe("computeDashboardStats", () => {
  const now = new Date("2026-06-10");
  it("counts occupancy, outstanding, overdue, and due maintenance", () => {
    const stats = computeDashboardStats({
      units: [{ status: "occupied" }, { status: "occupied" }, { status: "vacant" }],
      bills: [
        // overdue, partially paid: outstanding 3,000,000
        { grandTotal: 5000000, dueDate: new Date("2026-06-05"), payments: [{ amount: 2000000 }] },
        // paid in full: no outstanding, not overdue
        { grandTotal: 1000000, dueDate: new Date("2026-06-05"), payments: [{ amount: 1000000 }] },
      ],
      schedules: [
        { nextDueAt: new Date("2026-06-09") }, // overdue → counts
        { nextDueAt: new Date("2026-06-12") }, // due_soon → counts
        { nextDueAt: new Date("2026-08-01") }, // ok → no
      ],
    }, now);

    expect(stats).toEqual({
      occupied: 2, vacant: 1, outstanding: 3000000, overdueCount: 1, maintenanceDueCount: 2,
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- dashboard`
Expected: FAIL — cannot resolve `@/lib/dashboard`.

- [ ] **Step 3: Implement `lib/dashboard.ts`**

```typescript
import { billStatusFor } from "@/lib/billing";
import { dueStatus } from "@/lib/maintenance";

export function computeDashboardStats(
  input: {
    units: { status: string }[];
    bills: { grandTotal: number; dueDate: Date; payments: { amount: number }[] }[];
    schedules: { nextDueAt: Date }[];
  },
  now: Date = new Date(),
): { occupied: number; vacant: number; outstanding: number; overdueCount: number; maintenanceDueCount: number } {
  const occupied = input.units.filter((u) => u.status === "occupied").length;
  const vacant = input.units.length - occupied;

  let outstanding = 0;
  let overdueCount = 0;
  for (const b of input.bills) {
    const paid = b.payments.reduce((s, p) => s + p.amount, 0);
    const remaining = b.grandTotal - paid;
    if (remaining > 0) outstanding += remaining;
    if (billStatusFor(b.grandTotal, paid, b.dueDate, now) === "overdue") overdueCount++;
  }

  const maintenanceDueCount = input.schedules.filter((s) => dueStatus(s.nextDueAt, now) !== "ok").length;

  return { occupied, vacant, outstanding, overdueCount, maintenanceDueCount };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- dashboard`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: pure dashboard statistics aggregation"
```

---

### Task 2: Settings page + QR-on-PDF resolution

**Files:**
- Create: `lib/setting-schema.ts`, `app/(app)/cai-dat/page.tsx`, `app/(app)/cai-dat/setting-actions.ts`, `app/(app)/cai-dat/setting-form.tsx`
- Modify: `app/(app)/hoa-don/[id]/pdf/route.ts` (load QR from disk as a data URL)
- Test: `lib/setting-schema.test.ts`

**Interfaces:**
- Consumes: `db`, `uploadDir`/`sanitizeFilename` (`@/lib/upload`), `/api/upload` route.
- Produces:
  - `settingSchema` (zod): all fields optional strings — `bankAccountName`, `bankAccountNo`, `bankName`, `qrImageUrl`, `invoiceNotes`, `adminZaloUserId`.
  - `qrDataUrl(qrImageUrl: string | null): Promise<string | null>` — reads the stored upload file from disk and returns a `data:` URL, or null.
  - Server action `saveSettings(formData)` upserting the singleton.

- [ ] **Step 1: Write the failing schema test**

Create `lib/setting-schema.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { settingSchema } from "@/lib/setting-schema";

describe("settingSchema", () => {
  it("accepts all-empty input (everything optional)", () => {
    expect(settingSchema.safeParse({}).success).toBe(true);
  });
  it("keeps provided values", () => {
    const r = settingSchema.parse({ bankAccountNo: "88859988888", bankName: "TP Bank" });
    expect(r.bankAccountNo).toBe("88859988888");
  });
  it("coerces empty strings to undefined", () => {
    const r = settingSchema.parse({ bankName: "" });
    expect(r.bankName).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- setting-schema`
Expected: FAIL — cannot resolve `@/lib/setting-schema`.

- [ ] **Step 3: Implement the schema**

Create `lib/setting-schema.ts`:
```typescript
import { z } from "zod";

const optionalStr = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().optional(),
);

export const settingSchema = z.object({
  bankAccountName: optionalStr,
  bankAccountNo: optionalStr,
  bankName: optionalStr,
  qrImageUrl: optionalStr,
  invoiceNotes: optionalStr,
  adminZaloUserId: optionalStr,
});

export type SettingInput = z.infer<typeof settingSchema>;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- setting-schema`
Expected: PASS (3 tests).

- [ ] **Step 5: Write the settings action + qrDataUrl helper**

Create `app/(app)/cai-dat/setting-actions.ts`:
```typescript
"use server";

import { readFile } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { settingSchema } from "@/lib/setting-schema";
import { sanitizeFilename, uploadDir } from "@/lib/upload";

export async function saveSettings(formData: FormData) {
  const parsed = settingSchema.safeParse({
    bankAccountName: formData.get("bankAccountName"),
    bankAccountNo: formData.get("bankAccountNo"),
    bankName: formData.get("bankName"),
    qrImageUrl: formData.get("qrImageUrl"),
    invoiceNotes: formData.get("invoiceNotes"),
    adminZaloUserId: formData.get("adminZaloUserId"),
  });
  if (!parsed.success) return { error: "Dữ liệu không hợp lệ" };
  const d = parsed.data;

  await db.setting.upsert({
    where: { id: "singleton" },
    update: d,
    create: { id: "singleton", ...d },
  });
  revalidatePath("/cai-dat");
  return { ok: true };
}

export async function qrDataUrl(qrImageUrl: string | null): Promise<string | null> {
  if (!qrImageUrl) return null;
  const name = sanitizeFilename(qrImageUrl.replace(/^\/api\/files\//, ""));
  try {
    const data = await readFile(path.join(uploadDir(), name));
    const ext = path.extname(name).toLowerCase();
    const mime = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
    return `data:${mime};base64,${data.toString("base64")}`;
  } catch {
    return null;
  }
}
```

- [ ] **Step 6: Build the settings form**

Create `app/(app)/cai-dat/setting-form.tsx`:
```tsx
"use client";

import { useState } from "react";
import { saveSettings } from "./setting-actions";

type Setting = {
  bankAccountName?: string | null; bankAccountNo?: string | null; bankName?: string | null;
  qrImageUrl?: string | null; invoiceNotes?: string | null; adminZaloUserId?: string | null;
};

async function uploadImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  if (!res.ok) throw new Error("upload failed");
  return (await res.json()).url as string;
}

export function SettingForm({ setting }: { setting: Setting | null }) {
  const [qr, setQr] = useState(setting?.qrImageUrl ?? "");
  const [msg, setMsg] = useState("");

  async function onSubmit(formData: FormData) {
    setMsg("");
    formData.set("qrImageUrl", qr);
    const res = await saveSettings(formData);
    setMsg(res?.error ?? "Đã lưu.");
  }

  return (
    <form action={onSubmit} className="max-w-lg space-y-3">
      <input name="bankAccountName" defaultValue={setting?.bankAccountName ?? ""} placeholder="Tên tài khoản" className="w-full rounded border px-3 py-2" />
      <input name="bankAccountNo" defaultValue={setting?.bankAccountNo ?? ""} placeholder="Số tài khoản" className="w-full rounded border px-3 py-2" />
      <input name="bankName" defaultValue={setting?.bankName ?? ""} placeholder="Ngân hàng" className="w-full rounded border px-3 py-2" />
      <textarea name="invoiceNotes" defaultValue={setting?.invoiceNotes ?? ""} placeholder="Ghi chú trên hóa đơn" className="w-full rounded border px-3 py-2" />
      <input name="adminZaloUserId" defaultValue={setting?.adminZaloUserId ?? ""} placeholder="Zalo user id của admin" className="w-full rounded border px-3 py-2" />
      <label className="block text-sm">Ảnh QR chuyển khoản
        <input type="file" accept="image/*" className="mt-1 block"
          onChange={async (e) => e.target.files?.[0] && setQr(await uploadImage(e.target.files[0]))} />
        {qr && <img src={qr} alt="QR" className="mt-1 h-32 w-32 rounded border object-contain" />}
      </label>
      {msg && <p className="text-sm text-green-700">{msg}</p>}
      <button className="rounded bg-blue-600 px-4 py-2 text-white">Lưu cài đặt</button>
    </form>
  );
}
```

- [ ] **Step 7: Build the settings page**

Create `app/(app)/cai-dat/page.tsx`:
```tsx
import { db } from "@/lib/db";
import { SettingForm } from "./setting-form";

export default async function SettingsPage() {
  const setting = await db.setting.findUnique({ where: { id: "singleton" } });
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Cài đặt</h1>
      <SettingForm setting={setting} />
    </div>
  );
}
```

- [ ] **Step 8: Resolve the QR in the PDF route**

In `app/(app)/hoa-don/[id]/pdf/route.ts`, remove the HTTP-origin URL rewrite and instead load the QR from disk. Replace the block that begins `// Resolve a relative qr url...` with:
```typescript
import { qrDataUrl } from "@/app/(app)/cai-dat/setting-actions";
// ...
  model.qrImageUrl = await qrDataUrl(model.qrImageUrl);
```
(Place the import at the top with the others.)

- [ ] **Step 9: Manually verify QR on the invoice**

Run `npm run dev`. Go to `/cai-dat`, fill bank info + invoice notes + admin Zalo id, upload a QR image, save. Open a bill → "Xuất PDF". The PDF now shows the bank info, notes, and the QR image. Stop the server.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: settings page feeding invoices and notifications; QR rendered on PDF"
```

---

### Task 3: Dashboard page + manual notify button

**Files:**
- Create: `app/(app)/notify-button.tsx`
- Modify: `app/(app)/page.tsx` (replace the Plan 1 stub with the real dashboard)
- Test: (covered by Task 1's pure test + Task 4 E2E; no new unit test)

**Interfaces:**
- Consumes: `db`, `computeDashboardStats` (`@/lib/dashboard`), `formatVND`, `/api/cron/notify` route.
- Produces: the dashboard view with summary cards + quick-action links + a manual "Gửi thông báo Zalo ngay" button.

- [ ] **Step 1: Build the notify button**

Create `app/(app)/notify-button.tsx`:
```tsx
"use client";

import { useState } from "react";

export function NotifyButton() {
  const [msg, setMsg] = useState("");
  async function onClick() {
    setMsg("Đang gửi...");
    const res = await fetch("/api/cron/notify", { headers: { "x-cron-secret": "" } });
    // Secret is server-side; this manual button relies on a same-origin authenticated call.
    setMsg(res.ok ? "Đã chạy thông báo." : "Không gửi được (kiểm tra cấu hình).");
  }
  return (
    <div>
      <button onClick={onClick} className="rounded bg-indigo-600 px-3 py-2 text-white">Gửi thông báo Zalo ngay</button>
      {msg && <span className="ml-2 text-sm text-gray-600">{msg}</span>}
    </div>
  );
}
```

Note: because the cron route requires `CRON_SECRET`, expose an authenticated alias for the manual button. Create `app/api/notify-now/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { sendZaloMessage } from "@/lib/zalo";
import { runNotifications } from "@/lib/notify-runner";

export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const result = await runNotifications({ db, send: (u, t) => sendZaloMessage(u, t) });
  return NextResponse.json(result);
}
```
Then in `notify-button.tsx` change the fetch to `await fetch("/api/notify-now", { method: "POST" })` and drop the header line.

- [ ] **Step 2: Build the dashboard page**

Replace `app/(app)/page.tsx` with:
```tsx
import Link from "next/link";
import { db } from "@/lib/db";
import { formatVND } from "@/lib/format";
import { computeDashboardStats } from "@/lib/dashboard";
import { NotifyButton } from "./notify-button";

function Card({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${accent ?? ""}`}>{value}</div>
    </div>
  );
}

export default async function DashboardPage() {
  const [units, bills, schedules] = await Promise.all([
    db.unit.findMany({ select: { status: true } }),
    db.bill.findMany({ where: { status: { not: "paid" } }, select: { grandTotal: true, dueDate: true, payments: { select: { amount: true } } } }),
    db.maintenanceSchedule.findMany({ select: { nextDueAt: true } }),
  ]);
  const stats = computeDashboardStats({ units, bills, schedules });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Tổng quan</h1>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card label="Phòng đang thuê" value={`${stats.occupied}/${stats.occupied + stats.vacant}`} />
        <Card label="Còn phải thu" value={formatVND(stats.outstanding)} />
        <Card label="Hóa đơn quá hạn" value={String(stats.overdueCount)} accent={stats.overdueCount ? "text-red-600" : ""} />
        <Card label="Bảo trì sắp đến hạn" value={String(stats.maintenanceDueCount)} accent={stats.maintenanceDueCount ? "text-amber-600" : ""} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/hoa-don/new" className="rounded bg-blue-600 px-3 py-2 text-white">Tạo hóa đơn</Link>
        <Link href="/khach-thue/new" className="rounded bg-blue-600 px-3 py-2 text-white">Thêm khách thuê</Link>
        <Link href="/chi-tieu" className="rounded bg-blue-600 px-3 py-2 text-white">Thêm chi tiêu</Link>
      </div>

      <NotifyButton />
    </div>
  );
}
```

- [ ] **Step 3: Manually verify**

Run `npm run dev`. Log in → the dashboard shows four cards with real numbers (occupancy from seeded/leased units, outstanding from unpaid bills, overdue count, maintenance due count). Quick-action links navigate correctly. Click "Gửi thông báo Zalo ngay" → status message appears. Stop the server.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: dashboard with summary cards, quick actions, and manual notify"
```

---

### Task 4: End-to-end flow test

**Files:**
- Create: `e2e/flow.spec.ts`
- Modify: `playwright.config.ts` (add a storage-state login fixture if not present — inline login is used here for simplicity)

**Interfaces:**
- Consumes: the full running app.
- Produces: an E2E test covering login → create tenant → assign lease → generate bill → record payment → see it in the ledger.

- [ ] **Step 1: Write the E2E test**

Create `e2e/flow.spec.ts`:
```typescript
import { test, expect } from "@playwright/test";

const EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@nhatro.local";
const PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "doimatkhau";

async function login(page) {
  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(EMAIL);
  await page.getByPlaceholder("Mật khẩu").fill(PASSWORD);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL("http://localhost:3000/");
}

test("admin can add a tenant, lease a room, bill it, and record a payment", async ({ page }) => {
  await login(page);

  // Create a tenant
  await page.goto("/khach-thue/new");
  await page.getByPlaceholder("Họ tên").fill("E2E Khách");
  await page.getByPlaceholder("Số điện thoại").fill("0900000000");
  await page.getByRole("button", { name: "Lưu" }).click();
  await expect(page.getByText("E2E Khách")).toBeVisible();

  // Assign a lease on the first room
  await page.goto("/phong");
  await page.getByText("Phòng 101").click();
  await page.getByRole("combobox").first().selectOption({ label: "E2E Khách" });
  await page.locator('input[name="startDate"]').fill("2026-06-01");
  await page.locator('input[name="agreedRent"]').fill("4800000");
  await page.locator('input[name="depositAmount"]').fill("4800000");
  await page.getByRole("button", { name: "Tạo hợp đồng" }).click();
  await expect(page.getByText("E2E Khách")).toBeVisible();

  // Generate a bill
  await page.goto("/hoa-don/new");
  await page.getByRole("combobox").selectOption({ label: "Phòng 101" });
  await page.getByPlaceholder("Kì thanh toán (vd: Tháng 6/2026)").fill("Tháng 6/2026");
  await page.locator('input[name="dueDate"]').fill("2026-06-05");
  await page.getByRole("button", { name: "Tạo hóa đơn" }).click();

  // Record a full payment
  await page.locator('input[name="amount"]').fill("4800000");
  await page.locator('input[name="paidAt"]').fill("2026-06-03");
  await page.getByRole("button", { name: "Lưu thanh toán" }).click();
  await expect(page.getByText("Đã thu")).toBeVisible();

  // It appears in the ledger
  await page.goto("/so-sach");
  await expect(page.getByText("Phòng 101 - Tháng 6/2026")).toBeVisible();
});
```

- [ ] **Step 2: Run the E2E test against a seeded database**

Ensure the database is seeded (`npm run db:seed`). Run:
```bash
npx playwright test flow
```
Expected: PASS (1 test). If a prior run already leased Phòng 101, reset with `npx prisma migrate reset --force && npm run db:seed` before re-running.

- [ ] **Step 3: Run the full unit suite**

Run: `npm test`
Expected: PASS — all unit tests from Plans 1–7 green.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "test: end-to-end tenant-to-ledger flow"
```

---

## Self-Review

**Spec coverage (Plan 7 portion):** Dashboard summary cards (occupied/vacant, rent due, overdue, maintenance due this week) — Tasks 1 & 3 ✓. Quick actions (record payment/create bill/add expense routes) — Task 3 ✓. Settings: admin account note, bank info, QR upload (embedded in PDF), default invoice notes — Task 2 ✓. Admin Zalo id for notifications — Task 2 ✓. The Plan 3 QR-behind-auth deferral is resolved by `qrDataUrl` reading from disk — Task 2 Step 8 ✓.

**Placeholder scan:** No TBDs. The notify-button's first version is immediately corrected to the authenticated `/api/notify-now` alias within the same step (not left in a broken state). The Settings "admin account management" is scoped to the existing single seeded admin for phase 1 (password change UI is explicitly out of scope — the admin is provisioned via seed/env), which matches the spec's phase-1 admin-only intent.

**Type consistency:** `computeDashboardStats` input shape matches the `select`ed fields loaded in Task 3 (`{status}`, `{grandTotal,dueDate,payments:{amount}}`, `{nextDueAt}`) ✓. `qrDataUrl` consumed by the PDF route (Task 2 Step 8) returns `string | null`, matching `InvoiceModel.qrImageUrl` ✓. `runNotifications`/`sendZaloMessage` reused unchanged from Plan 6 ✓. `settingSchema` fields match the `Setting` model columns from Plan 1 ✓.

---

## Project complete

With Plans 1–7 implemented, the phase-1 system delivers every success criterion from the spec: one-click invoice PDFs matching the family template, ~10-second payment recording, an auto-calculated ledger replacing the Google Sheet, and Zalo reminders for overdue bills and maintenance. Phase-2 items (tenant portal, Sheets import, multi-property, staff roles) remain cleanly deferred.
