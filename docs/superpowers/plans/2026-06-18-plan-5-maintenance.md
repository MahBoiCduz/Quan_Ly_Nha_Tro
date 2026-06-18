# Plan 5 — Maintenance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Manage recurring maintenance tasks (e.g. "Vệ sinh bể nước" every 90 days), scoped to the whole building or a specific unit, and log completions that automatically roll the next due date forward.

**Architecture:** A `MaintenanceSchedule` carries an `intervalDays` and a computed `nextDueAt`. Marking a task done writes a `MaintenanceLog` and advances `lastDoneAt`/`nextDueAt` in one transaction. The due-date arithmetic is pure and unit-tested; Plan 6 reuses `isDue` to decide when to send Zalo reminders.

**Tech Stack:** Next.js 14 Server Components + Server Actions, Prisma, zod, Vitest.

## Global Constraints

- Carried from Plan 1: Next.js 14 App Router, TypeScript, Vietnamese UI, Prisma, secrets from env.
- `scope` is a string `"building"` or `"unit"`; when `"unit"`, `unitId` is required.
- Dates are stored as `DateTime`; due arithmetic adds whole days.

---

### Task 1: Maintenance scheduling logic

**Files:**
- Create: `lib/maintenance.ts`
- Test: `lib/maintenance.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces (pure):
  - `addDays(date: Date, days: number): Date`
  - `computeNextDue(anchor: Date, intervalDays: number): Date` — `anchor + intervalDays`.
  - `isDue(nextDueAt: Date, now?: Date): boolean` — true when `now >= nextDueAt`.
  - `dueStatus(nextDueAt: Date, now?: Date): "overdue" | "due_soon" | "ok"` — overdue when past; `due_soon` within 7 days; otherwise ok.
  - Plan 6 consumes `isDue`.

- [ ] **Step 1: Write the failing tests**

Create `lib/maintenance.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { addDays, computeNextDue, isDue, dueStatus } from "@/lib/maintenance";

describe("addDays", () => {
  it("adds whole days", () => {
    expect(addDays(new Date("2026-01-01"), 90).toISOString().slice(0, 10)).toBe("2026-04-01");
  });
});

describe("computeNextDue", () => {
  it("is the anchor plus the interval", () => {
    expect(computeNextDue(new Date("2026-01-01"), 30).toISOString().slice(0, 10)).toBe("2026-01-31");
  });
});

describe("isDue", () => {
  it("is true once now reaches the due date", () => {
    expect(isDue(new Date("2026-06-01"), new Date("2026-06-02"))).toBe(true);
  });
  it("is false before the due date", () => {
    expect(isDue(new Date("2026-06-10"), new Date("2026-06-02"))).toBe(false);
  });
});

