# Bắt đầu một feature mới theo quy trình Spec-Driven

Áp dụng quy trình spec-first (đọc `docs/specs/README.md` trước nếu chưa quen).

Làm theo đúng thứ tự:

1. **Làm rõ yêu cầu.** Nếu yêu cầu mơ hồ, hỏi tôi tối đa 3 câu hỏi (ai dùng, làm gì, cần khi nào?). Nếu rõ rồi thì không cần hỏi.
2. **Đọc template** `docs/specs/template-spec.md`.
3. **Viết spec** vào `docs/specs/YYYY-MM-DD-ten-ngan-feature.md` theo đúng template. Điền đầy đủ Yêu cầu, Task breakdown, Test scenarios.
4. **DỪNG LẠI và chờ tôi review.** Tuyệt đối không viết code cho tới khi tôi duyệt spec. Tóm tắt cho tôi: feature làm gì, vài điểm cần tôi chốt.
5. Sau khi tôi duyệt: chuyển Task breakdown thành kế hoạch thực thi, implement từng task, verify bằng `npm test` + `npm run build`, rồi đánh tick trong spec.

Quy tắc cứng:

- **Không code trước khi spec được duyệt.**
- Nếu giữa lúc code phát hiện spec sai hoặc thiếu → dừng lại, báo tôi, sửa spec rồi mới tiếp tục.
- Feature chạm ≥ 4 files, đổi schema Prisma, hoặc có quyết định kiến trúc → bắt buộc spec. Việc nhỏ (bug, đổi text, 1 dòng CSS) thì làm thẳng, không spec.
