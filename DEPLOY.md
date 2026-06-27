# Deploy lên Vercel

App này (Next.js 14 + Prisma 7) đã được chỉnh để chạy serverless trên Vercel:

- **DB:** Turso (libSQL — SQLite trên cloud). Local vẫn dùng file `dev.db`.
- **Ảnh CCCD:** Vercel Blob (khi deploy) / thư mục `uploads/` (khi local).
- **Nhắc Zalo:** Vercel Cron gọi `/api/cron/notify` mỗi sáng.

---

## 1. Đưa code lên GitHub

Repo đang là local-only. Tạo repo trên GitHub rồi:

```bash
git remote add origin https://github.com/<user>/quan-ly-nha-tro.git
git push -u origin master
```

> `.env`, `dev.db`, `uploads/` đã được `.gitignore` — không bị đẩy lên. Tốt.

## 2. Tạo database Turso

```bash
# Cài CLI (Windows: dùng scoop, hoặc xem https://docs.turso.tech)
turso auth signup
turso db create nhatro

# Nạp schema sẵn có vào Turso (chạy 1 lần)
turso db shell nhatro < prisma/migrations/20260618161817_init/migration.sql

# Lấy thông tin kết nối — giữ 2 giá trị này
turso db show nhatro --url        # -> libsql://nhatro-xxx.turso.io
turso db tokens create nhatro     # -> token dài
```

## 3. Import project vào Vercel

1. vercel.com → **Add New → Project** → chọn repo GitHub vừa push.
2. Framework tự nhận **Next.js**. Không cần đổi build command.
3. Ở tab **Storage** của project → **Connect Store → Blob** (tạo Blob store).
   Vercel tự thêm biến `BLOB_READ_WRITE_TOKEN`.

## 4. Đặt Environment Variables (tab Settings → Environment Variables)

| Biến | Giá trị |
|---|---|
| `DATABASE_URL` | `libsql://nhatro-xxx.turso.io` (bước 2) |
| `DATABASE_AUTH_TOKEN` | token Turso (bước 2) |
| `AUTH_SECRET` | chuỗi ngẫu nhiên: `openssl rand -base64 32` |
| `ZALO_OA_ACCESS_TOKEN` | token Zalo OA |
| `CRON_SECRET` | chuỗi ngẫu nhiên dài bất kỳ |

`BLOB_READ_WRITE_TOKEN` đã được thêm tự động ở bước 3.

## 5. Deploy + seed tài khoản admin

- Bấm **Deploy**. Xong là có URL `https://...vercel.app`.
- Tạo admin trên DB Turso (chạy 1 lần, từ máy bạn — trỏ env sang Turso):

```bash
# PowerShell
$env:DATABASE_URL="libsql://nhatro-xxx.turso.io"
$env:DATABASE_AUTH_TOKEN="<token>"
npm run db:seed
```

Đăng nhập: `admin@nhatro.local` / `doimatkhau` → **đổi mật khẩu ngay**.

## 6. Cron Zalo

`vercel.json` đã khai báo lịch chạy `0 1 * * *` (UTC) = **8h sáng giờ VN**, mỗi ngày.
Vercel Cron tự gửi header `Authorization: Bearer <CRON_SECRET>` nên không cần cấu hình thêm.

> Lưu ý gói **Hobby (free)**: cron tối đa 1 lần/ngày — vừa đủ cho nhắc tiền trọ.

---

## Lưu ý

- **Ảnh CCCD trên Vercel Blob là public URL** (link ngẫu nhiên, khó đoán nhưng về kỹ thuật ai có link đều xem được). Với dữ liệu CCCD nhạy cảm, nếu cần chặt hơn có thể proxy qua route có xác thực — báo mình làm thêm sau.
- Khi đổi schema sau này: chạy `prisma migrate dev` ở local để sinh file SQL mới, rồi `turso db shell nhatro < <file SQL mới>` để áp lên Turso.
