# Giá dịch vụ theo số người + tách trục SL / Số tháng trên hoá đơn

> Spec feature. Trạng thái: **chờ người dùng duyệt** trước khi code (quy ước `docs/specs/README.md`).
> Mockup đã được duyệt: `viz/thi-t-k-d-ch-v-t-nh-theo-s-ng-i-c-t-s-th-ng-tr-n-8c377c03.html`

## Tổng quan

Hiện mỗi dịch vụ của phòng chỉ có `tên + đơn vị tính + đơn giá` và luôn được tính `đơn giá × số tháng`. Thực tế có phòng 4 người ở, và những khoản như "Tiền dịch vụ chung" phải thu **theo đầu người** (150.000 đ/người × 4 = 600.000 đ). Feature này thêm cờ **tính theo số người** cho dịch vụ, lấy số người tự động từ hồ sơ phòng, và tách dòng hoá đơn thành **SL × Đơn giá × Số tháng** để hoá đơn in ra thể hiện rõ căn cứ tính tiền.

## Bối cảnh

- Yêu cầu gốc của người dùng: "giá dịch vụ phải phụ thuộc vào số người ở trong phòng… ví dụ Dịch vụ chung, đơn vị `người`, đơn giá 150.000, số người 4 → 600.000".
- Hiện trạng liên quan: `prisma/schema.prisma:60-69` (`ServiceItem`), `lib/service-schema.ts:3-7`, `app/(app)/phong/[id]/service-actions.ts:7-26`, `app/(app)/phong/[id]/service-editor.tsx`, `lib/billing.ts:13-33` (`buildDefaultLineItems` → `quantity: months`), `app/(app)/hoa-don/new/page.tsx:26`, `app/(app)/hoa-don/generate-form.tsx:66-74,143,149`.
- Các quyết định đã chốt với người dùng (2026-10-01), kèm lý do:
  1. **Số người lấy tự động** = 1 người thuê chính (`Lease.tenantId`) + số `Tenant` có `coLeaseId` = leaseId. Chọn tự động vì DB đã có sẵn danh sách khách ở chung (đang hiển thị ở `app/(app)/phong/[id]/tenant-info-section.tsx:167`), tránh nguồn sự thật thứ hai.
  2. **Không lưu số người trên `ServiceItem`/`Unit`** — nếu lưu sẽ lệch với danh sách khách khi có người chuyển đi/vào; hoá đơn là snapshot JSON nên chốt số ngay tại dòng hoá đơn là đúng chỗ. Cột SL trong form vẫn sửa tay được để xử lý dữ liệu khách ở chung ghi thiếu.
  3. **Cờ `perPerson` mở cho mọi dịch vụ**, không khoá theo `measureUnit` (người dùng chọn "linh hoạt").
  4. **Tách 2 trục:** `SL` (số người / số xe / 1) và `months` (số tháng N) → `total = SL × đơn giá × N`. Trước đây `quantity` vừa là "số tháng" vừa là "số lượng", không thể hiện được `4 người × 150.000 × 3 tháng`. **Chốt lại 2026-10-01: tách riêng cho MỌI dòng, kể cả dòng tiền thuê** — cột SL luôn là số lượng theo đơn vị của dòng (phòng / người / xe / kWh / m³), cột Số tháng là trục độc lập; dòng tiền thuê vì thế in thành `1 × 3.200.000 ₫ × 3 tháng` (tổng không đổi).
  5. **Hoá đơn cũ giữ nguyên 100%**: JSON cũ không có `months` → hiển thị và tính như cũ (không migrate dữ liệu cũ).
  6. Giá 150.000/người chỉ là ví dụ — **không sửa giá production**; dữ liệu demo cập nhật theo ví dụ để showcase.
  7. Người vào/ra giữa tháng: **thu đủ tháng** theo số người tại lúc tạo hoá đơn (muốn chia tỷ lệ thì sửa tay cột SL).
  8. **(Bổ sung 2026-10-01, người dùng nêu thêm)** Số lượng của dịch vụ không tính theo người (ví dụ **số xe máy**) do người dùng **nhập ngay trong khu vực dịch vụ ở trang chi tiết phòng**, lưu vào `ServiceItem.defaultQuantity`, và vẫn **sửa được ở màn tạo hoá đơn**. Chọn cách này vì số xe là dữ liệu tĩnh của phòng, không suy ra được từ hồ sơ khách như số người.
- Điện/nước không bao giờ theo số người và **không** × số tháng: chúng tính theo chỉ số qua `computeMeterAmount` (`lib/billing.ts:58-60`).

