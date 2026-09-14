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

**Dual database:** `lib/db.ts` creates a Prisma client with the `@prisma/adapter-libsql` adapter. The same codebase runs against a local `dev.db` file in dev and a remote Turso/libSQL database in production. `DATABASE_URL` switches between `file:./dev.db` (local, resolved against the process cwd) and `libsql://...` (Turso). `DATABASE_AUTH_TOKEN` is only needed for Turso.

**Money:** All amounts are integers in Vietnamese đồng (VND). Format with `formatVND()` from `lib/format.ts`. Never use floats for money.

**Schema enums:** SQLite doesn't support Prisma enums, so status/type columns are plain `String` validated by Zod schemas in the app layer. See the comment at the top of `prisma/schema.prisma` for allowed values per column.

**Force-dynamic:** `app/(app)/layout.tsx` sets `export const dynamic = "force-dynamic"` because Prisma can't statically prerender — at build time no database is available and it would crash on "no such table."

**Auth:** NextAuth v5 middleware protects everything except `/login`, `/api/auth` and static assets (`middleware.ts` matcher). Login uses a credentials provider with bcrypt-hashed passwords stored in the `User` table. All users have role `"admin"`. Keep the `auth.config.ts` (edge-safe, used by middleware) / `auth.ts` (Node, uses bcrypt + Prisma) split — importing the Node half into middleware breaks the edge build.

### Bill architecture

Bills are the core domain object. Key design decisions:

- **Immutable snapshots:** When a bill is created, `lineItems` is frozen as JSON — later changes to a room's services or rent won't affect past bills.
- **Electricity/water are NOT in lineItems.** They're stored in separate columns (`electricityAmount`, `waterAmount`) and sit outside `subtotal`. `grandTotal = subtotal + electricityAmount + waterAmount`. This matches the family's paper invoice template.
- **Meter readings** (`electricityOld/New`, `waterOld/New`) and their `*Rate` are stored so the invoice PDF can show the calculation breakdown.
- **Status lifecycle:** `"unpaid"` → `"overdue"` (auto-detected via `billStatusFor()` comparing `dueDate` to now) → `"paid"` (when `totalPaid >= grandTotal`). Status is recomputed on every payment.
- **Edit guard:** Bills can only be edited when `status !== "paid"` AND `payments.length === 0`. Once money is recorded, the bill is immutable. `app/(app)/hoa-don/bill-actions.ts` enforces this server-side. Deleting is blocked only for `paid` bills; deleting an unpaid bill also deletes its payments in one `$transaction`.
- **Status on read:** `billStatusFor()` compares Vietnam dates with `>=`, so a bill counts as overdue from its due date onward. List/detail/dashboard recompute the display status at read time because the stored `status` column is only written on create/update/payment.
- **All totals recomputed server-side** via pure functions in `lib/billing.ts` — client-submitted totals are never trusted.
- **Bill types:** Each bill has a `type` column: `"room"` (rent+services only), `"elec_water"` (meter readings only), or `"both"` (combined — default). The form at `/hoa-don/new` has a pill-toggle to select type. Sections are conditionally shown/hidden in the form, detail page, and PDF. Zod schemas enforce type-specific rules (line items required for room/both; meter checks only for elec_water/both). Meter fields are nullable — stored as `null` for room-type bills.

### BillingProfile & Setting

- **BillingProfile** stores bank account + QR code details for invoices. Each room can have its own profile (`Unit.billingProfileId`). Exactly one row has `isDefault = true` — the fallback when neither the bill nor the room specifies one.
- **Setting** is a singleton config row (`id = 'singleton'`). It only holds `defaultElectricityRate` and `defaultWaterRate`. Bank/QR fields were consolidated into `BillingProfile` (migration `20260702000000`).

### Payment receipt images

`Payment.receiptImages` is a **JSON array** of image URLs (migration `20260704000000`). A tenant can send multiple screenshots for one payment. The old single `receiptImageUrl` column no longer exists.

### Co-tenants

A lease has one primary tenant (the billing contact) and zero or more co-tenants via `Tenant.coLeaseId`. Co-tenants share the same lease but are not individually billed.

### Ledger

`lib/ledger.ts` splits each payment proportionally into `incomeRoom` (rent+services) and `incomeUtilities` (electricity+water) via `allocatePaymentIncome()`. The ledger table in `/so-sach` shows these as separate columns. Expenses are a separate model, not tied to bills.

### Key directories

| Directory | Purpose |
|---|---|
| `app/(app)/` | Authenticated dashboard routes |
| `app/api/` | Route handlers: `auth` (NextAuth), `upload`, `files/[...path]` — both file routes check the session themselves |
| `lib/` | Pure helpers, Zod schemas, DB client — all unit-tested |
| `components/` | Shared UI (nav, toast, form controls) |
| `prisma/` | Schema, migrations, seed |
| `scripts/` | Operational scripts (Turso schema push, bulk import, password reset, DB checks) |
| `docs/` | `SRS.md` (current spec), `CHANGELOG.md`, historical plans |
| `e2e/` | Playwright end-to-end tests |

