# Implementation Progress Ledger

Execution of the 7 rental-management plans via subagent-driven-development.
DB switched to **SQLite** (no Postgres/Docker on machine; user-approved 2026-06-18).

Tasks marked complete below are DONE — do not re-dispatch. Resume at the first unmarked task.

## Plan 1 — Foundation & Auth
- [ ] Task 1: Scaffold Next.js + Tailwind + Vitest
- [ ] Task 2: Prisma setup + complete schema (SQLite)
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
(none yet)
