# Plan 6 — Zalo Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Notify the admin's Zalo when a bill goes overdue or a maintenance task comes due, dispatched by a secret-protected endpoint that a scheduler hits daily, with de-duplication so each event is sent once.

**Architecture:** A pure planner (`pendingNotifications`) takes the current overdue bills, due maintenance schedules, and the set of already-sent keys, and returns the messages still to send. A thin Zalo client posts each message to the Zalo OA API. A `NotificationLog` table (added via a Plan-6 migration) records sent keys for idempotency. A `GET /api/cron/notify` route, guarded by `CRON_SECRET`, wires planner → client → log; any external cron (or Plan 7's manual button) can call it.

**Tech Stack:** Next.js 14 Route Handlers, Prisma (+ one migration), `isDue`/`billStatusFor` from earlier plans, Vitest.

## Global Constraints

- Carried from Plans 1–5: Next.js 14 App Router, TypeScript, Vietnamese UI, Prisma, money as integer đồng, secrets from env.
- All Zalo credentials (`ZALO_OA_ACCESS_TOKEN`) and the `CRON_SECRET` come from env — never hardcoded.
- Each notification event is sent at most once (idempotent via `NotificationLog.key`).
- The admin's Zalo user id is read from the `Setting.adminZaloUserId` field (Plan 1 schema).

---

### Task 1: Notification messages + planner logic

**Files:**
- Create: `lib/notifications.ts`
- Test: `lib/notifications.test.ts`

**Interfaces:**
- Consumes: nothing (pure).
- Produces:
  - `overdueKey(billId: string): string` → `"bill-overdue:<billId>"`.
  - `maintenanceKey(scheduleId: string, dueIso: string): string` → `"maint-due:<scheduleId>:<dueIso>"` (date-stamped so each new due cycle notifies again).
  - `buildOverdueMessage(unitName: string, periodLabel: string, dueDate: Date): string`.
  - `buildMaintenanceMessage(name: string): string`.
  - `type PlannedNotification = { key: string; text: string }`
  - `pendingNotifications(input: { overdueBills: {...}[]; dueSchedules: {...}[]; sentKeys: Set<string> }, now?: Date): PlannedNotification[]`.
  - Task 3's cron route consumes `pendingNotifications`.

- [ ] **Step 1: Write the failing tests**

Create `lib/notifications.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import {
  overdueKey, maintenanceKey, buildOverdueMessage, buildMaintenanceMessage, pendingNotifications,
} from "@/lib/notifications";

describe("keys", () => {
  it("builds an overdue key", () => expect(overdueKey("b1")).toBe("bill-overdue:b1"));
  it("builds a date-stamped maintenance key", () =>
    expect(maintenanceKey("s1", "2026-06-15")).toBe("maint-due:s1:2026-06-15"));
});

describe("messages", () => {
  it("formats the overdue message", () => {
    const msg = buildOverdueMessage("Phòng 301", "Tháng 6/2026", new Date("2026-06-05"));
    expect(msg).toContain("Phòng 301");
    expect(msg).toContain("Tháng 6/2026");
  });
  it("formats the maintenance message", () => {
    expect(buildMaintenanceMessage("Vệ sinh bể nước")).toContain("Vệ sinh bể nước");
  });
});

describe("pendingNotifications", () => {
  const now = new Date("2026-06-10");
  it("plans overdue bills and due schedules, skipping already-sent keys", () => {
    const planned = pendingNotifications({
      overdueBills: [
        { id: "b1", unitName: "Phòng 301", periodLabel: "Tháng 6/2026", dueDate: new Date("2026-06-05") },
        { id: "b2", unitName: "Phòng 302", periodLabel: "Tháng 6/2026", dueDate: new Date("2026-06-05") },
      ],
      dueSchedules: [
        { id: "s1", name: "Vệ sinh bể nước", nextDueAt: new Date("2026-06-09") },
      ],
      sentKeys: new Set(["bill-overdue:b2"]),
    }, now);

    const keys = planned.map((p) => p.key);
    expect(keys).toContain("bill-overdue:b1");
    expect(keys).not.toContain("bill-overdue:b2"); // already sent
    expect(keys).toContain("maint-due:s1:2026-06-09");
  });

  it("skips schedules not yet due", () => {
    const planned = pendingNotifications({
      overdueBills: [],
      dueSchedules: [{ id: "s2", name: "x", nextDueAt: new Date("2026-06-20") }],
      sentKeys: new Set(),
    }, now);
    expect(planned).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- notifications`
Expected: FAIL — cannot resolve `@/lib/notifications`.

- [ ] **Step 3: Implement `lib/notifications.ts`**

```typescript
import { isDue } from "@/lib/maintenance";

export function overdueKey(billId: string): string {
  return `bill-overdue:${billId}`;
}

export function maintenanceKey(scheduleId: string, dueIso: string): string {
  return `maint-due:${scheduleId}:${dueIso}`;
}

export function buildOverdueMessage(unitName: string, periodLabel: string, dueDate: Date): string {
  return `${unitName} chưa thanh toán hóa đơn ${periodLabel}. Hạn: ${dueDate.toLocaleDateString("vi-VN")}.`;
}

export function buildMaintenanceMessage(name: string): string {
  return `${name} đến hạn thực hiện hôm nay.`;
}

export type PlannedNotification = { key: string; text: string };

type OverdueBill = { id: string; unitName: string; periodLabel: string; dueDate: Date };
type DueSchedule = { id: string; name: string; nextDueAt: Date };

export function pendingNotifications(
  input: { overdueBills: OverdueBill[]; dueSchedules: DueSchedule[]; sentKeys: Set<string> },
  now: Date = new Date(),
): PlannedNotification[] {
  const out: PlannedNotification[] = [];

  for (const b of input.overdueBills) {
    const key = overdueKey(b.id);
    if (!input.sentKeys.has(key)) {
      out.push({ key, text: buildOverdueMessage(b.unitName, b.periodLabel, b.dueDate) });
    }
  }

  for (const s of input.dueSchedules) {
    if (!isDue(s.nextDueAt, now)) continue;
    const dueIso = s.nextDueAt.toISOString().slice(0, 10);
    const key = maintenanceKey(s.id, dueIso);
    if (!input.sentKeys.has(key)) {
      out.push({ key, text: buildMaintenanceMessage(s.name) });
    }
  }

  return out;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- notifications`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: pure notification planner and message builders"
```

---

### Task 2: Zalo OA client + NotificationLog migration

**Files:**
- Create: `lib/zalo.ts`
- Modify: `prisma/schema.prisma` (add `NotificationLog`), `.env.example` (add `ZALO_OA_ACCESS_TOKEN`, `CRON_SECRET`)
- Test: `lib/zalo.test.ts`

**Interfaces:**
- Consumes: `fetch`, env `ZALO_OA_ACCESS_TOKEN`.
- Produces:
  - `sendZaloMessage(userId: string, text: string, fetchImpl?: typeof fetch): Promise<{ ok: boolean; error?: string }>` — POSTs to the Zalo OA consultation API; injectable `fetchImpl` for testing.
  - `NotificationLog` model: `key String @id`, `sentAt DateTime @default(now())`.
  - Task 3 consumes `sendZaloMessage` and the `NotificationLog` table.

- [ ] **Step 1: Add the NotificationLog model**

Append to `prisma/schema.prisma`:
```prisma
model NotificationLog {
  key    String   @id
  sentAt DateTime @default(now())
}
```
Run:
```bash
npx prisma migrate dev --name add_notification_log
```

- [ ] **Step 2: Add env placeholders**

Append to `.env.example`:
```bash
ZALO_OA_ACCESS_TOKEN="your-zalo-oa-access-token"
CRON_SECRET="a-long-random-string"
```

- [ ] **Step 3: Write the failing client test**

Create `lib/zalo.test.ts`:
```typescript
import { describe, it, expect, vi } from "vitest";
import { sendZaloMessage } from "@/lib/zalo";

describe("sendZaloMessage", () => {
  it("posts the message and returns ok on success", async () => {
    const fakeFetch = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ error: 0 }),
    }) as unknown as typeof fetch;
    process.env.ZALO_OA_ACCESS_TOKEN = "token123";

    const res = await sendZaloMessage("user1", "Xin chào", fakeFetch);
    expect(res.ok).toBe(true);
    expect(fakeFetch).toHaveBeenCalledOnce();
    const [, init] = (fakeFetch as any).mock.calls[0];
    expect(init.headers["access_token"]).toBe("token123");
    expect(JSON.parse(init.body).recipient.user_id).toBe("user1");
  });

  it("returns an error when the API reports a non-zero error code", async () => {
    const fakeFetch = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ error: -32, message: "invalid user" }),
    }) as unknown as typeof fetch;
    process.env.ZALO_OA_ACCESS_TOKEN = "token123";

    const res = await sendZaloMessage("bad", "x", fakeFetch);
    expect(res.ok).toBe(false);
    expect(res.error).toContain("invalid user");
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npm test -- zalo`
Expected: FAIL — cannot resolve `@/lib/zalo`.

- [ ] **Step 5: Implement `lib/zalo.ts`**

```typescript
const ZALO_MESSAGE_URL = "https://openapi.zalo.me/v3.0/oa/message/cs";

