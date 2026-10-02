# Quản Lý Nhà Trọ

Ứng dụng web quản lý một toà nhà cho thuê của gia đình tại Việt Nam: **15 phòng ở
(3 tầng × 5 phòng) + 1 mặt bằng thương mại** = 16 đơn vị. Giai đoạn 1 phục vụ nội
bộ (chủ nhà/admin): phòng, khách thuê, hợp đồng, hoá đơn + PDF, thu tiền, sổ sách
thu–chi (xuất Excel), chi tiêu, bảo trì và tài khoản người dùng.

## Công nghệ

Next.js 14 (App Router) · TypeScript · Prisma 7 + SQLite/Turso libSQL · NextAuth v5
(Credentials) · Tailwind CSS · Zod · Vitest · Playwright · `@react-pdf/renderer`
(PDF hoá đơn) · `xlsx` (xuất sổ sách) · Vercel Blob (ảnh).

## Chạy local

```bash
npm install
cp .env.example .env.local     # DATABASE_URL="file:./dev.db" + AUTH_SECRET
npx prisma db push             # đồng bộ schema vào SQLite local
npm run db:seed                # admin@nhatro.local / doimatkhau + 16 phòng
npm run dev                    # http://localhost:3000
```

> Local dùng `prisma db push` — **không** dùng `prisma migrate dev`
> (không có bảng `_prisma_migrations` trong `dev.db`).
> Đổi mật khẩu admin: `node scripts/set-admin-password.mjs <email> <mật-khẩu-mới>`.

## Chạy bản demo (dữ liệu giả để showcase)

Muốn demo giao diện mà **không lộ thông tin thật** (khách, giá thuê, số tài
khoản)? Tạo một DB riêng chỉ chứa dữ liệu giả:

```bash
npm run demo:reset     # tạo prisma/demo.db + ghi dữ liệu giả, trỏ .env.local vào đó
npm run dev            # mở http://localhost:3000
```

Bộ dữ liệu giả gồm: 15 phòng (13 đang thuê + 2 trống, **Phòng 201** luôn để trống
cho `e2e/flow.spec.ts`), khách thuê + người ở cùng với tên/SĐT/CCCD/biển số giả,
13 hợp đồng, **39 hoá đơn của 3 tháng gần nhất** (đủ loại `room` / `elec_water` /
`both`, có hoá đơn đã thu đủ, thu một phần, chưa thu và quá hạn), 49 lần thu tiền,
chi tiêu 3 tháng, 3 lịch bảo trì (1 quá hạn, 1 sắp đến hạn) và 2 hồ sơ thanh toán
với số tài khoản giả. Không dùng ảnh (CCCD/QR/biên lai để trống).

| Lệnh | Việc |
|---|---|
| `npm run demo:reset` | Xoá `prisma/demo.db` → đẩy schema → ghi lại dữ liệu giả |
| `npm run demo:push` | Chỉ đẩy schema vào `prisma/demo.db` |
| `npm run demo:seed` | Chỉ ghi lại dữ liệu giả (giữ nguyên schema) |

> **`prisma/demo.db` được commit sẵn trong repo** (dữ liệu giả, không có thông tin
> thật), nên chỉ cần trỏ `DATABASE_URL="file:./prisma/demo.db"` vào là test được
> ngay, không phải seed lại. Vì dữ liệu sinh theo seed cố định nên `npm run demo:reset`
> cho ra đúng bộ dữ liệu đó — nhưng nó sẽ làm file này "modified" trong git.

**An toàn:** script chỉ chạy khi `DATABASE_URL` là `file:` **và** tên file kết thúc
bằng `demo.db` — nó từ chối mọi URL Turso (`libsql://`), không đọc
`DATABASE_AUTH_TOKEN`, và **xoá sạch dữ liệu trong file demo** trước khi ghi. File
`prisma/demo.db` đã nằm trong `.gitignore`.

**Quay lại dữ liệu thật:** xoá (hoặc comment) dòng `DATABASE_URL` mà script đã
thêm vào `.env.local`. Dữ liệu thật trên Turso không bị ảnh hưởng trong bất kỳ
bước nào.

## Lệnh thường dùng

