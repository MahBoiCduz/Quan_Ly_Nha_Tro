# Quản Lý Nhà Trọ — Design Spec
**Date:** 2026-06-18
**Phase:** 1 (Internal/Admin only)

> ⚠️ **Bản thiết kế gốc — đã lạc hậu.** Tài liệu đặc tả hiện hành (SRS) là
> [`docs/SRS.md`](../../SRS.md). Bản này giữ lại làm lịch sử; các tính năng thêm
> sau (hồ sơ thanh toán, người ở cùng, chỉ số điện/nước, quản lý người dùng…)
> chỉ được phản ánh trong SRS.

---

## Overview

A web application for managing a family-owned rental property in Vietnam. The building has 15 rooms across 3 floors (5 rooms per floor) and 1 large commercial space on the ground floor currently rented by a gym — 16 units total.

Phase 1 is admin-only (internal use). A tenant-facing portal is deferred to phase 2.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Database | SQLite (phase 1, file-based; can switch to PostgreSQL on server deploy) |
| ORM | Prisma |
| Auth | NextAuth.js (email + password) |
| PDF generation | @react-pdf/renderer |
| Notifications | Zalo OA API |
| Hosting | VPS or Railway |

---

## Data Model

### Unit
- `id`, `name` (e.g. "Phòng 301"), `floor` (1–3), `type` (`room` | `commercial`), `baseRent`, `status` (`occupied` | `vacant`)
- Has many: `ServiceItem`, `Lease`

### ServiceItem
- `id`, `unitId`, `name` (e.g. "Internet", "Dịch vụ chung"), `unit` (e.g. "phòng", "người", "xe"), `defaultPrice`
- Configurable per room; auto-populates when a bill is generated

### Tenant
- `id`, `fullName`, `phone`, `idCardNumber`, `idCardFrontImageUrl`, `idCardBackImageUrl`, `vehiclePlate`, `zaloId`, `notes`

### Lease
- `id`, `unitId`, `tenantId`, `startDate`, `endDate`, `agreedRent`, `billingCycle` (`monthly` | `quarterly` | `custom`), `depositAmount`, `depositCollectedAt`, `depositCollectedBy`

### Bill
- `id`, `leaseId`, `periodLabel` (e.g. "Tháng 6/2026"), `dueDate`, `status` (`unpaid` | `paid` | `overdue`)
- `lineItems` (JSON array: `{ name, unit, quantity, unitPrice, total }`)
- `electricityAmount`, `waterAmount` (entered manually each month)
- `subtotal` (excludes electricity/water), `grandTotal`

### Payment
- `id`, `billId`, `amount`, `paidAt`, `method` (`cash` | `bank_transfer`), `confirmedBy`, `notes`, `receiptImageUrl`

### Expense
- `id`, `date`, `description`, `category` (e.g. "Điện", "Nước", "Internet", "Sửa chữa", "Khác"), `amount`

### MaintenanceSchedule
- `id`, `name` (e.g. "Vệ sinh bể nước"), `scope` (`building` | `unit`), `unitId?`, `intervalDays`, `lastDoneAt`, `nextDueAt`, `notes`

### MaintenanceLog
- `id`, `scheduleId`, `doneAt`, `notes`

### User
- `id`, `email`, `passwordHash`, `role` (`admin`)

---

## Features & Pages

### Dashboard (`/`)
- Summary cards: occupied/vacant units, total rent due this month, overdue bills count, maintenance tasks due this week
- Quick actions: Ghi nhận thanh toán, Tạo hóa đơn, Thêm chi tiêu

### Rooms (`/phong`)
- Grid/list of all 16 units with status badge, floor, current tenant name, rent amount
- Room detail page: lease info, service line items (editable), bill history, payment history

### Tenants (`/khach-thue`)
- List all tenants (current and past)
- Add/edit: name, phone, ID card number, ID card front & back photo upload, vehicle plate, Zalo ID
- Link to lease and room assignment
- Deposit tracking: amount, collected date, collected by

### Billing (`/hoa-don`)
- List all bills with filter by month, room, status
- Generate bill for a room+period:
  - Auto-fills service line items from room config
  - Admin manually enters electricity and water amounts
  - Preview before saving
- Mark as paid: method, date, amount, attach transaction screenshot
- Overdue bills highlighted; Zalo notification sent to admin when bill passes due date

### Invoice PDF Export
- Available from any bill detail page
- Renders to match the existing family template:
  - Header: room number, billing period, tenant name + phone, vehicle plate
  - Service table: TT, Các dịch vụ, Đơn vị tính, Số lượng, Đơn giá, Thành tiền
  - Subtotal (excluding electricity/water)
  - Notes section (payment timing instructions)
  - Bank account info + QR code image (static image uploaded by admin in settings)

### Ledger (`/so-sach`)
- Chronological transaction log matching mom's Google Sheet format
- Columns: TT, Ngày, Nội dung, Thu tiền phòng và DV, Thu tiền điện nước, Chi, Tổng thu, Tồn
- Monthly summary rows auto-calculated
- Running account balance auto-calculated
- Export to Excel (.xlsx)

### Expenses (`/chi-tieu`)
- Log building expenses with date, description, category, amount
- Categories: Điện, Nước, Internet, Sửa chữa, Mua sắm, Khác
- Feeds into the Ledger's Chi column automatically

### Maintenance (`/bao-tri`)
- List scheduled tasks with next due date and status
- Add/edit schedule: name, interval (days), scope (building or specific room)
- Mark as done: date, notes
- Zalo reminder sent to admin when a task is due

### Settings (`/cai-dat`)
- Admin account management
- Bank account info (name, account number, bank name) — shown on invoices
- QR code image upload — embedded in invoice PDFs
- Default payment notes text (shown on invoices)

---

## Notifications (Zalo OA)

Requires a registered Zalo Official Account.

| Trigger | Message |
|---|---|
| Bill overdue | "Phòng [X] chưa thanh toán hóa đơn [period]. Hạn: [date]." |
| Maintenance due | "[Task name] đến hạn thực hiện hôm nay." |

Notifications sent to the admin's Zalo account linked in settings.

---

## Invoice PDF Template

Matches the existing family template exactly:

```
PHÒNG [number]
Kì thanh toán: [period]
Người thuê: [name] (ĐT: [phone])          Biển số XM: [plate]

| TT | Các dịch vụ | Đơn vị tính | Số lượng | Đơn giá | Thành tiền 1 tháng |
|----|-------------|-------------|----------|---------|-------------------|
| 1  | Internet    | phòng       | 1        | 100     | 100               |
...

Tổng tiền nhà và DV (trừ điện, nước): [subtotal]        Cọc [deposit]

Ghi chú:
- Tiền phòng và các dịch vụ thu trước đầu kì 05 ngày.
- Tiền điện, nước: thu hàng tháng (trong vòng 03 ngày đầu tháng sau)

Khách hàng vui lòng thanh toán theo thông tin TK sau:
Số tài khoản: [account] – [account name]
[Bank name]

[QR code image]
```

---

## Phase 2 (Deferred)

- Tenant portal (login, view bills, scan QR to pay)
- Google Sheets import for historical data migration
- Multi-property support
- Role-based access (admin + staff)

---

## Success Criteria (Phase 1)

- Admin can generate an invoice PDF matching the existing template in under 1 minute
- Admin can record a payment in under 10 seconds
- Ledger auto-calculates monthly totals replacing manual Google Sheets work
- Zalo reminders fire correctly for overdue bills and maintenance
