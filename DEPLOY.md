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

> Turso CLI **không có bản Windows**. Trên Windows, tạo DB qua web dashboard
> rồi nạp schema bằng script Node (không cần CLI). macOS/Linux có thể dùng
> `turso` CLI như bình thường.

1. Vào **https://app.turso.tech** → đăng nhập → **Create Database**
   (name `nhatro`, region gần VN nhất, vd Singapore/Tokyo).
2. Lấy **Database URL** (`libsql://...`) và tạo **Auth Token** (Read & Write).
3. Nạp schema + seed admin (chạy 1 lần, từ máy bạn):

```bash
# PowerShell
$env:DATABASE_URL="libsql://nhatro-xxx.turso.io"
$env:DATABASE_AUTH_TOKEN="<token>"
node scripts/push-turso-schema.mjs   # áp toàn bộ prisma/migrations/*
npm run db:seed                      # tạo admin + 16 phòng
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

## 5. Deploy

Bấm **Deploy**. Xong là có URL `https://...vercel.app`.

Đăng nhập bằng admin đã seed ở bước 2: `admin@nhatro.local` / `doimatkhau`
→ **đổi mật khẩu ngay** (xem bên dưới).

### Đổi mật khẩu admin

Hiện chưa có UI đổi mật khẩu — dùng script đặt lại mật khẩu trực tiếp trong DB:

```bash
# PowerShell (Turso)
$env:DATABASE_URL="libsql://nhatro-xxx.turso.io"
$env:DATABASE_AUTH_TOKEN="<token>"
node scripts/set-admin-password.mjs admin@nhatro.local 'Locvung@666'
```

Local (file `dev.db`) thì bỏ qua 2 biến trên. Tham số: `<email> <mật khẩu mới>`.

## 6. Cron Zalo

`vercel.json` đã khai báo lịch chạy `0 1 * * *` (UTC) = **8h sáng giờ VN**, mỗi ngày.
Vercel Cron tự gửi header `Authorization: Bearer <CRON_SECRET>` nên không cần cấu hình thêm.

> Lưu ý gói **Hobby (free)**: cron tối đa 1 lần/ngày — vừa đủ cho nhắc tiền trọ.

---

## Lưu ý

- **Ảnh CCCD trên Vercel Blob là public URL** (link ngẫu nhiên, khó đoán nhưng về kỹ thuật ai có link đều xem được). Với dữ liệu CCCD nhạy cảm, nếu cần chặt hơn có thể proxy qua route có xác thực — báo mình làm thêm sau.
- Khi đổi schema sau này: chạy `prisma migrate dev` ở local để sinh file SQL mới, rồi `turso db shell nhatro < <file SQL mới>` để áp lên Turso.