| Lệnh | Việc |
|---|---|
| `npm run dev` | Dev server (localhost:3000) |
| `npm test` | Chạy toàn bộ Vitest |
| `npx vitest run <path>` | Chạy 1 file test |
| `npm run build` | Build production (TS + ESLint chạy trong bước này) |
| `npx prisma db push` | Đồng bộ schema với SQLite local |
| `npx prisma generate` | Sinh lại Prisma client |
| `npm run db:seed` | Seed admin + 16 đơn vị |
| `npm run demo:reset` | Tạo/ghi lại DB demo (dữ liệu giả) — xem mục trên |
| `npm run sync:pdf-worker` | Copy worker pdf.js vào `public/` (tự chạy trước `dev`/`build`) |
| `npx playwright test` | E2E (`e2e/`) |

Sau khi đổi schema hoặc server action, **khởi động lại dev server** — HMR của
Next.js không luôn nhận thay đổi phía server.

## Cấu trúc

| Thư mục | Nội dung |
|---|---|
| `app/(app)/` | Các trang đã xác thực: Tổng quan, Phòng, Hoá đơn, Sổ sách, Chi tiêu, Bảo trì, Người dùng, Cài đặt |
| `app/api/` | `auth` (NextAuth), `upload`, `files/[...path]` — hai route file tự kiểm phiên |
| `lib/` | Logic thuần + schema Zod + Prisma client (đều có unit test) |
| `components/` | UI dùng chung (nav, toast, form, lightbox…) |
| `prisma/` | `schema.prisma`, 10 migration, `seed.ts`, `seed-demo.ts` (dữ liệu giả) |
| `scripts/` | Script vận hành: đẩy schema lên Turso, tạo DB demo, đổi mật khẩu, import Excel, kiểm tra DB |
| `docs/` | `SRS.md` (đặc tả hiện hành), `CHANGELOG.md`, `specs/` (quy trình spec-driven), `superpowers/` (lịch sử Phase 1) |
| `e2e/` | Playwright |

## Tài liệu

- **`docs/SRS.md`** — đặc tả nguồn sự thật (mô hình dữ liệu, FR/NFR, quy tắc nghiệp vụ).
- **`docs/CHANGELOG.md`** — dòng thời gian quyết định (đổi quy tắc nghiệp vụ thì cập nhật cả SRS + CHANGELOG trong cùng commit).
- **`CLAUDE.md`** — hướng dẫn kiến trúc/lint cho AI agent.
- **`DEPLOY.md`** — deploy Vercel + Turso (Vercel **không** tự chạy migration).

## Dịch vụ theo số người & số tháng

Mỗi dòng hoá đơn có **2 trục số lượng**: **SL** (số người ở / số xe / 1 cho tiền thuê) và
**Số tháng (N)**; thành tiền = `SL × đơn giá × N`.

- Ở trang chi tiết phòng, mỗi dịch vụ có ô tick **"tính theo số người"** (ô Số lượng bị vô
  hiệu hoá) hoặc một **Số lượng** cố định — ví dụ Xe máy = 2; đặt 0 thì dịch vụ không xuất
  hiện trên hoá đơn mới.
- Số người ở = **1 người thuê chính + khách ở chung** (đọc tự động, không phải nhập tay);
  vẫn sửa được cột SL ở màn tạo hoá đơn nếu thực tế khác.
- Hoá đơn **đã tạo** giữ nguyên số tiền: sửa giá/xe/số người ở trang phòng không làm đổi
  hoá đơn cũ, và hoá đơn cũ (chưa có `months`) in ra y như trước.

## Tracking thanh toán theo tháng

`/tracking-thanh-toan` hiển thị phòng × 12 tháng, tách tiền phòng/dịch vụ và điện/nước.
Kỳ đã trả đủ ẩn trong form tạo; kỳ đã lập nhưng còn thiếu dẫn về hoá đơn cũ.
Chọn nhiều tháng qua năm không mất lựa chọn; điện/nước phải là kỳ liên tiếp.
Hoá đơn cũ có nút **Gán / sửa kỳ tracking**, chỉ cập nhật kỳ và không sửa tiền.
Phòng 303 trong DB demo giữ các ví dụ chưa gán kỳ để kiểm tra luồng đối chiếu.

Sau khi lấy code mới: `node scripts/apply-tracking-local.mjs` bổ sung bảng tracking
vào DB local đang cấu hình, có backup và chạy lại an toàn. Script từ chối remote.
`node scripts/demo-tracking.mjs` chỉ bổ sung kỳ cho DB giả `prisma/demo.db`.
Khởi động lại dev server sau thay đổi schema/server action.

