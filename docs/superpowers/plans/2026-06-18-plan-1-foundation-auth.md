# Plan 1 — Foundation & Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Next.js project with the complete database schema, a seeded set of 16 units, single-admin authentication, and a Vietnamese app shell — the foundation every later plan builds on.

**Architecture:** Next.js 14 App Router monolith with TypeScript and Tailwind. SQLite (a local file) accessed through Prisma. The entire data model (all entities from the spec) is defined once here so later plans add features against existing tables rather than churning migrations. Auth is Auth.js v5 (next-auth) credentials with a single admin account. Pure logic is unit-tested with Vitest; the app shell gets a Playwright smoke test.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Prisma, SQLite, Auth.js v5 (next-auth), bcryptjs, zod, Vitest, Playwright.

> **DB note (phase 1):** SQLite is used for zero-infrastructure local running (the DB is just a file). Prisma does not support `enum` types on SQLite, so all enum-like columns are plain `String` with their allowed values documented in comments; the application already uses string literals everywhere, so no app code changes. If the family later deploys to a server and wants PostgreSQL, switch the datasource `provider` to `postgresql`, restore the enum blocks, and re-migrate — no business-logic changes needed.

## Global Constraints

- Framework: Next.js 14 with App Router (not Pages Router).
- Language: TypeScript everywhere; no plain `.js` source files.
- All user-facing UI copy is in Vietnamese.
- ORM: Prisma; never write raw SQL in application code.
- Database: SQLite (file-based, via Prisma). No Prisma `enum` types — use `String` columns with allowed values noted in comments.
- Auth: Auth.js v5 credentials provider; one `admin` role for phase 1.
- Money is stored as integers in Vietnamese đồng (no decimals, no cents).
- Every secret (DB URL, auth secret, Zalo tokens) comes from environment variables, never hardcoded.

---

### Task 1: Scaffold Next.js + Tailwind + Vitest

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `vitest.config.ts`, `lib/format.ts`, `.env.example`, `.gitignore`
- Test: `lib/format.test.ts`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: `formatVND(amount: number): string` returning a đồng-formatted string (e.g. `formatVND(4800000)` → `"4.800.000 ₫"`). Used by every later UI task.

- [ ] **Step 1: Initialize the project**

