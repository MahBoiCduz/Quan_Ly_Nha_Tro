# Plan 2 — Rooms, Tenants & Leases Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Manage the 16 units, their configurable service line items, tenant records (including ID-card photo uploads), and leases that assign a tenant to a unit with deposit tracking.

**Architecture:** Server Components fetch data directly via Prisma; mutations use Server Actions that delegate to thin, unit-tested helper functions in `lib/`. Uploaded ID images are sensitive PII, so they are written to a gitignored `uploads/` directory and served only through an auth-protected route — never the public folder. Creating a lease flips the unit's status to `occupied`; ending it flips it back to `vacant`.

**Tech Stack:** Next.js 14 Server Components + Server Actions, Prisma, zod, Vitest.

## Global Constraints

- All carried from Plan 1: Next.js 14 App Router, TypeScript, Vietnamese UI, Prisma (no raw SQL), money as integer đồng, secrets from env.
- New feature pages live under `app/(app)/` to inherit the shell.
- ServiceItem's field is `measureUnit` (not `unit`), matching the Plan 1 schema.
- ID-card images are PII: never store under `public/`; always serve behind auth.
- Validate every Server Action input with a zod schema before touching the database.

---

### Task 1: Auth-protected file upload + serving

**Files:**
- Create: `lib/upload.ts`, `app/api/upload/route.ts`, `app/api/files/[...path]/route.ts`
- Modify: `.gitignore` (add `/uploads`), `.env.example` (add `UPLOAD_DIR`)
- Test: `lib/upload.test.ts`

**Interfaces:**
- Consumes: `auth` (`@/auth`).
- Produces:
  - `sanitizeFilename(name: string): string`
  - `isAllowedImage(mime: string): boolean`
  - `uploadDir(): string` (reads `UPLOAD_DIR`, defaults to `./uploads`)
  - `POST /api/upload` → accepts `multipart/form-data` with a `file` field, returns `{ url: string }` where url is `/api/files/<stored-name>`.
  - `GET /api/files/<name>` → streams the file if the request is authenticated.
  - Tenant task (Task 4) consumes the returned `url` strings.

- [ ] **Step 1: Write the failing helper tests**

Create `lib/upload.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { sanitizeFilename, isAllowedImage } from "@/lib/upload";

describe("sanitizeFilename", () => {
  it("strips path separators and unsafe chars", () => {
    expect(sanitizeFilename("../../etc/passwd")).toBe("etc_passwd");
    expect(sanitizeFilename("anh cccd (1).jpg")).toBe("anh_cccd_1.jpg");
  });
});

describe("isAllowedImage", () => {
  it("accepts jpeg and png", () => {
    expect(isAllowedImage("image/jpeg")).toBe(true);
    expect(isAllowedImage("image/png")).toBe(true);
  });
  it("rejects non-images", () => {
    expect(isAllowedImage("application/pdf")).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- upload`
Expected: FAIL — cannot resolve `@/lib/upload`.

- [ ] **Step 3: Implement `lib/upload.ts`**

```typescript
import path from "path";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export function isAllowedImage(mime: string): boolean {
  return ALLOWED.has(mime);
}

export function sanitizeFilename(name: string): string {
  return name
    .replace(/^.*[\\/]/, "")          // drop any path prefix
    .replace(/[^a-zA-Z0-9.]+/g, "_")  // collapse unsafe runs to _
    .replace(/^_+|_+$/g, "")          // trim leading/trailing _
    .replace(/_+(\.)/g, "$1");        // _ before extension dot
}

export function uploadDir(): string {
  return process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- upload`
Expected: PASS (3 tests).

- [ ] **Step 5: Implement the upload route**

Create `app/api/upload/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { auth } from "@/auth";
import { isAllowedImage, sanitizeFilename, uploadDir } from "@/lib/upload";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Thiếu tệp" }, { status: 400 });
  }
  if (!isAllowedImage(file.type)) {
    return NextResponse.json({ error: "Định dạng ảnh không hợp lệ" }, { status: 400 });
  }

  const dir = uploadDir();
  await mkdir(dir, { recursive: true });
  const stored = `${randomUUID()}_${sanitizeFilename(file.name)}`;
  await writeFile(path.join(dir, stored), Buffer.from(await file.arrayBuffer()));

  return NextResponse.json({ url: `/api/files/${stored}` });
}
```

- [ ] **Step 6: Implement the file-serving route**

