# Changelog — Nhật ký thay đổi hành vi & quyết định

> Bổ trợ cho [docs/SRS.md](SRS.md): SRS ghi **trạng thái hiện tại**, file này ghi
> **dòng thời gian quyết định** (đã đổi gì, vì sao, tác động tới đâu). Mục mới
> nhất ở trên. Khi đổi một quy tắc nghiệp vụ → cập nhật **cả hai** file trong
> cùng commit.

---

## 2026-09-14 — Xuất hoá đơn theo lô (chọn nhiều → ZIP / lưu vào thư mục)

**Trước:** mỗi hoá đơn phải mở ra và xuất ảnh riêng; cuối tháng lập hoá đơn cho 13
phòng thì phải làm 13 lần.

**Sau:**
- Trên `/hoa-don`: **ô tick** từng dòng, **"Chọn tất cả (N)"** (tick đúng danh sách
  đang hiện sau khi lọc) và thanh **"Xuất ảnh (N)"** → **Tải ZIP** (mọi trình duyệt)
  hoặc **Lưu vào thư mục…** (Chrome/Edge). Có tiến độ `Đang xuất 5/13 · Phòng 304`,
  nút **Huỷ**, lỗi từng hoá đơn không làm hỏng cả lô.
- Thêm 2 bộ lọc để chọn đúng lô: **Kỳ** (theo `Bill.periodLabel`) và **Loại**
  (Tiền phòng / Điện nước / Phòng + Điện nước), AND với ô tìm kiếm và chip trạng thái.
- Tên file trong gói kèm loại hoá đơn (`…-Dien-nuoc.png`, `…-Tien-phong.png`) nên
  một phòng có 2 hoá đơn cùng kỳ vẫn không trùng; ZIP cùng kỳ →
  `hoa-don-Thang-9-2026.zip`.
- Thêm dependency **`fflate@0.8.3`** (tạo ZIP ở client, mức nén store vì PNG đã nén).

**Quyết định đáng ghi:** lọc kỳ dùng **`periodLabel`** (không dùng `dueDate`) vì đó
là kỳ in trên hoá đơn. Nhưng nhãn này là **văn bản tự do** và dữ liệu thật rất lệch
nhau — file `Thông tin thuê nhà.xlsx` có **11 nhãn khác nhau** (`"Tháng 6/2026"`,
`"Tháng 5+6+7/2026"`, `"Tháng 5+6+7/2026 (giữa tháng)"`, `"Tháng 6, 7, 8/2026"`,
`"15/6 đến hết tháng 8/2026"`, `"Tháng 7+8+9/ 2026"` lệch dấu cách…), nên nhóm theo
khoá **bỏ dấu + bỏ mọi khoảng trắng**, so khớp bằng nhau, và sắp theo mốc tháng mới
nhất. Chính 11 nhãn thật này được dùng làm fixture test.

**Lý do:** cuối tháng cần gửi hoá đơn cho cả toà; xuất từng cái mất thời gian.

**Kiểm chứng (Edge thật, DB demo 39 hoá đơn):** lọc `Tháng 9/2026` → `Chọn tất cả`
(13) → ZIP `hoa-don-Thang-9-2026.zip` gồm 13 PNG 1654×2340, đúng tỉ lệ loại hoá đơn
(10 `both` + 2 `room` + 1 `elec_water`), tên không trùng; đường "Lưu vào thư mục"
(giả lập picker) ghi đủ 13 file; lô toàn bộ 39 hoá đơn → `hoa-don-39-anh-2026-09-14.zip`
39 file; không có lỗi console.

**Tài liệu:** `docs/SRS.md` (FR-4), `README.md`, `CLAUDE.md`.

---

## 2026-09-14 — Xuất hoá đơn dạng ảnh PNG (bên cạnh PDF)

**Trước:** trang chi tiết hoá đơn chỉ có nút "Xuất PDF"; muốn gửi hoá đơn qua Zalo
phải gửi file PDF.

**Sau:**
- Nút **"Xuất hoá đơn"** (menu xổ xuống) trên `/hoa-don/[id]` gồm *Tải PDF* (như cũ)
  và *Ảnh PNG (nét)*.
- Ảnh PNG được tạo **ngay trên trình duyệt** từ chính PDF hoá đơn: `pdfjs-dist`
  render trang lên canvas → `toBlob("image/png")`. Không đụng server, không thêm
  thư viện native, ảnh giống hệt bản PDF. Bề rộng mục tiêu **1654 px**
  (≈200 DPI với A4 ⇒ 1654×2340 px, ~200–260 KB), tên file
  `hoa-don-<phòng>-<kỳ>.png` (nhiều trang thì `-trang-N`).