### Removed features (do not resurrect from old notes)

**Zalo notifications are gone** (commit `dfd73c3`, migration `20260801000000_remove_zalo_notifications`): no `lib/zalo.ts`, no `lib/notify-runner.ts`, no `NotificationLog` model, no `Setting.adminZaloUserId`, no `/api/cron/*`, and no `ZALO_OA_ACCESS_TOKEN` / `CRON_SECRET` env vars. Only the `Tenant.zaloId` data field remains. `docs/superpowers/*` still describes the old design — treat that as history, not as current spec.

### Production deployment (Vercel + Turso)

See `DEPLOY.md` for full steps. Critical: **Vercel does NOT run Prisma migrations on deploy.** Schema changes must be pushed to Turso separately — ideally **immediately after committing and pushing the code**.

Two ways to apply migrations to Turso:

1. **Turso pipeline API** (preferred for single DDL statements):
   ```bash
   curl -H "Authorization: Bearer <token>" \
     -d '{"requests":[{"type":"execute","stmt":{"sql":"ALTER TABLE ..."}}]}' \
     "https://nhatro-mahboicduz.aws-ap-northeast-1.turso.io/v2/pipeline"
   ```

2. **push-turso-schema.mjs** (for applying full migration files):
   ```powershell
   $env:DATABASE_URL = "libsql://nhatro-xxx.turso.io"
   $env:DATABASE_AUTH_TOKEN = "<token>"
   node scripts/push-turso-schema.mjs <migration-folder-name>
   ```

**Turso connection:** `libsql://nhatro-mahboicduz.aws-ap-northeast-1.turso.io` · Auth token is stored in Vercel env vars (`DATABASE_AUTH_TOKEN`).

### Patterns

- **PDF & PNG export:** the invoice PDF is rendered server-side in `app/(app)/hoa-don/[id]/pdf/route.ts` with `@react-pdf/renderer`. The PNG export rasterises that same PDF in the browser (`lib/invoice-image-client.ts`): `pdfjs-dist` is imported **dynamically inside a client module** — never import it from a server file, and never bundle the worker (webpack fails on it; it is copied to `public/pdf.worker.min.mjs` by `scripts/sync-pdf-worker.mjs` via `predev`/`prebuild`).
- **Batch export (`/hoa-don`):** tick bills → ZIP (`fflate`, `level: 0`) or write straight into a folder (`showDirectoryPicker`, which must be called **inside the click handler** because it needs transient user activation; tests stub it via `page.addInitScript`). Pure planning helpers live in `lib/invoice-batch.ts`, orchestration in `lib/invoice-batch-client.ts`, UI in `components/bills-batch-export.tsx`. The period filter keys off `Bill.periodLabel` (free text) with a whitespace-insensitive key — real labels are inconsistent (`"Tháng 5+6+7/2026 (giữa tháng)"`, `"Tháng 7+8+9/ 2026"`, `"15/6 đến hết tháng 8/2026"`).
- **ES5 type-check target:** `tsconfig.json` sets no `target`, so `tsc` type-checks with ES5 defaults — `for…of` over an iterator (e.g. `String.matchAll`) fails `next build` with "can only be iterated through when using --downlevelIteration". Use `Array.from(...)` and plain index/`exec` loops, and always run `npm run build` (not just `npm test`) after touching `lib/`.
- **Server actions** use `"use server"` + `revalidatePath()` + `redirect()`. Form submission validates with Zod, recomputes totals server-side, then redirects.
- **Pure calculation helpers** (`lib/billing.ts`, `lib/format.ts`, `lib/rooms.ts`) have zero dependencies and are unit-tested. Business logic goes here.
- **Zod schemas** in `lib/` are shared between server actions (validation) and tests.
- **Toast notifications** use the `useToast()` hook from `components/toast.tsx` wrapped in `ToastProvider`.
- **Vietnamese UI:** All user-facing strings are in Vietnamese. Money uses dots as thousand separators: `1.500.000 ₫`.

### Build & lint rules

The project uses `next/core-web-vitals` + `next/typescript` ESLint config. Two hard rules that will **fail the Vercel build**:

- **No `any` types:** `@typescript-eslint/no-explicit-any` is an error, not a warning. Use proper types, `unknown`, or inline the logic on a concrete Zod schema (avoid generic wrapper functions whose `z.output<T>` resolves to `unknown`).
- **No `<img>` — use `<Image />` from `next/image`** for optimized images. This is a warning but still blocks the build when combined with other errors.

TypeScript compilation and ESLint run during `next build`. A single `any` type or type mismatch will stop the deployment.