## Yêu cầu

### Chức năng

**Dịch vụ của phòng (`/phong/[id]`)**
- [ ] Khi user thêm/sửa dịch vụ → có thêm ô tick **"Tính theo số người"**; danh sách dịch vụ hiện nhãn `· ×số người` cho dịch vụ đang bật.
- [ ] Khi user tick cờ cho dịch vụ có đơn vị bất kỳ (người, xe, phòng…) → hệ thống lưu cờ, **không chặn** theo đơn vị.
- [ ] Khi user bỏ tick → dịch vụ dùng **Số lượng** của phòng (ô "Số lượng", mặc định 1) thay vì số người.
- [ ] Khi user nhập **Số lượng** cho dịch vụ (ví dụ Xe máy = 2) → hệ thống lưu vào `ServiceItem.defaultQuantity`, danh sách dịch vụ hiện `· 2 xe`.
- [ ] Khi dịch vụ đang bật "Tính theo số người" → ô Số lượng bị vô hiệu hoá kèm ghi chú "lấy theo số người ở" (tránh 2 nguồn số lượng cùng lúc).

**Tạo hoá đơn (`/hoa-don/new`)**
- [ ] Khi user chọn phòng → hệ thống tự điền dòng tiền thuê + dịch vụ; dòng có cờ nhận **SL = số người ở** (1 người thuê chính + khách ở chung), dòng không cờ nhận **SL = Số lượng của dịch vụ** (`defaultQuantity`, ví dụ Xe máy = 2), dòng tiền thuê SL = 1.
- [ ] Khi user đổi **Số tháng tính tiền (N)** → **mọi** dòng cập nhật `thành tiền = SL × đơn giá × N`; dòng theo số người giữ nguyên SL (không bị reset về N như hiện tại ở `generate-form.tsx:149`).
- [ ] Khi user sửa trực tiếp cột **SL** → thành tiền và tổng cập nhật ngay; số người tự động chỉ là giá trị gợi ý.
- [ ] Khi user đổi phòng → toàn bộ dòng được dựng lại theo số người của phòng mới.
- [ ] Khi user tạo hoá đơn → server (`normalizeLineItems`) tính lại `total = SL × đơn giá × (months ?? 1)`, không tin số client gửi.

**Hoá đơn in ra (màn chi tiết, PDF, ảnh PNG)**
- [ ] Khi xem/in hoá đơn → mỗi dòng hiển thị **Đơn vị · SL · Đơn giá · Số tháng**; dòng theo số người có nhãn `(4 người)`; dòng điện/nước để trống cột Số tháng.
- [ ] Khi xem hoá đơn **cũ** (JSON không có `months`) → hiển thị y như trước đây (`SL × Đơn giá`), **tổng tiền không đổi một đồng**.
- [ ] Khi hoá đơn có N = 1 → không hiển thị `× 1 tháng` (tránh rối).

**Sửa hoá đơn (`/hoa-don/[id]/edit`)**
- [ ] Khi user sửa hoá đơn → ô "Số tháng" vẫn ẩn (như hiện nay), các dòng giữ nguyên SL/số tháng đã snapshot; lưu lại không làm đổi số tiền nếu user không sửa gì.

### Kỹ thuật

- **Schema:** thêm 2 cột vào `ServiceItem`; migration mới `prisma/migrations/20261001000000_service_item_per_person_quantity/migration.sql`:
  `ALTER TABLE "ServiceItem" ADD COLUMN "perPerson" BOOLEAN NOT NULL DEFAULT false;`
  `ALTER TABLE "ServiceItem" ADD COLUMN "defaultQuantity" INTEGER NOT NULL DEFAULT 1;`
  Hai cột additive, mặc định `false` / `1` ⇒ mọi dịch vụ hiện có giữ nguyên cách tính (SL = 1). **Local:** `npx prisma db push` + `npx prisma generate`. **Turso:** đẩy schema lên Turso **trước khi push code** (Vercel không chạy migration) bằng `node scripts/push-turso-schema.mjs prisma/migrations/20261001000000_service_item_per_person_quantity`.