Create `app/api/files/[...path]/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { auth } from "@/auth";
import { sanitizeFilename, uploadDir } from "@/lib/upload";

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const name = sanitizeFilename(params.path.join("/"));
  try {
    const data = await readFile(path.join(uploadDir(), name));
    const ext = path.extname(name).toLowerCase();
    const type = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
    return new NextResponse(new Uint8Array(data), { headers: { "Content-Type": type } });
  } catch {
    return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  }
}
```

- [ ] **Step 7: Update ignore + env files**

Add `/uploads` to `.gitignore`. Add to `.env.example`:
```bash
UPLOAD_DIR="./uploads"
```

- [ ] **Step 8: Manually verify upload + retrieval**

Run `npm run dev`, log in, then in the browser devtools console (so the auth cookie is sent):
```javascript
const fd = new FormData();
fd.append("file", new File([new Uint8Array([255,216,255])], "test.jpg", { type: "image/jpeg" }));
const r = await fetch("/api/upload", { method: "POST", body: fd });
console.log(await r.json()); // { url: "/api/files/<uuid>_test.jpg" }
```
Open the returned url in the browser → image bytes load (not a 401). Stop the dev server.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: auth-protected image upload and serving"
```

---

### Task 2: Rooms list + detail (read)

**Files:**
- Create: `lib/rooms.ts`, `app/(app)/phong/page.tsx`, `app/(app)/phong/[id]/page.tsx`
- Test: `lib/rooms.test.ts`

**Interfaces:**
- Consumes: `db` (`@/lib/db`), `formatVND` (`@/lib/format`).
- Produces:
  - `groupUnitsByFloor<T extends { floor: number }>(units: T[]): Map<number, T[]>`
  - `getActiveLease<T extends { startDate: Date; endDate: Date | null }>(leases: T[], on?: Date): T | null` — the lease active on `on` (default now): `startDate <= on` and (`endDate` is null or `endDate >= on`).
  - Tasks 3 & 5 reuse `getActiveLease`.

- [ ] **Step 1: Write the failing logic tests**

Create `lib/rooms.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { groupUnitsByFloor, getActiveLease } from "@/lib/rooms";

describe("groupUnitsByFloor", () => {
  it("buckets units by their floor", () => {
    const g = groupUnitsByFloor([
      { floor: 1 }, { floor: 2 }, { floor: 1 },
    ]);
    expect(g.get(1)).toHaveLength(2);
    expect(g.get(2)).toHaveLength(1);
  });
});