export async function sendZaloMessage(
  userId: string,
  text: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.ZALO_OA_ACCESS_TOKEN;
  if (!token) return { ok: false, error: "Thiếu ZALO_OA_ACCESS_TOKEN" };

  const res = await fetchImpl(ZALO_MESSAGE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", access_token: token },
    body: JSON.stringify({ recipient: { user_id: userId }, message: { text } }),
  });

  const data = (await res.json()) as { error?: number; message?: string };
  if (!res.ok || (data.error && data.error !== 0)) {
    return { ok: false, error: data.message ?? `HTTP ${res.status}` };
  }
  return { ok: true };
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm test -- zalo`
Expected: PASS (2 tests).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: Zalo OA client and notification log table"
```

---

### Task 3: Cron dispatch route

**Files:**
- Create: `lib/notify-runner.ts`, `app/api/cron/notify/route.ts`
- Test: `lib/notify-runner.test.ts`

**Interfaces:**
- Consumes: `db`, `billStatusFor` (`@/lib/billing`), `pendingNotifications` (`@/lib/notifications`), `sendZaloMessage` (`@/lib/zalo`), `dueStatus`/`isDue` (`@/lib/maintenance`).
- Produces:
  - `runNotifications(deps): Promise<{ sent: number; failed: number; skipped: string }>` — pulls overdue bills + due schedules + sent keys, plans, sends via an injected `send` fn, records sent keys. `deps` injects `db` and `send` for testing.
  - `GET /api/cron/notify` → checks `CRON_SECRET`, calls `runNotifications`, returns a JSON summary.

