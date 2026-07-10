# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm test             # Run all Vitest tests
npx vitest run path  # Run a single test file
npx prisma db push --accept-data-loss  # Sync local SQLite to current schema
npx prisma generate  # Regenerate Prisma client
npm run db:seed      # Seed admin user + sample rooms
```

After any schema or server-action change, restart the dev server (Next.js HMR doesn't always pick up server-side changes). The local DB uses `prisma db push`, never `prisma migrate dev`.

## Architecture

**Stack:** Next.js 14 App Router (pages router not used), Prisma 7 + SQLite (local) / Turso libSQL (production), Tailwind CSS, NextAuth v5 (Credentials), Zod, Vitest, Playwright.

**Dual database:** `lib/db.ts` creates a Prisma client with the `@prisma/adapter-libsql` adapter. The same codebase runs against a local `dev.db` file in dev and a remote Turso/libSQL database in production. `DATABASE_URL` switches between `file:./dev.db` (local) and `libsql://...` (Turso). `DATABASE_AUTH_TOKEN` is only needed for Turso.

**Money:** All amounts are integers in Vietnamese đồng (VND). Format with `formatVND()` from `lib/format.ts`. Never use floats for money.

**Schema enums:** SQLite doesn't support Prisma enums, so status/type columns are plain `String` validated by Zod schemas in the app layer. See the comment at the top of `prisma/schema.prisma` for allowed values per column.

**Force-dynamic:** `app/(app)/layout.tsx` sets `export const dynamic = "force-dynamic"` because Prisma can't statically prerender — at build time no database is available and it would crash on "no such table."

**Auth:** NextAuth v5 middleware protects everything except `/login`, `/api/auth`, and `/api/cron`. Login uses a credentials provider with bcrypt-hashed passwords stored in the `User` table. All users have role `"admin"`.

### Bill architecture

Bills are the core domain object. Key design decisions:

- **Immutable snapshots:** When a bill is created, `lineItems` is frozen as JSON — later changes to a room's services or rent won't affect past bills.
- **Electricity/water are NOT in lineItems.** They're stored in separate columns (`electricityAmount`, `waterAmount`) and sit outside `subtotal`. `grandTotal = subtotal + electricityAmount + waterAmount`. This matches the family's paper invoice template.
- **Meter readings** (`electricityOld/New`, `waterOld/New`) and their `*Rate` are stored so the invoice PDF can show the calculation breakdown.
- **Status lifecycle:** `"unpaid"` → `"overdue"` (auto-detected via `billStatusFor()` comparing `dueDate` to now) → `"paid"` (when `totalPaid >= grandTotal`). Status is recomputed on every payment.
- **Edit guard:** Bills can only be edited when `status !== "paid"` AND `payments.length === 0`. Once money is recorded, the bill is immutable. `app/(app)/hoa-don/bill-actions.ts` enforces this server-side.
- **All totals recomputed server-side** via pure functions in `lib/billing.ts` — client-submitted totals are never trusted.

### Key directories

| Directory | Purpose |
|---|---|
| `app/(app)/` | Authenticated dashboard routes |
| `app/api/` | Unauthenticated API routes (auth, upload, cron) |
| `lib/` | Pure helpers, Zod schemas, DB client — all unit-tested |
| `components/` | Shared UI (nav, toast, form controls) |
| `prisma/` | Schema, migrations, seed |
| `scripts/` | Operational scripts (Turso schema push, bulk import) |
| `docs/` | Historical implementation plans |
| `e2e/` | Playwright end-to-end tests |

### Production deployment (Vercel + Turso)

See `DEPLOY.md` for full steps. Critical: **Vercel does NOT run Prisma migrations on deploy.** Schema changes must be pushed to Turso separately before deploying new code:

```powershell
$env:DATABASE_URL = "libsql://nhatro-xxx.turso.io"
$env:DATABASE_AUTH_TOKEN = "<token>"
node scripts/push-turso-schema.mjs <migration-folder-name>
```

The `push-turso-schema.mjs` script applies SQL migration files directly to Turso using the libSQL client — it bypasses Prisma Migrate entirely (which doesn't work on Windows with Turso).

### Patterns

- **Server actions** use `"use server"` + `revalidatePath()` + `redirect()`. Form submission validates with Zod, recomputes totals server-side, then redirects.
- **Pure calculation helpers** (`lib/billing.ts`, `lib/format.ts`, `lib/rooms.ts`) have zero dependencies and are unit-tested. Business logic goes here.
- **Zod schemas** in `lib/` are shared between server actions (validation) and tests.
- **Toast notifications** use the `useToast()` hook from `components/toast.tsx` wrapped in `ToastProvider`.
- **Vietnamese UI:** All user-facing strings are in Vietnamese. Money uses dots as thousand separators: `1.500.000 ₫`.