describe("getActiveLease", () => {
  const on = new Date("2026-06-15");
  it("returns an open-ended lease that has started", () => {
    const lease = { startDate: new Date("2026-01-01"), endDate: null };
    expect(getActiveLease([lease], on)).toBe(lease);
  });
  it("ignores a lease that has ended", () => {
    const lease = { startDate: new Date("2026-01-01"), endDate: new Date("2026-05-01") };
    expect(getActiveLease([lease], on)).toBeNull();
  });
  it("ignores a future lease", () => {
    const lease = { startDate: new Date("2026-07-01"), endDate: null };
    expect(getActiveLease([lease], on)).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- rooms`
Expected: FAIL — cannot resolve `@/lib/rooms`.

- [ ] **Step 3: Implement `lib/rooms.ts`**

```typescript
export function groupUnitsByFloor<T extends { floor: number }>(units: T[]): Map<number, T[]> {
  const map = new Map<number, T[]>();
  for (const u of units) {
    const list = map.get(u.floor) ?? [];
    list.push(u);
    map.set(u.floor, list);
  }
  return map;
}

export function getActiveLease<T extends { startDate: Date; endDate: Date | null }>(
  leases: T[],
  on: Date = new Date(),
): T | null {
  return (
    leases.find((l) => l.startDate <= on && (l.endDate === null || l.endDate >= on)) ?? null
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- rooms`
Expected: PASS (4 tests).

- [ ] **Step 5: Build the rooms list page**

Create `app/(app)/phong/page.tsx`:
```tsx
import Link from "next/link";
import { db } from "@/lib/db";
import { formatVND } from "@/lib/format";
import { groupUnitsByFloor, getActiveLease } from "@/lib/rooms";

export default async function RoomsPage() {
  const units = await db.unit.findMany({
    orderBy: [{ floor: "asc" }, { name: "asc" }],
    include: { leases: { include: { tenant: true } } },
  });
  const byFloor = groupUnitsByFloor(units);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Phòng</h1>
      {[...byFloor.keys()].sort().map((floor) => (
        <section key={floor} className="mb-6">
          <h2 className="mb-2 font-semibold">Tầng {floor}</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            {byFloor.get(floor)!.map((u) => {
              const lease = getActiveLease(u.leases);
              const occupied = u.status === "occupied";
              return (
                <Link key={u.id} href={`/phong/${u.id}`}
                  className="rounded-lg border bg-white p-3 hover:shadow">
                  <div className="font-medium">{u.name}</div>
                  <div className={`text-xs ${occupied ? "text-green-600" : "text-gray-400"}`}>
                    {occupied ? "Đang thuê" : "Trống"}
                  </div>
                  {lease && <div className="mt-1 text-sm">{lease.tenant.fullName}</div>}
                  {lease && <div className="text-xs text-gray-500">{formatVND(lease.agreedRent)}</div>}
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Build the room detail page**

Create `app/(app)/phong/[id]/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatVND } from "@/lib/format";
import { getActiveLease } from "@/lib/rooms";

export default async function RoomDetailPage({ params }: { params: { id: string } }) {
  const unit = await db.unit.findUnique({
    where: { id: params.id },
    include: {
      serviceItems: true,
      leases: { include: { tenant: true }, orderBy: { startDate: "desc" } },
    },
  });
  if (!unit) notFound();

  const lease = getActiveLease(unit.leases);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">{unit.name}</h1>
      <p className="mb-4 text-sm text-gray-500">
        Tầng {unit.floor} · {unit.type === "room" ? "Phòng ở" : "Mặt bằng"} ·{" "}
        {unit.status === "occupied" ? "Đang thuê" : "Trống"}
      </p>

      <section className="mb-6">
        <h2 className="mb-2 font-semibold">Khách thuê hiện tại</h2>
        {lease ? (
          <div className="rounded border bg-white p-3">
            <div>{lease.tenant.fullName} · {lease.tenant.phone}</div>
            <div className="text-sm text-gray-500">Giá thuê: {formatVND(lease.agreedRent)}</div>
          </div>
        ) : (
          <p className="text-sm text-gray-400">Chưa có khách thuê.</p>
        )}
      </section>

      <section>
        <h2 className="mb-2 font-semibold">Dịch vụ</h2>
        {unit.serviceItems.length === 0 ? (
          <p className="text-sm text-gray-400">Chưa cấu hình dịch vụ.</p>
        ) : (
          <ul className="rounded border bg-white">
            {unit.serviceItems.map((s) => (
              <li key={s.id} className="flex justify-between border-b px-3 py-2 last:border-0">
                <span>{s.name} ({s.measureUnit})</span>
                <span>{formatVND(s.defaultPrice)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 7: Manually verify**

Run `npm run dev`, log in, visit `/phong`. Expect floors 1–3 with 5 rooms each plus the gym. Click a room → detail page renders. Stop the server.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: rooms list and detail pages"
```

---

### Task 3: Service-item configuration per room

**Files:**
- Create: `lib/service-schema.ts`, `app/(app)/phong/[id]/service-actions.ts`, `app/(app)/phong/[id]/service-editor.tsx`
- Modify: `app/(app)/phong/[id]/page.tsx` (mount the editor)
- Test: `lib/service-schema.test.ts`

**Interfaces:**
- Consumes: `db`, `formatVND`.
- Produces:
  - `serviceItemSchema` (zod) validating `{ name: string(min 1), measureUnit: string(min 1), defaultPrice: int >= 0 }`.
  - Server actions `addServiceItem(unitId, formData)` and `deleteServiceItem(id, unitId)`, both calling `revalidatePath`.
  - Plan 3's bill generator reads `unit.serviceItems` produced here.

- [ ] **Step 1: Write the failing schema test**

Create `lib/service-schema.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { serviceItemSchema } from "@/lib/service-schema";

describe("serviceItemSchema", () => {
  it("accepts a valid item", () => {
    const r = serviceItemSchema.safeParse({ name: "Internet", measureUnit: "phòng", defaultPrice: 100000 });
    expect(r.success).toBe(true);
  });
  it("rejects an empty name", () => {
    expect(serviceItemSchema.safeParse({ name: "", measureUnit: "phòng", defaultPrice: 0 }).success).toBe(false);
  });
  it("rejects a negative price", () => {
    expect(serviceItemSchema.safeParse({ name: "X", measureUnit: "phòng", defaultPrice: -1 }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- service-schema`
Expected: FAIL — cannot resolve `@/lib/service-schema`.

- [ ] **Step 3: Implement the schema**

Create `lib/service-schema.ts`:
```typescript
import { z } from "zod";

export const serviceItemSchema = z.object({
  name: z.string().min(1),
  measureUnit: z.string().min(1),
  defaultPrice: z.number().int().min(0),
});

export type ServiceItemInput = z.infer<typeof serviceItemSchema>;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- service-schema`
Expected: PASS (3 tests).

- [ ] **Step 5: Write the server actions**

Create `app/(app)/phong/[id]/service-actions.ts`:
```typescript
"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { serviceItemSchema } from "@/lib/service-schema";

export async function addServiceItem(unitId: string, formData: FormData) {
  const parsed = serviceItemSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    measureUnit: String(formData.get("measureUnit") ?? ""),
    defaultPrice: Number(formData.get("defaultPrice") ?? 0),
  });
  if (!parsed.success) return { error: "Dữ liệu không hợp lệ" };
  await db.serviceItem.create({ data: { unitId, ...parsed.data } });
  revalidatePath(`/phong/${unitId}`);
  return { ok: true };
}

export async function deleteServiceItem(id: string, unitId: string) {
  await db.serviceItem.delete({ where: { id } });
  revalidatePath(`/phong/${unitId}`);
  return { ok: true };
}
```

- [ ] **Step 6: Build the editor component**

Create `app/(app)/phong/[id]/service-editor.tsx`:
```tsx
"use client";

import { useState } from "react";
import { formatVND } from "@/lib/format";
import { addServiceItem, deleteServiceItem } from "./service-actions";

type Item = { id: string; name: string; measureUnit: string; defaultPrice: number };

export function ServiceEditor({ unitId, items }: { unitId: string; items: Item[] }) {
  const [error, setError] = useState("");

  async function onAdd(formData: FormData) {
    setError("");
    const res = await addServiceItem(unitId, formData);
    if (res?.error) setError(res.error);
  }

  return (
    <div>
      <ul className="mb-3 rounded border bg-white">
        {items.map((s) => (
          <li key={s.id} className="flex items-center justify-between border-b px-3 py-2 last:border-0">
            <span>{s.name} ({s.measureUnit}) — {formatVND(s.defaultPrice)}</span>
            <button onClick={() => deleteServiceItem(s.id, unitId)}
              className="text-sm text-red-600 hover:underline">Xóa</button>
          </li>
        ))}
        {items.length === 0 && <li className="px-3 py-2 text-sm text-gray-400">Chưa có dịch vụ.</li>}
      </ul>
      <form action={onAdd} className="flex flex-wrap gap-2">
        <input name="name" placeholder="Tên dịch vụ" required className="rounded border px-2 py-1" />
        <input name="measureUnit" placeholder="Đơn vị (phòng/người/xe)" required className="rounded border px-2 py-1" />
        <input name="defaultPrice" type="number" min="0" placeholder="Đơn giá" required className="w-32 rounded border px-2 py-1" />
        <button className="rounded bg-blue-600 px-3 py-1 text-white">Thêm</button>
      </form>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 7: Mount the editor in the detail page**

In `app/(app)/phong/[id]/page.tsx`, replace the read-only "Dịch vụ" `<section>` body with:
```tsx
import { ServiceEditor } from "./service-editor";
// ...
      <section>
        <h2 className="mb-2 font-semibold">Dịch vụ</h2>
        <ServiceEditor unitId={unit.id} items={unit.serviceItems} />
      </section>
```

- [ ] **Step 8: Manually verify**

Run `npm run dev`, open a room, add a service ("Internet / phòng / 100000"), see it listed, delete it. Stop the server.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: per-room service item configuration"
```

---

### Task 4: Tenant CRUD + ID-card photo upload

**Files:**
- Create: `lib/tenant-schema.ts`, `app/(app)/khach-thue/page.tsx`, `app/(app)/khach-thue/tenant-actions.ts`, `app/(app)/khach-thue/tenant-form.tsx`, `app/(app)/khach-thue/new/page.tsx`, `app/(app)/khach-thue/[id]/page.tsx`
- Test: `lib/tenant-schema.test.ts`

**Interfaces:**
- Consumes: `db`, the `POST /api/upload` route (Task 1).
- Produces:
  - `tenantSchema` (zod): `fullName` and `phone` required; `idCardNumber`, `idCardFrontImageUrl`, `idCardBackImageUrl`, `vehiclePlate`, `zaloId`, `notes` optional.
  - Server actions `createTenant(formData)` and `updateTenant(id, formData)`.
  - Plan 5's lease form (Task 5) lists tenants created here.

- [ ] **Step 1: Write the failing schema test**

Create `lib/tenant-schema.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { tenantSchema } from "@/lib/tenant-schema";

describe("tenantSchema", () => {
  it("accepts name + phone only", () => {
    expect(tenantSchema.safeParse({ fullName: "Nguyễn Văn A", phone: "0900000000" }).success).toBe(true);
  });
  it("rejects a missing name", () => {
    expect(tenantSchema.safeParse({ fullName: "", phone: "0900000000" }).success).toBe(false);
  });
  it("coerces empty optional strings to undefined", () => {
    const r = tenantSchema.parse({ fullName: "A", phone: "1", vehiclePlate: "" });
    expect(r.vehiclePlate).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tenant-schema`
Expected: FAIL — cannot resolve `@/lib/tenant-schema`.

- [ ] **Step 3: Implement the schema**

Create `lib/tenant-schema.ts`:
```typescript
import { z } from "zod";

const optionalStr = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().optional(),
);

export const tenantSchema = z.object({
  fullName: z.string().min(1),
  phone: z.string().min(1),
  idCardNumber: optionalStr,
  idCardFrontImageUrl: optionalStr,
  idCardBackImageUrl: optionalStr,
  vehiclePlate: optionalStr,
  zaloId: optionalStr,
  notes: optionalStr,
});

export type TenantInput = z.infer<typeof tenantSchema>;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- tenant-schema`
Expected: PASS (3 tests).

- [ ] **Step 5: Write the tenant server actions**

Create `app/(app)/khach-thue/tenant-actions.ts`:
```typescript
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { tenantSchema } from "@/lib/tenant-schema";

function parse(formData: FormData) {
  return tenantSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    idCardNumber: formData.get("idCardNumber"),
    idCardFrontImageUrl: formData.get("idCardFrontImageUrl"),
    idCardBackImageUrl: formData.get("idCardBackImageUrl"),
    vehiclePlate: formData.get("vehiclePlate"),
    zaloId: formData.get("zaloId"),
    notes: formData.get("notes"),
  });
}

export async function createTenant(formData: FormData) {
  const parsed = parse(formData);
  if (!parsed.success) return { error: "Dữ liệu không hợp lệ" };
  await db.tenant.create({ data: parsed.data });
  revalidatePath("/khach-thue");
  redirect("/khach-thue");
}

export async function updateTenant(id: string, formData: FormData) {
  const parsed = parse(formData);
  if (!parsed.success) return { error: "Dữ liệu không hợp lệ" };
  await db.tenant.update({ where: { id }, data: parsed.data });
  revalidatePath("/khach-thue");
  redirect(`/khach-thue/${id}`);
}
```

- [ ] **Step 6: Build the tenant form (with image upload)**

Create `app/(app)/khach-thue/tenant-form.tsx`:
```tsx
"use client";

import { useState } from "react";

type Tenant = {
  id?: string;
  fullName?: string; phone?: string; idCardNumber?: string | null;
  idCardFrontImageUrl?: string | null; idCardBackImageUrl?: string | null;
  vehiclePlate?: string | null; zaloId?: string | null; notes?: string | null;
};

async function uploadImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  if (!res.ok) throw new Error("upload failed");
  return (await res.json()).url as string;
}

export function TenantForm({
  tenant, action,
}: { tenant?: Tenant; action: (fd: FormData) => Promise<{ error?: string } | void> }) {
  const [front, setFront] = useState(tenant?.idCardFrontImageUrl ?? "");
  const [back, setBack] = useState(tenant?.idCardBackImageUrl ?? "");
  const [error, setError] = useState("");

  async function onSubmit(formData: FormData) {
    setError("");
    formData.set("idCardFrontImageUrl", front);
    formData.set("idCardBackImageUrl", back);
    const res = await action(formData);
    if (res?.error) setError(res.error);
  }

  return (
    <form action={onSubmit} className="max-w-lg space-y-3">
      <input name="fullName" defaultValue={tenant?.fullName ?? ""} placeholder="Họ tên" required className="w-full rounded border px-3 py-2" />
      <input name="phone" defaultValue={tenant?.phone ?? ""} placeholder="Số điện thoại" required className="w-full rounded border px-3 py-2" />
      <input name="idCardNumber" defaultValue={tenant?.idCardNumber ?? ""} placeholder="Số CCCD/CMND" className="w-full rounded border px-3 py-2" />
      <input name="vehiclePlate" defaultValue={tenant?.vehiclePlate ?? ""} placeholder="Biển số xe" className="w-full rounded border px-3 py-2" />
      <input name="zaloId" defaultValue={tenant?.zaloId ?? ""} placeholder="Zalo ID" className="w-full rounded border px-3 py-2" />
      <textarea name="notes" defaultValue={tenant?.notes ?? ""} placeholder="Ghi chú" className="w-full rounded border px-3 py-2" />

      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          Ảnh CCCD mặt trước
          <input type="file" accept="image/*" className="mt-1 block"
            onChange={async (e) => e.target.files?.[0] && setFront(await uploadImage(e.target.files[0]))} />
          {front && <img src={front} alt="mặt trước" className="mt-1 h-24 rounded border object-cover" />}
        </label>
        <label className="text-sm">
          Ảnh CCCD mặt sau
          <input type="file" accept="image/*" className="mt-1 block"
            onChange={async (e) => e.target.files?.[0] && setBack(await uploadImage(e.target.files[0]))} />
          {back && <img src={back} alt="mặt sau" className="mt-1 h-24 rounded border object-cover" />}
        </label>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="rounded bg-blue-600 px-4 py-2 text-white">Lưu</button>
    </form>
  );
}
```

- [ ] **Step 7: Build the list, new, and detail pages**

Create `app/(app)/khach-thue/page.tsx`:
```tsx
import Link from "next/link";
import { db } from "@/lib/db";

export default async function TenantsPage() {
  const tenants = await db.tenant.findMany({ orderBy: { fullName: "asc" } });
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Khách thuê</h1>
        <Link href="/khach-thue/new" className="rounded bg-blue-600 px-3 py-2 text-white">+ Thêm khách</Link>
      </div>
      <ul className="rounded border bg-white">
        {tenants.map((t) => (
          <li key={t.id} className="border-b last:border-0">
            <Link href={`/khach-thue/${t.id}`} className="flex justify-between px-3 py-2 hover:bg-gray-50">
              <span>{t.fullName}</span>
              <span className="text-sm text-gray-500">{t.phone}</span>
            </Link>
          </li>
        ))}
        {tenants.length === 0 && <li className="px-3 py-2 text-sm text-gray-400">Chưa có khách thuê.</li>}
      </ul>
    </div>
  );
}
```

Create `app/(app)/khach-thue/new/page.tsx`:
```tsx
import { TenantForm } from "../tenant-form";
import { createTenant } from "../tenant-actions";

export default function NewTenantPage() {
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Thêm khách thuê</h1>
      <TenantForm action={createTenant} />
    </div>
  );
}
```

Create `app/(app)/khach-thue/[id]/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { TenantForm } from "../tenant-form";
import { updateTenant } from "../tenant-actions";

export default async function TenantDetailPage({ params }: { params: { id: string } }) {
  const tenant = await db.tenant.findUnique({ where: { id: params.id } });
  if (!tenant) notFound();
  const action = updateTenant.bind(null, tenant.id);
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{tenant.fullName}</h1>
      <TenantForm tenant={tenant} action={action} />
    </div>
  );
}
```

- [ ] **Step 8: Manually verify**

Run `npm run dev`. Go to `/khach-thue` → "+ Thêm khách". Fill name + phone, upload a front and back image (previews appear), save. Tenant appears in the list; open it, confirm images render and edits persist. Stop the server.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: tenant CRUD with ID-card photo upload"
```

---

### Task 5: Lease assignment + deposit + unit-status sync

**Files:**
- Create: `lib/lease-schema.ts`, `app/(app)/phong/[id]/lease-actions.ts`, `app/(app)/phong/[id]/lease-panel.tsx`
- Modify: `app/(app)/phong/[id]/page.tsx` (mount the lease panel)
- Test: `lib/lease-schema.test.ts`

**Interfaces:**
- Consumes: `db`, `getActiveLease` (`@/lib/rooms`), tenants from Task 4.
- Produces:
  - `leaseSchema` (zod): `tenantId` required; `startDate` required ISO date; `agreedRent` int >= 0; `billingCycle` enum; `depositAmount` int >= 0; optional `depositCollectedAt`, `depositCollectedBy`.
  - Server actions `createLease(unitId, formData)` (sets `unit.status = occupied`) and `endLease(leaseId, unitId, endDate)` (sets `unit.status = vacant`).
  - Plan 3's bill generator reads the active lease produced here.

- [ ] **Step 1: Write the failing schema test**

Create `lib/lease-schema.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { leaseSchema } from "@/lib/lease-schema";

describe("leaseSchema", () => {
  it("accepts a minimal valid lease", () => {
    const r = leaseSchema.safeParse({
      tenantId: "t1", startDate: "2026-06-01", agreedRent: 4800000,
      billingCycle: "monthly", depositAmount: 4800000,
    });
    expect(r.success).toBe(true);
  });
  it("rejects a missing tenant", () => {
    expect(leaseSchema.safeParse({
      tenantId: "", startDate: "2026-06-01", agreedRent: 0, billingCycle: "monthly", depositAmount: 0,
    }).success).toBe(false);
  });
  it("rejects an invalid billing cycle", () => {
    expect(leaseSchema.safeParse({
      tenantId: "t1", startDate: "2026-06-01", agreedRent: 0, billingCycle: "weekly", depositAmount: 0,
    }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- lease-schema`
Expected: FAIL — cannot resolve `@/lib/lease-schema`.

- [ ] **Step 3: Implement the schema**

Create `lib/lease-schema.ts`:
```typescript
import { z } from "zod";

export const leaseSchema = z.object({
  tenantId: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().optional(),
  ),
  agreedRent: z.number().int().min(0),
  billingCycle: z.enum(["monthly", "quarterly", "custom"]),
  depositAmount: z.number().int().min(0),
  depositCollectedAt: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().optional(),
  ),
  depositCollectedBy: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().optional(),
  ),
});

export type LeaseInput = z.infer<typeof leaseSchema>;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- lease-schema`
Expected: PASS (3 tests).

- [ ] **Step 5: Write the lease server actions**

Create `app/(app)/phong/[id]/lease-actions.ts`:
```typescript
"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { leaseSchema } from "@/lib/lease-schema";

export async function createLease(unitId: string, formData: FormData) {
  const parsed = leaseSchema.safeParse({
    tenantId: formData.get("tenantId"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    agreedRent: Number(formData.get("agreedRent") ?? 0),
    billingCycle: formData.get("billingCycle"),
    depositAmount: Number(formData.get("depositAmount") ?? 0),
    depositCollectedAt: formData.get("depositCollectedAt"),
    depositCollectedBy: formData.get("depositCollectedBy"),
  });
  if (!parsed.success) return { error: "Dữ liệu không hợp lệ" };
  const d = parsed.data;

  await db.$transaction([
    db.lease.create({
      data: {
        unitId,
        tenantId: d.tenantId,
        startDate: new Date(d.startDate),
        endDate: d.endDate ? new Date(d.endDate) : null,
        agreedRent: d.agreedRent,
        billingCycle: d.billingCycle,
        depositAmount: d.depositAmount,
        depositCollectedAt: d.depositCollectedAt ? new Date(d.depositCollectedAt) : null,
        depositCollectedBy: d.depositCollectedBy ?? null,
      },
    }),
    db.unit.update({ where: { id: unitId }, data: { status: "occupied" } }),
  ]);

  revalidatePath(`/phong/${unitId}`);
  return { ok: true };
}

export async function endLease(leaseId: string, unitId: string, endDate: string) {
  await db.$transaction([
    db.lease.update({ where: { id: leaseId }, data: { endDate: new Date(endDate) } }),
    db.unit.update({ where: { id: unitId }, data: { status: "vacant" } }),
  ]);
  revalidatePath(`/phong/${unitId}`);
  return { ok: true };
}
```

- [ ] **Step 6: Build the lease panel**

Create `app/(app)/phong/[id]/lease-panel.tsx`:
```tsx
"use client";

import { useState } from "react";
import { formatVND } from "@/lib/format";
import { createLease, endLease } from "./lease-actions";

type Tenant = { id: string; fullName: string };
type ActiveLease = {
  id: string; agreedRent: number; depositAmount: number;
  startDate: string; tenant: { fullName: string };
} | null;

export function LeasePanel({
  unitId, tenants, activeLease,
}: { unitId: string; tenants: Tenant[]; activeLease: ActiveLease }) {
  const [error, setError] = useState("");

  if (activeLease) {
    return (
      <div className="rounded border bg-white p-3">
        <div>{activeLease.tenant.fullName}</div>
        <div className="text-sm text-gray-500">
          Giá thuê {formatVND(activeLease.agreedRent)} · Cọc {formatVND(activeLease.depositAmount)}
        </div>
        <form action={(fd) => endLease(activeLease.id, unitId, String(fd.get("endDate")))}
          className="mt-2 flex items-center gap-2">
          <input name="endDate" type="date" required className="rounded border px-2 py-1" />
          <button className="rounded bg-red-600 px-3 py-1 text-white">Kết thúc hợp đồng</button>
        </form>
      </div>
    );
  }

  async function onCreate(formData: FormData) {
    setError("");
    const res = await createLease(unitId, formData);
    if (res?.error) setError(res.error);
  }

  return (
    <form action={onCreate} className="max-w-md space-y-2 rounded border bg-white p-3">
      <select name="tenantId" required className="w-full rounded border px-2 py-1">
        <option value="">— Chọn khách thuê —</option>
        {tenants.map((t) => <option key={t.id} value={t.id}>{t.fullName}</option>)}
      </select>
      <label className="block text-sm">Ngày bắt đầu
        <input name="startDate" type="date" required className="w-full rounded border px-2 py-1" />
      </label>
      <input name="agreedRent" type="number" min="0" placeholder="Giá thuê / kỳ" required className="w-full rounded border px-2 py-1" />
      <select name="billingCycle" className="w-full rounded border px-2 py-1">
        <option value="monthly">Theo tháng</option>
        <option value="quarterly">Theo quý</option>
        <option value="custom">Tùy chỉnh</option>
      </select>
      <input name="depositAmount" type="number" min="0" placeholder="Tiền cọc" required className="w-full rounded border px-2 py-1" />
      <label className="block text-sm">Ngày nhận cọc
        <input name="depositCollectedAt" type="date" className="w-full rounded border px-2 py-1" />
      </label>
      <input name="depositCollectedBy" placeholder="Người nhận cọc" className="w-full rounded border px-2 py-1" />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="rounded bg-blue-600 px-4 py-2 text-white">Tạo hợp đồng</button>
    </form>
  );
}
```

- [ ] **Step 7: Mount the panel in the room detail page**

In `app/(app)/phong/[id]/page.tsx`, replace the "Khách thuê hiện tại" `<section>` body with the panel, loading all tenants:
```tsx
import { LeasePanel } from "./lease-panel";
// inside the component, after `const lease = getActiveLease(unit.leases);`
  const tenants = await db.tenant.findMany({ orderBy: { fullName: "asc" }, select: { id: true, fullName: true } });
  const activeLease = lease
    ? {
        id: lease.id, agreedRent: lease.agreedRent, depositAmount: lease.depositAmount,
        startDate: lease.startDate.toISOString(), tenant: { fullName: lease.tenant.fullName },
      }
    : null;
// ...
      <section className="mb-6">
        <h2 className="mb-2 font-semibold">Khách thuê hiện tại</h2>
        <LeasePanel unitId={unit.id} tenants={tenants} activeLease={activeLease} />
      </section>
```

- [ ] **Step 8: Manually verify the status sync**

Run `npm run dev`. Open a vacant room → create a lease for a tenant. The room status flips to "Đang thuê", and it shows green on `/phong`. End the lease with a date → status flips back to "Trống". Stop the server.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: lease assignment with deposit and unit-status sync"
```

---

## Self-Review

**Spec coverage (Plan 2 portion):** Rooms list with status/floor/tenant/rent — Task 2 ✓. Room detail with lease info + editable service items — Tasks 2–3 ✓. Tenant add/edit with all fields + ID front/back photo upload — Task 4 ✓. Link tenant to unit via lease, deposit (amount/date/collected-by) — Task 5 ✓. Past tenants visible (leases ordered, list shows all tenants) ✓.

**Placeholder scan:** No TBDs; every code step is complete and runnable. The "modify page" steps (3.7, 5.7) quote the exact replacement JSX.

**Type consistency:** `getActiveLease`/`groupUnitsByFloor` defined in Task 2, reused in Tasks 2 & 5 ✓. `measureUnit` used consistently (schema, action, editor, detail render) ✓. Upload `url` returned by Task 1's route is consumed by Task 4's form ✓. `serviceItemSchema`, `tenantSchema`, `leaseSchema` each defined before use ✓. Server-action return shape `{ error?: string } | { ok: true }` is consistent across panels.

**Note:** `createLease` allows assigning to a unit that already has an active lease only via the UI gate (panel shows the end form instead of the create form when occupied). A future hardening pass could enforce this at the action level; deferred as out of scope for phase 1.

---

**Carries into Plan 3:** bill generation reads `unit.serviceItems` (Task 3) and the active `Lease` (Task 5); `formatVND` and the `/api/upload` route are reused for receipt screenshots.
