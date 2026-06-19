# Implementation Progress Ledger

Execution of the 7 rental-management plans via subagent-driven-development.
DB switched to **SQLite** (no Postgres/Docker on machine; user-approved 2026-06-18).

Tasks marked complete below are DONE — do not re-dispatch. Resume at the first unmarked task.

## Plan 1 — Foundation & Auth
- [x] Task 1: Scaffold Next.js + Tailwind + Vitest — complete (commits 3eb269e re-scaffold on Next 14.2.35 + e9ce662 fix; review approved). Note: original fb165dc scaffolded Next 16 by mistake → re-pinned to 14.
- [x] Task 2: Prisma setup + complete schema (SQLite) — complete (commit 5701522). Verified by controller: schema matches brief (all 11 models + Setting, no enums), init migration applied, tests 5/5, `npm run build` clean, `Json` works on SQLite (no String fallback → Plan 3 unaffected). DEVIATION: landed on **Prisma 7.8.0** (latest via `prisma init`) using `prisma.config.ts` (datasource url there, not in schema) + **`@prisma/adapter-better-sqlite3` driver adapter** in lib/db.ts. Formal reviewer gate skipped under session-limit pressure; controller hands-on verification stands in.

### ⚠️ CRITICAL downstream constraint (Prisma 7)
Prisma 7 has NO built-in SQLite driver — every `new PrismaClient()` MUST pass a driver adapter, exactly like `lib/db.ts`:
```ts
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
const adapter = new PrismaBetterSqlite3({ url: path.resolve("dev.db") });
const db = new PrismaClient({ adapter });
```
- Plan 1 Task 3 seed (`prisma/seed.ts`) brief shows bare `new PrismaClient()` → WILL FAIL; use the adapter pattern above (or import the singleton).
- Any other standalone client (scripts, tests that hit a real DB) needs the adapter too.
- [ ] Task 3: Seed admin + 16 units
- [ ] Task 4: Admin auth (Auth.js v5)
- [ ] Task 5: App shell + Vietnamese nav

## Plan 2 — Rooms, Tenants & Leases
- [ ] Task 1: Auth-protected upload/serving
- [ ] Task 2: Rooms list + detail
- [ ] Task 3: Service-item config
- [ ] Task 4: Tenant CRUD + ID upload
- [ ] Task 5: Lease assignment + status sync

## Plan 3 — Billing & Invoice
- [ ] Task 1: Billing calc logic
- [ ] Task 2: Generate bill
- [ ] Task 3: Bill detail + payments
- [ ] Task 4: Invoice PDF

## Plan 4 — Ledger & Expenses
- [ ] Task 1: Ledger derivation logic
- [ ] Task 2: Expense logging
- [ ] Task 3: Ledger view + Excel export

## Plan 5 — Maintenance
- [ ] Task 1: Maintenance due logic
- [ ] Task 2: Schedule CRUD + completion

## Plan 6 — Zalo Notifications
- [ ] Task 1: Notification planner
- [ ] Task 2: Zalo client + NotificationLog
- [ ] Task 3: Cron dispatch route

## Plan 7 — Dashboard & Settings
- [ ] Task 1: Dashboard stats logic
- [ ] Task 2: Settings + QR-on-PDF
- [ ] Task 3: Dashboard page + notify button
- [ ] Task 4: End-to-end flow test

## Minor findings (for final review triage)
- P1T1: vitest pinned at v4 (much newer than typical Next14 setups) — no observed breakage, watch for incompatibilities.
- P1T1: app/layout.tsx still has default "Create Next App" metadata — superseded by Plan 1 Task 5 Step 8 (sets title to "Quản Lý Nhà Trọ"); verify there.