- **Kiểu dữ liệu dòng hoá đơn** (`lib/billing.ts:1-7`): thêm `months: number` (và tuỳ chọn `perPerson?: boolean`) vào `LineItem`; `normalizeLineItems` (`:37-47`) đổi thành `total: lineTotal(quantity * (months ?? 1), unitPrice)` để JSON cũ (không có `months`) vẫn ra đúng số cũ. Khi dựng dòng: `quantity = perPerson ? occupancy : (defaultQuantity ?? 1)`, **bỏ dòng có SL = 0** để không in dòng 0 đồng.
- **Reuse:** `lib/billing.ts` (`buildDefaultLineItems`, `lineTotal`, `normalizeLineItems`, `computeSubtotal`, `computeGrandTotal`), `lib/format.ts` (`formatVND`), `lib/rooms.ts` (`getCurrentOrUpcomingLease`), `lib/service-schema.ts`, `components/toast.tsx`; lớp in dùng chung `lib/invoice-pdf.tsx` nên ảnh PNG (đi qua PDF) tự động có cùng nội dung.
- **Quy ước dự án:** money = int VND, Zod validate mọi input, server action `"use server"` + `revalidatePath()`, UI tiếng Việt, không set `target` trong tsconfig ⇒ tránh cú pháp cần ES2015+ (`matchAll`, spread iterator).
- **Không sửa:** `app/(app)/phong/[id]/page.tsx` (`include: true` tự lấy cột mới), `lib/invoice-batch*.ts`, `lib/invoice-image*.ts`, `bill-actions.ts` (đã gọi `normalizeLineItems`).

## Giả định & Edge cases

- **Giả định:** "đang thuê" = có lease chưa kết thúc (đã lọc ở `app/(app)/hoa-don/new/page.tsx:18-20`) ⇒ hoá đơn luôn có ≥ 1 người; vẫn kẹp `Math.max(1, occupancy)` cho an toàn.
- **Edge:** dữ liệu khách ở chung ghi thiếu (phòng 4 người nhưng DB chỉ 1) → prefill sai, user sửa ở cột SL; số người đổi giữa kỳ → hoá đơn cũ bất biến, hoá đơn mới lấy số mới; phòng trống → không xuất hiện ở form tạo hoá đơn; hoá đơn nhiều tháng (`Tháng 5+6+7/2026`) → `SL × đơn giá × N`; hoá đơn cũ sửa lại → `months` undefined ⇒ `?? 1` giữ nguyên tiền; giá lẻ thập phân → đã bị chặn bởi `z.number().int()` nên không phát sinh làm tròn; xoá khách ở chung → không ảnh hưởng hoá đơn đã tạo.
- **Số xe:** nhập ở trang chi tiết phòng (ô Số lượng) hoặc sửa thẳng cột SL khi tạo hoá đơn; `defaultQuantity = 0` ⇒ không sinh dòng cho dịch vụ đó (tránh in dòng 0 đồng), muốn thu vẫn thêm dòng tay được; sửa Số lượng ở trang phòng **không** ảnh hưởng hoá đơn đã tạo.
- **Không làm:** không backfill/hồi tố, không tự bật cờ cho dịch vụ đang có đơn vị "người" (tránh đổi tiền ngoài ý muốn) — chỉ in câu kiểm kê để người dùng tự bật.

## Task breakdown