- [ ] **Step 1: Write the failing runner test**

Create `lib/notify-runner.test.ts`:
```typescript
import { describe, it, expect, vi } from "vitest";
import { runNotifications } from "@/lib/notify-runner";

function makeDb() {
  return {
    setting: { findUnique: vi.fn().mockResolvedValue({ adminZaloUserId: "admin-zalo" }) },
    bill: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: "b1", periodLabel: "Tháng 6/2026", dueDate: new Date("2026-06-05"), grandTotal: 5000000,
          payments: [], lease: { unit: { name: "Phòng 301" } },
        },
      ]),
    },
    maintenanceSchedule: {
      findMany: vi.fn().mockResolvedValue([
        { id: "s1", name: "Vệ sinh bể nước", nextDueAt: new Date("2026-06-01") },
      ]),
    },
    notificationLog: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({}),
    },
  };
}

describe("runNotifications", () => {
  it("sends planned notifications and logs their keys", async () => {
    const db = makeDb();
    const send = vi.fn().mockResolvedValue({ ok: true });
    const res = await runNotifications({ db: db as any, send, now: new Date("2026-06-10") });

    expect(send).toHaveBeenCalledTimes(2); // 1 overdue bill + 1 due schedule
    expect(db.notificationLog.create).toHaveBeenCalledTimes(2);
    expect(res.sent).toBe(2);
  });

  it("skips when no admin Zalo id is configured", async () => {
    const db = makeDb();
    db.setting.findUnique = vi.fn().mockResolvedValue({ adminZaloUserId: null });
    const send = vi.fn();
    const res = await runNotifications({ db: db as any, send, now: new Date("2026-06-10") });
    expect(send).not.toHaveBeenCalled();
    expect(res.skipped).toContain("Zalo");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- notify-runner`
Expected: FAIL — cannot resolve `@/lib/notify-runner`.

- [ ] **Step 3: Implement `lib/notify-runner.ts`**

