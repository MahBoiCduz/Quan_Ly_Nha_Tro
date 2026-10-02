# PNG hóa đơn cho điện thoại

Được duyệt triển khai qua yêu cầu “đối với PNG… xử lý… show lên” ngày 2026-10-01.

- PNG riêng dạng dọc, rộng 1080px, bố cục tương đương màn 360px. Chữ nội dung 14–15px khi mở toàn chiều ngang; tổng tiền ở đầu, người thuê/phòng/kỳ/hạn rõ.
- Tiền phòng/dịch vụ: tên + thành tiền, công thức phía dưới; lấy số tiền snapshot, không tính lại lịch sử. Kỳ phòng và điện/nước độc lập, hiển thị đủ năm.
- Điện/nước: từng khối có chỉ số cũ → mới, tiêu thụ, đơn giá và thành tiền; legacy thiếu chỉ số không suy đoán.
- Theo yêu cầu bổ sung: bỏ thông tin chuyển khoản/QR khỏi PNG, giữ ghi chú ở cuối; đổi nhãn cộng phòng/dịch vụ thành **Tổng tiền**. Ẩn nội dung rỗng. Nội dung dài được xuống dòng, nhiều dòng có thể xuất nhiều ảnh.
- PDF tải/in giữ mẫu A4. PNG đơn lẻ và xuất lô cùng dùng mẫu mobile, từ cùng InvoiceModel và cùng thứ tự chọn hồ sơ thu tiền.
- Reuse renderer PDF và rasterizer hiện hành: route PDF có lựa chọn layout mobile nội bộ, client rasterize ở 1080px rồi cắt phần trắng cuối ảnh, chừa lề. Không thêm DB, không thêm dịch vụ/phụ thuộc.
- Kiểm chứng: model/render tất cả loại + legacy + nhiều dòng/QR, crop ảnh, E2E tải PNG đủ kỳ qua năm, PNG rộng 1080px; build và kiểm tra hình thực tế. Chỉ local/demo.

## Trạng thái

- [x] Phạm vi được người dùng yêu cầu
- [x] Code, test, build và visual QA hoàn tất — 199 test/30 file và 5 E2E pass; TypeScript/Next build pass. E2E kiểm tra PNG đơn lẻ + ZIP đều rộng 1080px, chọn kỳ qua năm và xem ảnh ở 360px. Render kiểm tra cả ba loại, legacy, QR và nhiều dòng; crop giữ nội dung/lề. Còn warning lint ảnh sẵn có.

Ảnh mẫu xuất thực tế từ DB demo: `hoa-don-png-dien-thoai.png`; preview ở 360px:
`hoa-don-png-preview-360.png` trong thư mục visualization của chat. Mẫu sau khi bỏ chuyển khoản: `hoa-don-png-khong-chuyen-khoan-360.png`.

- [x] Deploy production ngày 2026-10-01: https://nhatro-rust.vercel.app — `dpl_FUfXHBE7uu6yNwxXKdvCaHsKDL3k`, Vercel **READY**. Build production pass; trang login, auth session và PDF worker trả HTTP 200, các trang nội bộ chuyển tới login khi chưa đăng nhập. Luồng xuất PNG đã kiểm chứng trên demo; không tạo hóa đơn thử trên DB production.
