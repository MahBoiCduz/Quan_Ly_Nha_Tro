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
- [x] Task 3: Seed admin + 16 units — complete (commit 213c76a, review Approved). Seeded 16 units (15 rooms + 1 gym) + 1 admin + 1 Setting, idempotent; auth-password TDD; 7/7 tests. Adapter fix applied to seed.ts. Minors (non-blocking): seed.ts hardcodes "dev.db" path vs lib/db.ts env approach; gym status "occupied" (per plan — gym is rented).
- [x] Task 4: Admin auth (Auth.js v5) — complete (commit 8add262, review Approved). next-auth@beta credentials, JWT, secure (no path returns user without password check), VN login page, middleware protects routes; 10/10 tests, build clean. Minors (non-blocking, for final triage): vitest.config.ts aliases two Next.js *internal* paths (next/headers, next/navigation) that may shift on update; token.role uses `any` cast (JWT type not augmented) — conventional for Auth.js v5 beta.
- [x] Task 5: App shell + Vietnamese nav — complete (commit 149f7f7, review Approved). NAV_ITEMS (8 routes), sidebar shell under app/(app)/, lang="vi"+title, Playwright smoke 1/1, 12/12 unit tests, build clean. Also fixed a real Task 4 edge-runtime bug: split `auth.config.ts` (edge-safe, no better-sqlite3) for middleware + `auth.ts` for API routes (standard Auth.js v5 pattern). Controller verified middleware matcher = `/((?!api/auth|_next/static|_next/image|favicon.ico).*)` and password security intact.

**✅ PLAN 1 COMPLETE** — working authenticated app: Next14+Prisma7/SQLite, 16 units seeded, admin login, VN shell. Reminder for Plan 6 Task 3: add `api/cron` to the middleware matcher exclusion (already noted in that plan).

## Plan 2 — Rooms, Tenants & Leases
- [x] Task 1: Auth-protected upload/serving — complete (commits 1d80928 + 05dde1f fix; review found + we fixed an Important defect). Routes 401 unauth, MIME-validated, PII in gitignored uploads/, path-traversal-safe. FIX: sanitizeFilename was stripping hyphens → every file fetch 404'd (broke ID photos/receipts/QR); now preserves `-` with regression test. 16/16 tests. Minor (triage): uploadDir default absolute vs `./uploads` in .env.example.
- [x] Task 2: Rooms list + detail — complete (commit 15812eb, review Approved). Pure helpers groupUnitsByFloor/getActiveLease (TDD), list grouped by floor + detail page, sync params (Next14), notFound, no editing. 20/20 tests. Minors (triage): no empty-array test for getActiveLease; list-page leases not ordered (harmless). `[...keys()]`→`Array.from` for TS target.
- [x] Task 3: Service-item config — complete (commit 040995e, review Approved/ship-as-is). serviceItemSchema (TDD), add/delete server actions validate+revalidate, client editor, Task 2 page content preserved. 23/23 tests. Minors (triage): delete onClick has no error feedback; no optimistic update (revalidatePath refreshes on action resolve); no empty-measureUnit test; deleteServiceItem doesn't pre-validate id.
- [x] Task 4: Tenant CRUD + ID upload — complete (commit e394af0, review Approved/ship-as-is). tenantSchema (TDD, empty→undefined coercion), create/update validate+revalidate+redirect, form uploads front+back to /api/upload (PII via auth routes, not public/), list+new+edit pages prefill. 26/26 tests. Minors (triage): I1 silent upload-failure (no error UI; data not corrupted — coerced to undefined); I2 updateTenant revalidates list not [id] (redirect refetches anyway); no upload loading state; img vs next/image (intentional).
- [x] Task 5: Lease assignment + status sync — complete (commit a656db8, review Approved/shippable). leaseSchema (TDD), createLease/endLease atomic `$transaction` syncing unit.status occupied/vacant, panel toggles create vs end, detail page header+ServiceEditor preserved. 29/29 tests. Minors (triage): endLease lacks empty-date guard (HTML required mitigates); billingCycle select missing `required`; no optional-coercion test; double-assign guard deferred per plan.

**✅ PLAN 2 COMPLETE** — rooms, service config, tenants+ID photos, leases with atomic status sync.

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