```typescript
import type { PrismaClient } from "@prisma/client";
import { billStatusFor } from "@/lib/billing";
import { pendingNotifications } from "@/lib/notifications";

type SendFn = (userId: string, text: string) => Promise<{ ok: boolean; error?: string }>;

export async function runNotifications(deps: {
  db: PrismaClient;
  send: SendFn;
  now?: Date;
}): Promise<{ sent: number; failed: number; skipped: string }> {
  const { db, send } = deps;
  const now = deps.now ?? new Date();

  const setting = await db.setting.findUnique({ where: { id: "singleton" } });
  const adminZalo = setting?.adminZaloUserId;
  if (!adminZalo) return { sent: 0, failed: 0, skipped: "Chưa cấu hình Zalo admin" };

  // Overdue bills: not fully paid and past due date.
  const billRows = await db.bill.findMany({
    where: { status: { not: "paid" } },
    include: { payments: true, lease: { include: { unit: true } } },
  });
  const overdueBills = billRows
    .filter((b) => {
      const paid = b.payments.reduce((s, p) => s + p.amount, 0);
      return billStatusFor(b.grandTotal, paid, b.dueDate, now) === "overdue";
    })
    .map((b) => ({ id: b.id, unitName: b.lease.unit.name, periodLabel: b.periodLabel, dueDate: b.dueDate }));

  const dueSchedules = (await db.maintenanceSchedule.findMany()).map((s) => ({
    id: s.id, name: s.name, nextDueAt: s.nextDueAt,
  }));

  const sentRows = await db.notificationLog.findMany();
  const sentKeys = new Set(sentRows.map((r) => r.key));

  const planned = pendingNotifications({ overdueBills, dueSchedules, sentKeys }, now);

  let sent = 0;
  let failed = 0;
  for (const n of planned) {
    const res = await send(adminZalo, n.text);
    if (res.ok) {
      await db.notificationLog.create({ data: { key: n.key } });
      sent++;
    } else {
      failed++;
    }
  }

  return { sent, failed, skipped: "" };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- notify-runner`
Expected: PASS (2 tests).

- [ ] **Step 5: Build the cron route**

Create `app/api/cron/notify/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendZaloMessage } from "@/lib/zalo";
import { runNotifications } from "@/lib/notify-runner";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret") ?? req.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 401 });
  }

  const result = await runNotifications({
    db,
    send: (userId, text) => sendZaloMessage(userId, text),
  });
  return NextResponse.json(result);
}
```

Note: this route is intentionally outside the auth middleware's protection because cron callers have no session; it is protected by `CRON_SECRET` instead. Confirm the Plan 1 middleware matcher still routes `/api/...` through — it excludes only `api/auth`, so add `api/cron` to the matcher exclusion. In `middleware.ts`, change the matcher to:
```typescript
matcher: ["/((?!api/auth|api/cron|_next/static|_next/image|favicon.ico).*)"],
```

- [ ] **Step 6: Manually verify the endpoint**

Set `CRON_SECRET` in `.env` and an `adminZaloUserId` in the `Setting` row (via Prisma Studio for now). With `ZALO_OA_ACCESS_TOKEN` unset, run `npm run dev` and visit `http://localhost:3000/api/cron/notify?secret=WRONG` → 401. Visit with the correct secret → JSON summary `{ sent, failed, skipped }`. With no token configured, planned sends count as `failed` (the Zalo client returns `ok:false`), which proves the wiring without needing a live OA. Stop the server.

- [ ] **Step 7: Document the daily scheduler**

Create a short note at the bottom of the project README (create `README.md` if absent) under "Thông báo Zalo": the host should call `GET /api/cron/notify?secret=$CRON_SECRET` once daily (e.g. a Railway cron job or a system crontab line: `0 8 * * * curl -s "https://<host>/api/cron/notify?secret=$CRON_SECRET"`).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: secret-protected Zalo notification cron dispatch"
```

---

## Self-Review

**Spec coverage (Plan 6 portion):** Overdue-bill Zalo message in the spec's wording ("[unit] chưa thanh toán hóa đơn [period]. Hạn: [date].") — Task 1 `buildOverdueMessage` ✓. Maintenance-due message ("[name] đến hạn thực hiện hôm nay.") — Task 1 `buildMaintenanceMessage` ✓. Sent to the admin's Zalo from settings — Task 3 reads `Setting.adminZaloUserId` ✓. Requires a registered Zalo OA — Task 2 client + env token ✓.

**Placeholder scan:** No TBDs. The middleware matcher change is specified verbatim (Task 3 Step 5). The README note is concrete (exact crontab line).

**Type consistency:** `pendingNotifications` input shape matches what `runNotifications` builds (`{id, unitName, periodLabel, dueDate}` / `{id, name, nextDueAt}`) ✓. `sendZaloMessage` signature `(userId, text, fetchImpl?)` consistent between Task 2 and the `send` adapter in Task 3 ✓. `billStatusFor` (Plan 3) and `isDue` (Plan 5) reused with their original signatures ✓. `NotificationLog.key` PK used as the dedupe key everywhere ✓.

---

**Carries into Plan 7:** the dashboard surfaces the same overdue-bill and due-maintenance counts; Settings lets the admin set `adminZaloUserId`, bank info, QR image, and invoice notes; a manual "Gửi thông báo ngay" button can call `/api/cron/notify`.