## Xuất hoá đơn

Trên trang chi tiết hoá đơn, nút **"Xuất hoá đơn"** cho 2 lựa chọn:

- **Tải PDF** — render server-side, đúng mẫu hoá đơn của gia đình (bảng dịch vụ,
  bảng chỉ số điện/nước, thông tin ngân hàng + QR).
- **Ảnh PNG (điện thoại)** — ảnh dọc rộng 1080px, chữ lớn và tổng tiền ở đầu,
  khoản thu kèm công thức phía dưới, điện/nước từng khối. Tạo trên trình duyệt
  từ layout mobile của cùng dữ liệu hoá đơn, tiện gửi Zalo. Chiều cao theo nội
  dung; nhiều dòng có thể xuất nhiều ảnh. PDF tải xuống vẫn là A4.

> Ảnh dùng `pdfjs-dist` ở client; worker của nó được phục vụ tĩnh từ
> `public/pdf.worker.min.mjs` (tự copy bằng `npm run sync:pdf-worker`, chạy kèm
> `predev`/`prebuild`) vì webpack không bundle được file worker `.mjs`.

Mẫu in A4, font/màu/khoảng cách được cấu hình trong `INVOICE_THEME` và
`StyleSheet` tại `lib/invoice-pdf.tsx`. Mẫu có người thuê, hạn thanh toán, kỳ riêng
cho từng bảng, chỉ số cũ/mới và tổng tiền nổi bật. Dòng tiền không bị tách đôi
khi sang trang; hoá đơn thông thường 5 dòng dịch vụ + điện/nước + QR vừa 1 trang.
Thông tin ngân hàng, ảnh QR và ghi chú vẫn sửa tại **Cài đặt → Hồ sơ thu tiền**;
hồ sơ trên hoá đơn ưu tiên trước hồ sơ phòng và hồ sơ mặc định. Mẫu PNG nằm ở
`lib/invoice-mobile-pdf.tsx`; tải riêng và xuất lô dùng cùng mẫu mobile.
PNG không hiển thị khối chuyển khoản/QR; các nội dung hoá đơn còn lại giữ nguyên.
Tiền trên cả hai mẫu luôn lấy từ snapshot hoá đơn đã lưu.

### Xuất theo lô (cả tháng một lượt)

Trên danh sách `/hoa-don`, tick các hoá đơn cần xuất (hoặc bấm **Chọn tất cả (N)**)
rồi **Xuất ảnh (N)**:

- **Tải ZIP** — một file zip chứa toàn bộ ảnh PNG (dùng `fflate`, nén mức store).
- **Lưu vào thư mục…** — chọn thư mục rồi app ghi thẳng từng ảnh vào đó
  (chỉ Chrome/Edge; trình duyệt khác sẽ chỉ thấy nút ZIP).

Để chọn nhanh đúng lô cuối tháng, danh sách có thêm 2 bộ lọc: **Kỳ** (lọc theo
`periodLabel` — nhãn kỳ đúng như bạn gõ/import, gộp các nhãn chỉ khác nhau về dấu
cách) và **Loại** (Tiền phòng / Điện nước / Phòng + Điện nước). Ví dụ: `Kỳ = Tháng
9/2026` + `Loại = Điện nước` → **Chọn tất cả (13)** → **Tải ZIP**.

Tên file trong gói có kèm loại hoá đơn (vd `hoa-don-Phong-201-Thang-9-2026-Dien-nuoc.png`)
nên một phòng có 2 hoá đơn cùng kỳ vẫn không trùng nhau. Trong lúc xuất có thanh tiến
độ và nút **Huỷ**; nếu một hoá đơn lỗi thì các hoá đơn còn lại vẫn xuất tiếp và cuối
cùng báo rõ hoá đơn nào lỗi.

## Lưu ý

- Toàn bộ tiền là **số nguyên VND**, định dạng bằng `formatVND()` (`1.500.000 ₫`).
- Giao diện tiếng Việt; so sánh hạn thanh toán theo múi giờ `Asia/Ho_Chi_Minh`.
- Cần `AUTH_SECRET` trong `.env.local` thì mới đăng nhập được ở local.
- **Thông báo Zalo đã bị gỡ** (2026-08-01) — không còn cron, `NotificationLog`,
  `ZALO_OA_ACCESS_TOKEN`/`CRON_SECRET`.