- Thêm dependency **`pdfjs-dist@4.10.38`** (ghim bản 4 — bản 6.x đòi Node ≥22.13).
  Worker của pdf.js **không bundle được** (webpack báo lỗi cú pháp trên file
  worker `.mjs` 1,4 MB), nên nó được phục vụ tĩnh từ `public/pdf.worker.min.mjs`,
  copy tự động bằng `scripts/sync-pdf-worker.mjs` gắn vào `predev`/`prebuild`
  (file này nằm trong `.gitignore`). Middleware thêm `pdf.worker.min.mjs` vào
  danh sách miễn xác thực vì đây là file thư viện công khai.
- Hàm thuần `lib/invoice-image.ts` (đặt bề rộng mục tiêu → scale, tên file bỏ
  dấu) + 11 unit test; phần chạy ở trình duyệt `lib/invoice-image-client.ts`;
  UI `components/invoice-export-menu.tsx`.

**Lý do:** chủ nhà cần gửi hoá đơn dạng ảnh cho khách qua Zalo; PDF vẫn giữ cho
in/lưu trữ.

**Kiểm chứng (Edge thật, DB demo):** xuất thành công cho cả 3 loại hoá đơn
`both`/`elec_water`/`room` — 1654×2340 px, 198–258 KB, worker trả 200, không có
lỗi console; khung mực của ảnh khớp khung chữ trong PDF (lệch ≤6 px) nên ảnh
không bị cắt/thiếu nội dung.

**Tài liệu:** `docs/SRS.md` (§FR-4, NFR-1), `README.md`, `CLAUDE.md`.

---

## 2026-09-14 — Bộ dữ liệu demo cho showcase (DB local riêng)

**Trước:** chỉ có `prisma/seed.ts` tạo 16 đơn vị trống + 1 admin, nên muốn trình
diễn hệ thống phải dùng dữ liệu thật (khách, giá thuê, số tài khoản).

**Sau:** thêm công cụ dựng một DB local **chỉ chứa dữ liệu giả**:
- `lib/demo-data.ts` (+ `lib/demo-data.test.ts`, 19 test) — generator thuần, tất
  định (PRNG seed cố định); mọi con số tiền đi qua helper production
  (`buildDefaultLineItems`, `computeSubtotal`, `computeGrandTotal`,
  `computeMeterAmount`, `billStatusFor`) nên thoả đúng bất biến của hệ thống.
- `prisma/seed-demo.ts` — ghi dataset vào DB; `scripts/demo-db.mjs` — xoá file →
  `prisma db push` → `prisma generate` → seed, và trỏ `.env.local` vào
  `prisma/demo.db` bằng URL tuyệt đối (tránh lệch đường dẫn `file:` giữa Prisma
  CLI và `lib/db.ts`).
- Lệnh mới: `npm run demo:reset` / `demo:push` / `demo:seed`.
- Chặn an toàn: chỉ chạy khi `DATABASE_URL` là `file:` và tên file kết thúc bằng
  `demo.db`; không đọc `DATABASE_AUTH_TOKEN`; xoá dữ liệu trong file demo trước
  khi ghi. `prisma/demo.db` đã bị `.gitignore` (`*.db`).

**Dữ liệu:** 15 phòng (13 đang thuê + 2 trống, chừa `Phòng 201` cho E2E), 18
khách (13 đại diện + 5 người ở cùng), 13 hợp đồng, 39 hoá đơn 3 tháng gần nhất
(đủ `room`/`elec_water`/`both`; 2 quá hạn, 5 chưa thu, phần còn lại đã thu — có
hoá đơn thu 2 lần), 49 lần thu, 12 khoản chi 3 tháng, 3 lịch bảo trì (1 quá hạn,
1 sắp đến hạn), 2 hồ sơ thanh toán. Không sinh ảnh.

**Lý do:** cần showcase hệ thống (và chụp màn hình) mà không lộ thông tin của
gia đình; đồng thời giữ được một bộ dữ liệu mẫu đủ mọi trạng thái nghiệp vụ.

**Tài liệu:** `README.md` (mục "Chạy bản demo"). Không đổi code sản phẩm, không
thêm migration, không đổi `docs/SRS.md`.

---

## 2026-09-14 — Đồng bộ tài liệu với mã nguồn (SRS 1.2)

**Trước:** `docs/SRS.md` (v1.1) lệch với code ở 4 điểm: vẫn mô tả tính năng thông
báo Zalo (FR-10, bảng tích hợp, `NotificationLog`, `Setting.adminZaloUserId`,
`/api/cron`) dù đã gỡ; bảng `Payment` ghi `receiptImageUrl`; thiếu `Bill.type`;
bảng migration dừng ở 2026-07-02. `CLAUDE.md` vẫn ghi `app/api/` có `cron`, và
`README.md` còn là boilerplate `create-next-app`.

