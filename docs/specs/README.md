# docs/specs — Quy trình Spec-Driven

Mỗi feature = **1 file spec** đặt trong thư mục này, đặt tên `YYYY-MM-DD-ten-ngan-feature.md`.

## Luồng làm việc

```
/spec  →  Claude viết spec theo template-spec.md  →  BẠN review
   ↓ (duyệt)
  spec thành plan đánh số (Task breakdown)  →  implement từng task
   ↓
  verify (npm test + npm run build)  →  đánh tick [x] trong spec
```

## Quy tắc

- **Spec là nguồn sự thật.** Nếu code lệch hướng → sửa spec ngay, không sửa "lặng lẽ" rồi để spec cũ nói sai.
- **Không code trước khi spec được duyệt.** Claude dừng và chờ sau khi viết xong spec.
- **Khi nào bắt buộc spec:** feature chạm ≥ 4 files, đổi schema Prisma/DB, có quyết định kiến trúc, hoặc việc bạn không muốn làm lại. (Dự án này đã từng thành công với mô hình 1 spec + plan: `docs/superpowers/specs/`.)
- **Khi nào KHÔNG cần spec:** bug nhỏ, sửa 1 dòng, đổi text/nhãn, đổi màu. Làm thẳng để tránh overkill.
- **Spec phải đọc được trong 2 phút.** Dài quá nghĩa là chưa hiểu rõ vấn đề.
- Spec đã xong → giữ nguyên (lịch sử quyết định). Muốn đổi hành vi → viết spec mới.

## Cấu trúc

- `template-spec.md` — mẫu spec (nhân bản khi bắt đầu feature mới)
- `YYYY-MM-DD-...md` — spec của từng feature
- `docs/superpowers/` — lưu trữ lịch sử spec/plan Phase 1 (đã hoàn thành)