describe("dueStatus", () => {
  const now = new Date("2026-06-10");
  it("overdue when past", () => expect(dueStatus(new Date("2026-06-01"), now)).toBe("overdue"));
  it("due_soon within 7 days", () => expect(dueStatus(new Date("2026-06-15"), now)).toBe("due_soon"));
  it("ok when far out", () => expect(dueStatus(new Date("2026-07-30"), now)).toBe("ok"));
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- maintenance`
Expected: FAIL — cannot resolve `@/lib/maintenance`.

- [ ] **Step 3: Implement `lib/maintenance.ts`**

```typescript
export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function computeNextDue(anchor: Date, intervalDays: number): Date {
  return addDays(anchor, intervalDays);
}

export function isDue(nextDueAt: Date, now: Date = new Date()): boolean {
  return now.getTime() >= nextDueAt.getTime();
}

export function dueStatus(
  nextDueAt: Date,
  now: Date = new Date(),
): "overdue" | "due_soon" | "ok" {
  const ms = nextDueAt.getTime() - now.getTime();
  const day = 24 * 60 * 60 * 1000;
  if (ms < 0) return "overdue";
  if (ms <= 7 * day) return "due_soon";
  return "ok";
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- maintenance`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: pure maintenance due-date logic"
```

---

### Task 2: Maintenance schedule CRUD + completion logging

**Files:**
- Create: `lib/maintenance-schema.ts`, `app/(app)/bao-tri/page.tsx`, `app/(app)/bao-tri/maintenance-actions.ts`, `app/(app)/bao-tri/schedule-form.tsx`
- Test: `lib/maintenance-schema.test.ts`

**Interfaces:**
- Consumes: `db`, `computeNextDue`/`dueStatus` (`@/lib/maintenance`), units (Plan 1).
- Produces:
  - `maintenanceSchema` (zod): `name` (min 1), `scope` enum `["building","unit"]`, optional `unitId`, `intervalDays` int positive, `startDate`; refined so `scope==="unit"` requires `unitId`.
  - Server actions `createSchedule(formData)` (sets `nextDueAt = computeNextDue(startDate, intervalDays)`), `markDone(scheduleId, doneAt)` (creates a `MaintenanceLog`, sets `lastDoneAt`, advances `nextDueAt`), `deleteSchedule(id)`.
  - Plan 6 reads `MaintenanceSchedule` rows produced here.

- [ ] **Step 1: Write the failing schema test**

Create `lib/maintenance-schema.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { maintenanceSchema } from "@/lib/maintenance-schema";

describe("maintenanceSchema", () => {
  it("accepts a building-scoped schedule", () => {
    expect(maintenanceSchema.safeParse({
      name: "Vệ sinh bể nước", scope: "building", intervalDays: 90, startDate: "2026-06-01",
    }).success).toBe(true);
  });
  it("requires unitId when scope is unit", () => {
    expect(maintenanceSchema.safeParse({
      name: "Bảo dưỡng máy lạnh", scope: "unit", intervalDays: 180, startDate: "2026-06-01",
    }).success).toBe(false);
  });
  it("accepts a unit-scoped schedule with unitId", () => {
    expect(maintenanceSchema.safeParse({
      name: "Bảo dưỡng máy lạnh", scope: "unit", unitId: "u1", intervalDays: 180, startDate: "2026-06-01",
    }).success).toBe(true);
  });
  it("rejects a non-positive interval", () => {
    expect(maintenanceSchema.safeParse({
      name: "x", scope: "building", intervalDays: 0, startDate: "2026-06-01",
    }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- maintenance-schema`
Expected: FAIL — cannot resolve `@/lib/maintenance-schema`.

- [ ] **Step 3: Implement the schema**

Create `lib/maintenance-schema.ts`:
```typescript
import { z } from "zod";

const optionalStr = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().optional(),
);

export const maintenanceSchema = z
  .object({
    name: z.string().min(1),
    scope: z.enum(["building", "unit"]),
    unitId: optionalStr,
    intervalDays: z.number().int().positive(),
    startDate: z.string().min(1),
    notes: optionalStr,
  })
  .refine((d) => d.scope !== "unit" || !!d.unitId, {
    message: "Cần chọn phòng khi phạm vi là phòng",
    path: ["unitId"],
  });

export type MaintenanceInput = z.infer<typeof maintenanceSchema>;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- maintenance-schema`
Expected: PASS (4 tests).

- [ ] **Step 5: Write the maintenance actions**

Create `app/(app)/bao-tri/maintenance-actions.ts`:
```typescript
"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { maintenanceSchema } from "@/lib/maintenance-schema";
import { computeNextDue } from "@/lib/maintenance";

export async function createSchedule(formData: FormData) {
  const parsed = maintenanceSchema.safeParse({
    name: formData.get("name"),
    scope: formData.get("scope"),
    unitId: formData.get("unitId"),
    intervalDays: Number(formData.get("intervalDays") ?? 0),
    startDate: formData.get("startDate"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) return { error: "Dữ liệu không hợp lệ" };
  const d = parsed.data;
  const start = new Date(d.startDate);

  await db.maintenanceSchedule.create({
    data: {
      name: d.name,
      scope: d.scope,
      unitId: d.scope === "unit" ? d.unitId! : null,
      intervalDays: d.intervalDays,
      lastDoneAt: null,
      nextDueAt: computeNextDue(start, d.intervalDays),
      notes: d.notes ?? null,
    },
  });
  revalidatePath("/bao-tri");
  return { ok: true };
}

export async function markDone(scheduleId: string, doneAt: string) {
  const done = new Date(doneAt);
  const schedule = await db.maintenanceSchedule.findUnique({ where: { id: scheduleId } });
  if (!schedule) return { error: "Không tìm thấy" };

  await db.$transaction([
    db.maintenanceLog.create({ data: { scheduleId, doneAt: done } }),
    db.maintenanceSchedule.update({
      where: { id: scheduleId },
      data: { lastDoneAt: done, nextDueAt: computeNextDue(done, schedule.intervalDays) },
    }),
  ]);
  revalidatePath("/bao-tri");
  return { ok: true };
}

export async function deleteSchedule(id: string) {
  await db.maintenanceSchedule.delete({ where: { id } });
  revalidatePath("/bao-tri");
  return { ok: true };
}
```

- [ ] **Step 6: Build the schedule form**

Create `app/(app)/bao-tri/schedule-form.tsx`:
```tsx
"use client";

import { useState } from "react";
import { createSchedule } from "./maintenance-actions";

type Unit = { id: string; name: string };

export function ScheduleForm({ units }: { units: Unit[] }) {
  const [scope, setScope] = useState("building");
  const [error, setError] = useState("");

  async function onSubmit(formData: FormData) {
    setError("");
    const res = await createSchedule(formData);
    if (res?.error) setError(res.error);
  }

  return (
    <form action={onSubmit} className="mb-4 flex flex-wrap items-end gap-2">
      <input name="name" placeholder="Tên công việc" required className="rounded border px-2 py-1" />
      <select name="scope" value={scope} onChange={(e) => setScope(e.target.value)} className="rounded border px-2 py-1">
        <option value="building">Toàn nhà</option>
        <option value="unit">Theo phòng</option>
      </select>
      {scope === "unit" && (
        <select name="unitId" required className="rounded border px-2 py-1">
          <option value="">— Chọn phòng —</option>
          {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      )}
      <input name="intervalDays" type="number" min="1" placeholder="Chu kỳ (ngày)" required className="w-32 rounded border px-2 py-1" />
      <label className="text-sm">Bắt đầu
        <input name="startDate" type="date" required className="ml-1 rounded border px-2 py-1" />
      </label>
      <input name="notes" placeholder="Ghi chú" className="rounded border px-2 py-1" />
      <button className="rounded bg-blue-600 px-3 py-1 text-white">Thêm lịch</button>
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </form>
  );
}
```

- [ ] **Step 7: Build the maintenance page**

Create `app/(app)/bao-tri/page.tsx`:
```tsx
import { db } from "@/lib/db";
import { dueStatus } from "@/lib/maintenance";
import { ScheduleForm } from "./schedule-form";
import { markDone, deleteSchedule } from "./maintenance-actions";

const STATUS_LABEL: Record<string, string> = { overdue: "Quá hạn", due_soon: "Sắp đến hạn", ok: "Bình thường" };
const STATUS_COLOR: Record<string, string> = { overdue: "text-red-600", due_soon: "text-amber-600", ok: "text-gray-500" };

export default async function MaintenancePage() {
  const [schedules, units] = await Promise.all([
    db.maintenanceSchedule.findMany({ include: { unit: true }, orderBy: { nextDueAt: "asc" } }),
    db.unit.findMany({ orderBy: [{ floor: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
  ]);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Bảo trì</h1>
      <ScheduleForm units={units} />
      <table className="w-full border bg-white text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-2 py-1 text-left">Công việc</th>
            <th className="border px-2 py-1">Phạm vi</th>
            <th className="border px-2 py-1">Chu kỳ</th>
            <th className="border px-2 py-1">Lần tới</th>
            <th className="border px-2 py-1">Trạng thái</th>
            <th className="border px-2 py-1"></th>
          </tr>
        </thead>
        <tbody>
          {schedules.map((s) => {
            const st = dueStatus(s.nextDueAt);
            return (
              <tr key={s.id}>
                <td className="border px-2 py-1">{s.name}</td>
                <td className="border px-2 py-1 text-center">{s.scope === "unit" ? s.unit?.name : "Toàn nhà"}</td>
                <td className="border px-2 py-1 text-center">{s.intervalDays} ngày</td>
                <td className="border px-2 py-1 text-center">{s.nextDueAt.toLocaleDateString("vi-VN")}</td>
                <td className={`border px-2 py-1 text-center ${STATUS_COLOR[st]}`}>{STATUS_LABEL[st]}</td>
                <td className="border px-2 py-1 text-center">
                  <form action={async (fd: FormData) => { "use server"; await markDone(s.id, String(fd.get("doneAt"))); }}
                    className="flex items-center gap-1">
                    <input name="doneAt" type="date" required className="rounded border px-1 py-0.5 text-xs" />
                    <button className="rounded bg-green-600 px-2 py-0.5 text-xs text-white">Đã làm</button>
                  </form>
                  <form action={deleteSchedule.bind(null, s.id)} className="mt-1">
                    <button className="text-xs text-red-600 hover:underline">Xóa</button>
                  </form>
                </td>
              </tr>
            );
          })}
          {schedules.length === 0 && <tr><td colSpan={6} className="px-2 py-2 text-center text-gray-400">Chưa có lịch bảo trì.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 8: Manually verify the roll-forward**

Run `npm run dev`, go to `/bao-tri`. Add "Vệ sinh bể nước / Toàn nhà / 90 / today". It appears with a next-due 90 days out. Mark it done with today's date → next-due advances another 90 days from today, and status returns to "Bình thường". Add a unit-scoped task and confirm the unit dropdown appears only for "Theo phòng". Stop the server.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: maintenance schedules with completion logging and due status"
```

---

## Self-Review

**Spec coverage (Plan 5 portion):** List scheduled tasks with next due + status — Task 2 ✓. Add/edit schedule with name, interval, scope (building or specific room) — Task 2 ✓. Mark done with date + log — Task 2 (`markDone` + `MaintenanceLog`) ✓. The Zalo reminder when a task is due is Plan 6 and reuses `isDue` from Task 1.

**Placeholder scan:** No TBDs; all steps runnable. The inline server action in the table (Step 7) is fully written, not a stub.

**Type consistency:** `computeNextDue`/`dueStatus`/`isDue` defined in Task 1, used in Task 2 and (later) Plan 6 ✓. `maintenanceSchema` enum `["building","unit"]` matches the `scope` strings written in the action and read in the page ✓. `unitId` nullability handled consistently (null for building scope) ✓.

---

**Carries into Plan 6:** the notification job queries `MaintenanceSchedule.nextDueAt` with `isDue`, and overdue `Bill` rows, then dispatches via the Zalo client.