Run (pin to Next 14 — the spec's approved version; `@latest` pulls Next 16 whose Promise-based route `params` and Tailwind v4 config break the idioms used throughout Plans 2–7):
```bash
npx create-next-app@14 . --typescript --tailwind --app --eslint --src-dir=false --import-alias="@/*"
```
Notes:
- `--no-turbopack` is not a valid flag on create-next-app@14; omit it.
- npm rejects capital letters in a package name, and create-next-app derives the name from the directory (`Project`). If it refuses, scaffold into a temp dir with an explicit lowercase name (`npx create-next-app@14 quan-ly-nha-tro --typescript --tailwind --app --eslint --src-dir=false --import-alias="@/*"`) then move its contents into `G:/Project`, preserving the existing `docs/` folder.
- create-next-app@14 produces `next.config.mjs`, `tailwind.config.ts`, and Tailwind v3 (`@tailwind base/components/utilities` in `globals.css`) — these match the rest of the plan. Delete any generated `app/page.tsx` default content later as the plan directs.

- [ ] **Step 2: Add testing + utility dependencies**

Run:
```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
npm install zod
```

- [ ] **Step 3: Create `vitest.config.ts`**

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
```

- [ ] **Step 4: Add the `test` script to `package.json`**

In the `"scripts"` block add:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Write the failing test for `formatVND`**

Create `lib/format.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { formatVND } from "@/lib/format";

describe("formatVND", () => {
  it("formats a whole đồng amount with thousands separators", () => {
    expect(formatVND(4800000)).toBe("4.800.000 ₫");
  });

  it("formats zero", () => {
    expect(formatVND(0)).toBe("0 ₫");
  });

  it("formats a small amount", () => {
    expect(formatVND(100)).toBe("100 ₫");
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `npm test -- format`
Expected: FAIL — cannot resolve `@/lib/format`.

- [ ] **Step 7: Implement `lib/format.ts`**

```typescript
export function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN").format(amount) + " ₫";
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `npm test -- format`
Expected: PASS (3 tests).

- [ ] **Step 9: Create `.env.example`**

```bash
DATABASE_URL="file:./dev.db"
AUTH_SECRET="generate-with-openssl-rand-base64-32"
```

- [ ] **Step 10: Verify `.gitignore` ignores secrets and build output**

Confirm `.gitignore` contains `.env`, `.env.local`, `/node_modules`, `/.next`. Add any that are missing.

- [ ] **Step 11: Commit**

```bash
git init
git add -A
git commit -m "chore: scaffold Next.js app with Tailwind, Vitest, and VND formatter"
```

---

### Task 2: Prisma setup + complete schema

**Files:**
- Create: `prisma/schema.prisma`, `lib/db.ts`
- Test: `lib/db.test.ts`

**Interfaces:**
- Consumes: nothing from prior tasks.
- Produces: a singleton Prisma client exported as `db` from `lib/db.ts`, and the full set of models (`Unit`, `ServiceItem`, `Tenant`, `Lease`, `Bill`, `Payment`, `Expense`, `MaintenanceSchedule`, `MaintenanceLog`, `User`) with the enums `UnitType`, `UnitStatus`, `BillingCycle`, `BillStatus`, `PaymentMethod`, `Role`. Every later plan imports `db` and these models.

- [ ] **Step 1: Install Prisma**

Run:
```bash
npm install -D prisma
npm install @prisma/client
npx prisma init --datasource-provider sqlite
```

- [ ] **Step 2: Write the complete schema**

Replace `prisma/schema.prisma` with:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// NOTE: SQLite does not support Prisma `enum` types, so the following columns
// are plain `String`. Allowed values (enforced in the app via zod schemas):
//   Unit.type:           "room" | "commercial"
//   Unit.status:         "occupied" | "vacant"
//   Lease.billingCycle:  "monthly" | "quarterly" | "custom"
//   Bill.status:         "unpaid" | "paid" | "overdue"
//   Payment.method:      "cash" | "bank_transfer"
//   User.role:           "admin"

model Unit {
  id           String        @id @default(cuid())
  name         String
  floor        Int
  type         String
  baseRent     Int
  status       String        @default("vacant")
  serviceItems ServiceItem[]
  leases       Lease[]
  maintenance  MaintenanceSchedule[]
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
}

model ServiceItem {
  id           String  @id @default(cuid())
  unit         Unit    @relation(fields: [unitId], references: [id], onDelete: Cascade)
  unitId       String
  name         String
  measureUnit  String
  defaultPrice Int
}

model Tenant {
  id                  String   @id @default(cuid())
  fullName            String
  phone               String
  idCardNumber        String?
  idCardFrontImageUrl String?
  idCardBackImageUrl  String?
  vehiclePlate        String?
  zaloId              String?
  notes               String?
  leases              Lease[]
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}

model Lease {
  id                String       @id @default(cuid())
  unit              Unit         @relation(fields: [unitId], references: [id])
  unitId            String
  tenant            Tenant       @relation(fields: [tenantId], references: [id])
  tenantId          String
  startDate         DateTime
  endDate           DateTime?
  agreedRent        Int
  billingCycle      String       @default("monthly")
  depositAmount     Int          @default(0)
  depositCollectedAt DateTime?
  depositCollectedBy String?
  bills             Bill[]
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt
}

model Bill {
  id                String     @id @default(cuid())
  lease             Lease      @relation(fields: [leaseId], references: [id])
  leaseId           String
  periodLabel       String
  dueDate           DateTime
  status            String     @default("unpaid")
  lineItems         Json
  electricityAmount Int        @default(0)
  waterAmount       Int        @default(0)
  subtotal          Int        @default(0)
  grandTotal        Int        @default(0)
  payments          Payment[]
  createdAt         DateTime   @default(now())
  updatedAt         DateTime   @updatedAt
}

model Payment {
  id              String        @id @default(cuid())
  bill            Bill          @relation(fields: [billId], references: [id])
  billId          String
  amount          Int
  paidAt          DateTime
  method          String
  confirmedBy     String?
  notes           String?
  receiptImageUrl String?
  createdAt       DateTime      @default(now())
}

model Expense {
  id          String   @id @default(cuid())
  date        DateTime
  description String
  category    String
  amount      Int
  createdAt   DateTime @default(now())
}

model MaintenanceSchedule {
  id           String            @id @default(cuid())
  name         String
  scope        String
  unit         Unit?             @relation(fields: [unitId], references: [id])
  unitId       String?
  intervalDays Int
  lastDoneAt   DateTime?
  nextDueAt    DateTime
  notes        String?
  logs         MaintenanceLog[]
  createdAt    DateTime          @default(now())
  updatedAt    DateTime          @updatedAt
}

model MaintenanceLog {
  id         String              @id @default(cuid())
  schedule   MaintenanceSchedule @relation(fields: [scheduleId], references: [id], onDelete: Cascade)
  scheduleId String
  doneAt     DateTime
  notes      String?
}

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  role         String   @default("admin")
  createdAt    DateTime @default(now())
}

model Setting {
  id              String  @id @default("singleton")
  bankAccountName String?
  bankAccountNo   String?
  bankName        String?
  qrImageUrl      String?
  invoiceNotes    String?
  adminZaloUserId String?
}
```

Note: `Setting` is included now (single-row config table) so Plan 7's settings page and Plan 6's Zalo dispatch have a home. `measureUnit` is used instead of `unit` for the ServiceItem field name to avoid colliding with the `Unit` relation.

Fallback: if `prisma migrate dev` rejects the `Json` type on SQLite in the installed Prisma version, change `lineItems Json` to `lineItems String`, then in Plan 3 `JSON.stringify(lineItems)` on write and `JSON.parse(bill.lineItems)` on read (instead of the direct cast). Report this as a DONE_WITH_CONCERNS so the controller can propagate the parse/stringify into Plan 3.

- [ ] **Step 3: Create the database and run the first migration**

Ensure `DATABASE_URL="file:./dev.db"` is set in `.env` (no server needed — SQLite is a local file). Run:
```bash
npx prisma migrate dev --name init
```
Expected: migration applied, `prisma/dev.db` created, `node_modules/@prisma/client` generated.

- [ ] **Step 4: Write the Prisma singleton with a connectivity test**

Create `lib/db.ts`:
```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
```

- [ ] **Step 5: Write a smoke test that the client and a model exist**

Create `lib/db.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";

describe("db client", () => {
  it("exposes the Unit model", () => {
    expect(db.unit).toBeDefined();
  });

  it("exposes the Bill model", () => {
    expect(db.bill).toBeDefined();
  });
});
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm test -- db`
Expected: PASS (2 tests).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add complete Prisma schema and db client singleton"
```

---

### Task 3: Seed script — admin user + 16 units

**Files:**
- Create: `prisma/seed.ts`, `lib/auth-password.ts`
- Modify: `package.json` (add `prisma.seed` config and `db:seed` script)
- Test: `lib/auth-password.test.ts`

**Interfaces:**
- Consumes: `db` from `lib/db.ts`.
- Produces: `hashPassword(plain: string): Promise<string>` and `verifyPassword(plain: string, hash: string): Promise<boolean>` from `lib/auth-password.ts`, used by Task 4's auth config. After seeding: 16 `Unit` rows (15 rooms across floors 1–3 + 1 commercial gym on floor 1) and one admin `User`.

- [ ] **Step 1: Install bcryptjs and tsx**

Run:
```bash
npm install bcryptjs
npm install -D @types/bcryptjs tsx
```

- [ ] **Step 2: Write the failing password-helper test**

Create `lib/auth-password.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth-password";

describe("password helpers", () => {
  it("hashes then verifies the same password", async () => {
    const hash = await hashPassword("matkhau123");
    expect(hash).not.toBe("matkhau123");
    expect(await verifyPassword("matkhau123", hash)).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("matkhau123");
    expect(await verifyPassword("sai", hash)).toBe(false);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test -- auth-password`
Expected: FAIL — cannot resolve `@/lib/auth-password`.

- [ ] **Step 4: Implement `lib/auth-password.ts`**

```typescript
import bcrypt from "bcryptjs";

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- auth-password`
Expected: PASS (2 tests).

- [ ] **Step 6: Write the seed script**

Create `prisma/seed.ts`:
```typescript
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/auth-password";

const db = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@nhatro.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "doimatkhau";

  await db.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: { email: adminEmail, passwordHash: await hashPassword(adminPassword), role: "admin" },
  });

  // 15 rooms: floors 1-3, rooms x01..x05 per floor.
  for (const floor of [1, 2, 3]) {
    for (let n = 1; n <= 5; n++) {
      const name = `Phòng ${floor}0${n}`;
      const existing = await db.unit.findFirst({ where: { name } });
      if (!existing) {
        await db.unit.create({
          data: { name, floor, type: "room", baseRent: 0, status: "vacant" },
        });
      }
    }
  }

  // 1 commercial space (gym) on floor 1.
  const gymName = "Mặt bằng tầng 1 (Gym)";
  const gym = await db.unit.findFirst({ where: { name: gymName } });
  if (!gym) {
    await db.unit.create({
      data: { name: gymName, floor: 1, type: "commercial", baseRent: 0, status: "occupied" },
    });
  }

  // Settings singleton row.
  await db.setting.upsert({ where: { id: "singleton" }, update: {}, create: { id: "singleton" } });

  console.log("Seed complete: admin user + 16 units.");
}

main().finally(() => db.$disconnect());
```

- [ ] **Step 7: Register the seed command in `package.json`**

Add a top-level `"prisma"` block and a script:
```json
"prisma": { "seed": "tsx prisma/seed.ts" },
```
And in `"scripts"`:
```json
"db:seed": "tsx prisma/seed.ts"
```

- [ ] **Step 8: Run the seed and verify counts**

Run:
```bash
npm run db:seed
npx prisma studio
```
Expected: console prints "Seed complete: admin user + 16 units." In Studio, `Unit` has 16 rows, `User` has 1, `Setting` has 1. Close Studio when done.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: seed admin user and 16 units"
```

---

### Task 4: Admin authentication (Auth.js v5)

**Files:**
- Create: `auth.ts`, `app/api/auth/[...nextauth]/route.ts`, `app/login/page.tsx`, `app/login/login-form.tsx`, `middleware.ts`, `types/next-auth.d.ts`
- Test: `auth.test.ts`

**Interfaces:**
- Consumes: `db` (`lib/db.ts`), `verifyPassword` (`lib/auth-password.ts`).
- Produces: `auth()`, `signIn`, `signOut`, and `handlers` exported from `auth.ts`. `middleware.ts` redirects unauthenticated requests to `/login`. Every later page relies on this protection being in place.

- [ ] **Step 1: Install Auth.js v5**

Run:
```bash
npm install next-auth@beta
```

- [ ] **Step 2: Write the authorize-logic test**

Create `auth.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { authorizeCredentials } from "@/auth";

vi.mock("@/lib/db", () => ({
  db: { user: { findUnique: vi.fn() } },
}));

import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth-password";

describe("authorizeCredentials", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the user for valid credentials", async () => {
    const hash = await hashPassword("matkhau123");
    (db.user.findUnique as any).mockResolvedValue({
      id: "u1", email: "admin@nhatro.local", passwordHash: hash, role: "admin",
    });
    const user = await authorizeCredentials("admin@nhatro.local", "matkhau123");
    expect(user).toMatchObject({ id: "u1", email: "admin@nhatro.local" });
  });

  it("returns null for a wrong password", async () => {
    const hash = await hashPassword("matkhau123");
    (db.user.findUnique as any).mockResolvedValue({
      id: "u1", email: "admin@nhatro.local", passwordHash: hash, role: "admin",
    });
    expect(await authorizeCredentials("admin@nhatro.local", "sai")).toBeNull();
  });

  it("returns null for an unknown email", async () => {
    (db.user.findUnique as any).mockResolvedValue(null);
    expect(await authorizeCredentials("nobody@x.com", "x")).toBeNull();
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test -- auth`
Expected: FAIL — cannot resolve `authorizeCredentials` from `@/auth`.

- [ ] **Step 4: Implement `auth.ts`**

```typescript
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth-password";

export async function authorizeCredentials(email: string, password: string) {
  const user = await db.user.findUnique({ where: { email } });
  if (!user) return null;
  if (!(await verifyPassword(password, user.passwordHash))) return null;
  return { id: user.id, email: user.email, role: user.role };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (creds) => {
        if (!creds?.email || !creds?.password) return null;
        return authorizeCredentials(String(creds.email), String(creds.password));
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.role = (user as any).role;
      return token;
    },
    session({ session, token }) {
      if (session.user) (session.user as any).role = token.role;
      return session;
    },
  },
});
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- auth`
Expected: PASS (3 tests).

- [ ] **Step 6: Wire the route handler**

Create `app/api/auth/[...nextauth]/route.ts`:
```typescript
import { handlers } from "@/auth";
export const { GET, POST } = handlers;
```

- [ ] **Step 7: Add the session type augmentation**

Create `types/next-auth.d.ts`:
```typescript
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: { role: string } & DefaultSession["user"];
  }
}
```

- [ ] **Step 8: Add route-protecting middleware**

Create `middleware.ts`:
```typescript
import { auth } from "@/auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isLoginPage = req.nextUrl.pathname.startsWith("/login");
  if (!isLoggedIn && !isLoginPage) {
    return Response.redirect(new URL("/login", req.nextUrl));
  }
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
```

- [ ] **Step 9: Build the login page (Vietnamese)**

Create `app/login/page.tsx`:
```tsx
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow">
        <h1 className="mb-6 text-center text-xl font-bold">Quản Lý Nhà Trọ</h1>
        <LoginForm />
      </div>
    </main>
  );
}
```

Create `app/login/login-form.tsx`:
```tsx
"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      redirect: false,
    });
    if (res?.error) setError("Email hoặc mật khẩu không đúng.");
    else router.push("/");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input name="email" type="email" placeholder="Email" required
        className="w-full rounded border px-3 py-2" />
      <input name="password" type="password" placeholder="Mật khẩu" required
        className="w-full rounded border px-3 py-2" />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit"
        className="w-full rounded bg-blue-600 py-2 text-white hover:bg-blue-700">
        Đăng nhập
      </button>
    </form>
  );
}
```

- [ ] **Step 10: Manually verify the login flow**

Run `npm run dev`. Visit `http://localhost:3000` → expect redirect to `/login`. Log in with the seeded credentials (`admin@nhatro.local` / `doimatkhau`) → expect redirect to `/`. Stop the dev server.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: admin credentials auth with protected routes and login page"
```

---

### Task 5: App shell + Vietnamese navigation

**Files:**
- Create: `components/nav.tsx`, `components/sign-out-button.tsx`, `app/(app)/layout.tsx`, `app/(app)/page.tsx`
- Modify: `app/layout.tsx` (set lang + metadata), `app/page.tsx` (delete — replaced by route group)
- Test: `components/nav.test.tsx`, `e2e/smoke.spec.ts`

**Interfaces:**
- Consumes: `auth` (`auth.ts`), `signOut` (`auth.ts`).
- Produces: the authenticated app shell. Every later page is created under `app/(app)/` and inherits this nav + layout. `NAV_ITEMS` array exported from `components/nav.tsx` (`{ href, label }[]`) is the single source of truth for navigation; later plans append their routes here.

- [ ] **Step 1: Write the failing nav test**

Create `components/nav.test.tsx`:
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Nav, NAV_ITEMS } from "@/components/nav";

describe("Nav", () => {
  it("includes the dashboard and rooms links", () => {
    expect(NAV_ITEMS.some((i) => i.href === "/")).toBe(true);
    expect(NAV_ITEMS.some((i) => i.href === "/phong")).toBe(true);
  });

  it("renders Vietnamese labels", () => {
    render(<Nav />);
    expect(screen.getByText("Tổng quan")).toBeDefined();
    expect(screen.getByText("Phòng")).toBeDefined();
  });
});
```

Add to `vitest.config.ts` `test` block so jest-dom matchers load: create `vitest.setup.ts` with `import "@testing-library/jest-dom";` and set `setupFiles: ["./vitest.setup.ts"]` in the config.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- nav`
Expected: FAIL — cannot resolve `@/components/nav`.

- [ ] **Step 3: Implement the nav component**

Create `components/nav.tsx`:
```tsx
import Link from "next/link";

export const NAV_ITEMS: { href: string; label: string }[] = [
  { href: "/", label: "Tổng quan" },
  { href: "/phong", label: "Phòng" },
  { href: "/khach-thue", label: "Khách thuê" },
  { href: "/hoa-don", label: "Hóa đơn" },
  { href: "/so-sach", label: "Sổ sách" },
  { href: "/chi-tieu", label: "Chi tiêu" },
  { href: "/bao-tri", label: "Bảo trì" },
  { href: "/cai-dat", label: "Cài đặt" },
];

export function Nav() {
  return (
    <nav className="flex flex-col gap-1 p-4">
      {NAV_ITEMS.map((item) => (
        <Link key={item.href} href={item.href}
          className="rounded px-3 py-2 text-sm hover:bg-gray-100">
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- nav`
Expected: PASS (2 tests).

- [ ] **Step 5: Implement the sign-out button**

Create `components/sign-out-button.tsx`:
```tsx
"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button onClick={() => signOut({ callbackUrl: "/login" })}
      className="rounded px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50">
      Đăng xuất
    </button>
  );
}
```

- [ ] **Step 6: Build the authenticated layout**

Create `app/(app)/layout.tsx`:
```tsx
import { Nav } from "@/components/nav";
import { SignOutButton } from "@/components/sign-out-button";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r bg-white">
        <div className="border-b p-4 font-bold">Quản Lý Nhà Trọ</div>
        <Nav />
        <div className="p-4"><SignOutButton /></div>
      </aside>
      <main className="flex-1 bg-gray-50 p-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 7: Build a placeholder dashboard page**

Delete `app/page.tsx`. Create `app/(app)/page.tsx`:
```tsx
export default function DashboardPage() {
  return <h1 className="text-2xl font-bold">Tổng quan</h1>;
}
```

- [ ] **Step 8: Set the document language**

In `app/layout.tsx`, change `<html lang="en">` to `<html lang="vi">` and set the metadata title to `"Quản Lý Nhà Trọ"`.

- [ ] **Step 9: Add a Playwright smoke test**

Run:
```bash
npm install -D @playwright/test
npx playwright install chromium
```
Create `e2e/smoke.spec.ts`:
```typescript
import { test, expect } from "@playwright/test";

test("unauthenticated visit redirects to login", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByText("Quản Lý Nhà Trọ")).toBeVisible();
});
```
Create `playwright.config.ts`:
```typescript
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: "http://localhost:3000" },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000/login",
    reuseExistingServer: !process.env.CI,
  },
});
```

- [ ] **Step 10: Run the smoke test**

Run: `npx playwright test`
Expected: PASS (1 test). The dev server starts automatically.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: authenticated app shell with Vietnamese nav and smoke test"
```

---

## Self-Review

**Spec coverage (Plan 1 portion):** Stack (Next.js 14 / TS / PostgreSQL / Prisma / Auth.js) — Tasks 1–4 ✓. Complete data model (all 10 entities + Setting) — Task 2 ✓. 16 units seeded (15 rooms + 1 gym) — Task 3 ✓. Admin-only auth — Task 4 ✓. Vietnamese UI shell + all eight nav routes — Task 5 ✓. Feature pages (rooms, tenants, billing, ledger, expenses, maintenance, settings, dashboard content) are intentionally deferred to Plans 2–7; this plan only stubs their routes via `NAV_ITEMS`.

**Placeholder scan:** The dashboard page in Task 5 is a deliberate stub (real content arrives in Plan 7), not an unspecified placeholder — every step contains runnable code/commands. No TBDs.

**Type consistency:** `db` exported from `lib/db.ts` and consumed in Tasks 3–4 ✓. `hashPassword`/`verifyPassword` defined in Task 3, consumed in Task 4 ✓. `authorizeCredentials` defined and tested in Task 4 ✓. `NAV_ITEMS`/`Nav` defined in Task 5 ✓. ServiceItem field named `measureUnit` consistently (noted in Task 2 to avoid the `Unit` relation collision) — Plans 2–3 must use `measureUnit`.

---

**Note for later plans:** all feature pages go under `app/(app)/` to inherit the shell; append new routes to `NAV_ITEMS`; money is integer đồng; import `db` from `@/lib/db`; reuse `formatVND` from `@/lib/format`.