1. [x] Migration + Prisma schema: thêm `perPerson` và `defaultQuantity` vào `prisma/schema.prisma:60-72`, tạo `prisma/migrations/20261001000000_service_item_per_person_quantity/migration.sql`, `npx prisma db push` + `npx prisma generate` — **đã áp vào prisma/demo.db ngày 2026-10-01**.
2. [x] `lib/service-schema.ts` thêm `perPerson` + `defaultQuantity` (số nguyên ≥ 0); `app/(app)/phong/[id]/service-actions.ts` parse `formData.get("perPerson") === "on"` và `defaultQuantity` (thêm `updateServiceItem`); `app/(app)/phong/[id]/service-editor.tsx` thêm checkbox + ô Số lượng (vô hiệu hoá khi tick theo số người) + hiển thị nhãn `· × số người ở` / `· 2 xe`.
3. [x] `lib/billing.ts`: `LineItem.months` + `perPerson`, `monthsOrOne()`, `lineAmount()`, `buildDefaultLineItems(services, agreedRent, months = 1, occupancy = 1)` với `quantity = perPerson ? occupancy : defaultQuantity` (bỏ dòng SL 0), `normalizeLineItems` tính theo `months ?? 1`; `lib/bill-schema.ts` giữ `months`/`perPerson` khi parse.
4. [x] `app/(app)/hoa-don/new/page.tsx` select thêm `perPerson` + `defaultQuantity` + `coTenants` và truyền `occupancy`; `app/(app)/hoa-don/generate-form.tsx` thêm cột Đơn vị + Số tháng, `Row.months`, sửa `onMonthsChange` để không ghi đè SL (bẫy cũ ở `:149`), `subtotal` dùng `lineAmount`.
5. [x] Hiển thị: `app/(app)/hoa-don/[id]/page.tsx` (cột Số tháng) và `lib/invoice-pdf.tsx:150-175` (cột Số tháng, 6 → 7 cột), hoá đơn cũ hiển thị/in y như trước.
6. [x] Test: `lib/billing.test.ts` (25), `lib/service-schema.test.ts` (8), `lib/demo-data.test.ts` (20 — có ca theo số người + Xe máy), `lib/bill-schema.test.ts`, `lib/invoice-pdf.test.ts`.
7. [x] Dữ liệu demo: `lib/demo-data.ts` bật cờ cho "Dịch vụ chung" (đơn vị `người`, giữ giá demo 50.000/người) và gán `defaultQuantity` cho "Xe máy" theo số xe của từng phòng (1–2); `prisma/seed-demo.ts:114` ghi thêm 2 cột; chạy lại `npm run demo:reset` và commit lại `prisma/demo.db`.
8. [x] Docs: `docs/SRS.md` (§5 ServiceItem, §5 Bill.lineItems, §6.2, FR-2, FR-3, §9 migration), `CLAUDE.md`, `README.md`, `docs/CHANGELOG.md`.
9. [~] Verify: `npm test` 189/189 pass, `npm run build` exit 0 (đã sửa 1 lỗi lint `'monthsOrOne' is defined but never used` ở `generate-form.tsx:7`), `npm run demo:reset` sinh lại DB (39 hoá đơn, tổng thu 135.004.800 ₫) và đối chiếu tay bằng script tạm: mọi dòng `total = quantity × unitPrice × (months ?? 1)`, "Dịch vụ chung" (perPerson) = số người ở (Phòng 202/205/303/401/404 = 2 người ⇒ SL 2), "Xe máy" = số xe. **Còn lại: đẩy migration lên Turso bằng `node scripts/push-turso-schema.mjs 20261001000000_service_item_per_person_quantity` — cần `DATABASE_URL=libsql://…` + `DATABASE_AUTH_TOKEN` (không có sẵn trong `.env.local`).**

## Test scenarios

- [ ] Happy path: phòng 4 người, "Dịch vụ chung" 150.000/người, N = 3 → dòng SL 4, thành tiền 1.800.000, tổng = tạm tính + điện + nước.
- [ ] Happy path: phòng 1 người → số tiền **không đổi** so với trước feature (chống hồi quy).
- [ ] Edge: đổi N từ 1 → 3 → dòng theo số người thành `4 × 3 = 12` (theo SL × N), **không** bị reset SL về 3.
- [ ] Edge: xoá 1 khách ở chung → hoá đơn cũ không đổi; hoá đơn mới SL còn 3.
- [ ] Edge: mở hoá đơn demo cũ (JSON không có `months`) → bảng + PDF hiển thị như cũ, tổng không đổi.
- [ ] Edge: Xe máy đặt Số lượng = 2 ở trang phòng → hoá đơn mới có dòng SL 2; sửa tay cột SL thành 1 ở màn tạo hoá đơn → hoá đơn đó chỉ lưu SL 1, lần sau vẫn lấy 2 từ phòng.
- [ ] Edge: Xe máy đặt Số lượng = 0 → không sinh dòng trên hoá đơn mới.
- [ ] Edge: bật cờ theo số người cho dịch vụ đơn vị "xe" → SL = số người (chấp nhận vì cờ mở cho mọi dịch vụ), tắt cờ → quay lại `defaultQuantity`.
- [ ] Lỗi: gửi `defaultPrice` âm / tên rỗng / `perPerson` không phải boolean → `serviceItemSchema` chặn, trả "Dữ liệu không hợp lệ".
- [ ] Lỗi: hoá đơn gửi `months = 0` hoặc số âm → kẹp về 1 khi tính, không cho tổng âm.
- [ ] In ấn: xuất PDF + ảnh PNG của hoá đơn 4 người → có cột Số tháng và nhãn `(4 người)`, tổng khớp UI.

## Trạng thái

- [x] Spec được duyệt (bởi người dùng) — duyệt mockup 2026-10-01
- [ ] Code hoàn thành
- [ ] Test + build pass (`npm test`, `npm run build`)
- [ ] Schema đã đẩy lên Turso trước khi push