**Sau:**
- `docs/SRS.md` → **v1.2**: gỡ mọi phần Zalo (chuyển thành ghi chú "đã gỡ" ở §10
  và hàng `remove_zalo_notifications` trong bảng migration); `Payment.receiptImages`
  (Json, `MAX_RECEIPT_IMAGES = 10`); thêm `Bill.type` + quy tắc tiền theo loại
  hoá đơn (§6.2); quy tắc quá hạn sửa thành **`≥` ngày đến hạn theo ngày VN**
  (§6.1); FR-3 bổ sung trang Sửa + điều kiện xoá; FR-5 bổ sung cột "Tổng thu";
  NFR-1/NFR-2 khớp middleware + `$queryRawUnsafe`; NFR-4 ghi rõ local `db push`
  vs production `push-turso-schema.mjs`; §9 đủ 10 migration.
- `CLAUDE.md`: sửa bảng thư mục (`app/api/` = auth/upload/files), nêu rõ
  `auth.config.ts` ↔ `auth.ts`, điều kiện xoá hoá đơn, `billStatusFor` dùng `≥`,
  và thêm mục "Removed features" để không dựng lại Zalo từ ghi chú cũ.
- `README.md`: viết lại thành README thật của dự án (quickstart, lệnh, cấu trúc,
  liên kết tài liệu).

**Lý do:** `docs/superpowers/*` là lịch sử Phase 1; SRS/CHANGELOG/CLAUDE.md là
nguồn đang dùng. Tài liệu sai khiến agent (và người) viết code dựa trên tính năng
không còn tồn tại.

**Tài liệu:** `docs/SRS.md` (v1.2), `CLAUDE.md`, `README.md`. Không đổi code,
không cần migration.

---

## 2026-08-31 — "Đang thuê" tính từ hợp đồng, không tin cột `Unit.status`

**Trước:** dropdown lập hoá đơn, badge "Đang thuê" và đếm phòng đang thuê trên
dashboard đều dựa vào cột denormalized `Unit.status`. Cột này có thể lệch với
bảng `Lease` (vd import hàng loạt tạo `Lease` nhưng không set `status`), khiến
phòng **có khách thuê** vẫn không hiện trong dropdown lập hoá đơn (đã xảy ra với
Phòng 201/203 trên production).

**Sau:** "đang thuê" được tính động từ hợp đồng còn hiệu lực (`endDate` null
hoặc `≥ hôm nay`). Thêm `hasCurrentOrUpcomingLease()` trong `lib/rooms.ts`;
dropdown `/hoa-don/new` lọc `leases: { some: { OR: [{ endDate: null },
{ endDate: { gte: now } }] } }`; badge `/phong` + `/phong/[id]` và đếm phòng
trên dashboard dùng lease thay vì `Unit.status`.

**Lý do:** một sự thật ("phòng có khách") nên có một nguồn duy nhất là bảng
`Lease`. `Unit.status` giữ lại để lưu trữ/hiển thị, không còn là điều kiện
nghiệp vụ.

**Tài liệu:** `docs/SRS.md` §6.4 đã cập nhật.

---

## 2026-08-30 — Hợp đồng tương lai được hiển thị & lập hoá đơn

**Trước:** hợp đồng chỉ được coi là "hiệu lực" khi `startDate ≤ hôm nay`
(`getActiveLease`). Khách đã ký nhưng chưa đến ngày vào ⇒ không hiện ở trang
phòng, không tạo được hoá đơn.

**Sau:** thêm `getCurrentOrUpcomingLease()` trong `lib/rooms.ts` — coi hợp đồng
là "hiện tại/sắp tới" nếu **chưa kết thúc** (`endDate` null hoặc `≥ hôm nay`),
chọn cái có `startDate` mới nhất, **bất kể** `startDate` ở tương lai.

**Đã chuyển sang hàm mới:** `/phong`, `/phong/[id]`, `/phong/[id]/lich-su`,
`hoa-don/new`, `hoa-don/bill-actions.ts`. `getPastLeases()` cũng dùng lại hàm
này. `getActiveLease()` giữ nguyên nhưng thành code chết (chỉ test tham chiếu).

**Lý do:** muốn xem khách đã thuê kể cả khi chưa đến ngày vào, và lập hoá đơn
cho hợp đồng chưa tới ngày miễn đã có thông tin khách.

**Tài liệu:** `docs/SRS.md` §6.4 đã cập nhật cho khớp.

---

## 2026-08-30 — Sửa lỗi màn hình không chuyển sau khi tạo khách thuê

**Trước:** tạo khách thuê xong toast hiện và dữ liệu đã lưu, nhưng màn hình vẫn
đứng ở form "hợp đồng mới" thay vì chuyển sang thông tin khách.

**Nguyên nhân:** `router.refresh()` bị nuốt khi gọi bên trong `<form
action={clientFn}>` (React chạy trong transition), cộng với bug `getActiveLease`
ở trên.

**Sửa:** thay `router.refresh()` bằng `window.location.reload()` trong các
handler dạng form-action (`new-lease-form.tsx`, `tenant-form.tsx`,
`lease-panel.tsx`, `service-editor.tsx` — chỉ `onAdd`). Handler onClick vẫn giữ
`router.refresh()` (không chạy trong transition nên không bị ảnh hưởng).
