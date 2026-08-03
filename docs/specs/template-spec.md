# <Tên feature>

> **Dùng mẫu này cho mỗi feature mới.** Nhân bản thành `docs/specs/YYYY-MM-DD-ten-ngan-feature.md`, điền đầy đủ, xoá các dòng chú thích `>`.

## Tổng quan

2–3 câu: feature này là gì, giải quyết vấn đề gì cho người dùng (chủ nhà trọ / admin), nằm ở đâu trong luồng nghiệp vụ.

## Bối cảnh

Vì sao cần bây giờ? Liên kết tới `CLAUDE.md`, spec gốc Phase 1 (`docs/superpowers/specs/`), hoặc yêu cầu cụ thể. Ghi lại các quyết định đã thảo luận (các lựa chọn cân nhắc + vì sao chọn cái này) — phần này là "Think" của spec, giúp người đọc hiểu lý do mà không cần hỏi lại.

## Yêu cầu

### Chức năng (viết theo dạng "Khi X → Y", có thể dùng làm acceptance criteria)

- [ ] Khi user <hành động> → hệ thống <kết quả mong đợi>
- [ ] Khi user <hành động với dữ liệu không hợp lệ> → báo lỗi <thông báo cụ thể, tiếng Việt>
- [ ] Không khi <điều kiện chặn> → chặn/chuyển trạng thái <...>

### Kỹ thuật

- **Schema:** cột/bảng mới cần thêm — migration vào thư mục nào, nhớ apply lên Turso trước khi merge (xem `CLAUDE.md` → Deploy)
- **Reuse:** tái sử dụng file/lib nào (`lib/billing.ts`, `lib/format.ts`, `components/toast.tsx`...), tuyệt đối tránh viết trùng logic
- **Quy ước dự án:** money = int VND + `formatVND()`, Zod validate mọi input, server action `"use server"` + `revalidatePath()` + `redirect()`, UI tiếng Việt

## Giả định & Edge cases

- **Giả định:** ví dụ "chỉ admin mới được tạo hóa đơn"
- **Edge:** ví dụ "xoá phòng đang có hợp đồng → xử lý thế nào?"; "hoá đơn đã có payment → không edit được (edit guard)"

## Task breakdown

Đánh số, mỗi task nhỏ đủ để commit riêng và verify được:

1. [ ] Migration + Prisma schema
2. [ ] Zod schema + server action
3. [ ] UI component
4. [ ] Unit test (`npm test` / `npx vitest run ...`)
5. [ ] Build verify (`npm run build`) + cập nhật `CLAUDE.md` nếu có quy ước mới

## Test scenarios

- [ ] Happy path: <thao tác hợp lệ> → <kết quả đúng>
- [ ] Edge: <thao tác biên> → <hành vi mong đợi>
- [ ] Lỗi: <input sai> → <thông báo lỗi rõ ràng>

## Trạng thái

- [ ] Spec được duyệt (bởi người dùng)
- [ ] Code hoàn thành
- [ ] Test + build pass (`npm test`, `npm run build`)
