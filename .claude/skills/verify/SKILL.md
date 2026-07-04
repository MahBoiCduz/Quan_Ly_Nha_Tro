---
name: verify
description: Build, launch, and drive Quan_Ly_Nha_Tro end-to-end to verify a change at the UI surface.
---

# Verify Quan_Ly_Nha_Tro at runtime

Next.js 14 + Prisma (libSQL/SQLite) + next-auth v5. All UI is in Vietnamese.

## Boot a fresh app

```bash
rm -f dev.db
DATABASE_URL="file:./dev.db" npx prisma migrate deploy
DATABASE_URL="file:./dev.db" npm run db:seed   # admin@nhatro.local / doimatkhau, 16 units, no leases
DATABASE_URL="file:./dev.db" AUTH_SECRET="any-string" npm run dev   # port 3000; wait for /login → 200
```

Local uploads land in `uploads/` (gitignored) and are served from `/api/files/<name>`.
Clean up after a run: `rm -f dev.db uploads/<test files>`.

## Drive with Playwright

Chromium is pre-installed: `chromium.launch({ executablePath: "/opt/pw-browsers/chromium" })`.
Resolve `@playwright/test` from the repo with `createRequire("<repo>/package.json")`.
`e2e/flow.spec.ts` is the reference for selectors and the happy-path flow.

Gotchas learned the hard way:

- The seed has no tenants/leases, so most flows need one first: `/phong` → click a room →
  fill `Họ tên`, `Số điện thoại`, `startDate`, `agreedRent`, **and `depositAmount` (required —
  omit it and native validation silently blocks the submit)** → "Tạo hợp đồng". Server action +
  revalidation is slow: wait ~2s, reload, assert "Kết thúc hợp đồng" is visible.
- `/hoa-don/new` only lists occupied rooms. Meter validation: new reading ≥ old, due date ≥ today
  (Asia/Ho_Chi_Minh).
- After "Tạo hóa đơn" the page redirects to `/hoa-don/<cuid>`; a `waitForURL(/\/hoa-don\/[a-z0-9]+$/)`
  also matches `/hoa-don/new`, so anchor on page content instead of the URL.
- Forms are server actions: after submitting, wait for the DOM to change (row count, toast text),
  not for navigation.
