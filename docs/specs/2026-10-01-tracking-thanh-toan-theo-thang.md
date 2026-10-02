# Tracking thanh toán theo phòng và tháng

> Trạng thái: **được duyệt để triển khai ngày 2026-10-01**, qua yêu cầu "Oke. Chạy thôi". Triển khai production vẫn là bước riêng.

## Tổng quan

Thêm ma trận phòng × tháng để admin biết từng phòng đã đóng tiền phòng/dịch vụ và điện/nước cho kỳ nào. Tích hợp cùng dữ liệu vào màn tạo/sửa hoá đơn để chọn kỳ còn thiếu, tránh lập trùng và giữ liên kết với hoá đơn cần thu tiếp.

## Bối cảnh

- Tuân theo [quy trình spec](README.md), [kiến trúc](../../CLAUDE.md), [SRS](../SRS.md) và [quy tắc SL × đơn giá × số tháng](2026-10-01-gia-dich-vu-theo-so-nguoi.md).
- Hiện `Bill.periodLabel` là văn bản tự do; loại hoá đơn đã phân biệt `room`, `elec_water`, `both`. `Payment` ghi số tiền cho cả hoá đơn, không phân bổ theo tháng/khoản.
- Đã chốt: ma trận theo năm; kỳ phòng và điện/nước độc lập; thu một phần áp dụng trạng thái cho cả kỳ; tháng đã trả đủ ẩn khỏi lựa chọn. Máy tính ưu tiên nhập liệu, điện thoại mặc định xem. Giữ nền cream, surface trắng, brand cam đất, font Be Vietnam Pro và các component của hệ thống.
- Hoá đơn giữ snapshot số tiền, SL và số tháng; không thay đổi lịch sử khi cấu hình phòng đổi. PNG được tạo từ PDF, không dựng mẫu riêng.

## Yêu cầu

### Chức năng

**Chọn kỳ và tạo/sửa hoá đơn**

- [x] Khi chọn phòng → nạp kỳ của **hợp đồng mà hoá đơn sẽ thuộc về**, kèm tên khách/hợp đồng để kiểm tra; không dùng thanh toán của khách cũ để khoá kỳ khách mới. Việc chọn hợp đồng hiện tại/sắp tới giữ quy tắc hiện hành; bản này chưa thêm luồng tạo hoá đơn cho hợp đồng đã kết thúc.
- [x] `room` cần ≥1 tháng phòng; `elec_water` cần ≥1 tháng điện/nước; `both` cần cả hai danh sách. Lưu tháng/năm chuẩn `YYYY-MM`, không lặp tháng.
- [x] Khi chuyển năm → giữ tất cả tháng đã chọn, hiển thị chip có năm và nút bỏ từng tháng. Ví dụ T11/2026, T12/2026, T1/2027 = 3 tháng. Chuyển phòng xoá lựa chọn cũ và nạp lại dữ liệu; chuyển loại chỉ gửi danh sách khoản đang áp dụng.
- [x] Tiền phòng cho chọn tháng rời. Điện/nước chỉ cho chọn các tháng liên tiếp; nếu rời báo **"Kỳ điện/nước phải liên tiếp. Vui lòng lập hóa đơn riêng cho các kỳ cách nhau."** Một bộ chỉ số tính lượng tiêu thụ toàn kỳ, không nhân số tháng.
- [x] Khi kỳ đã trả đủ trên hoá đơn khác → ẩn khỏi lựa chọn, vẫn xem được trong lịch sử thu gọn. Kỳ đã lập nhưng chưa trả/đang trả → hiển thị trạng thái và liên kết hoá đơn cũ, không cho chọn để lập thêm.
- [x] Khi đang sửa → các kỳ của chính hoá đơn vẫn được chọn; loại trừ chính hoá đơn khi kiểm tra trùng. Giữ khoá sửa tiền khi đã có bất kỳ `Payment`; chặn xoá mọi hoá đơn có `Payment`, kể cả thu một phần.
- [x] Khi không chọn đủ kỳ → chặn lưu với **"Vui lòng chọn kỳ tiền phòng."** hoặc **"Vui lòng chọn kỳ điện/nước."** Server kiểm tra lại tính hợp lệ và trùng kỳ, báo **"Kỳ này đã có hóa đơn. Vui lòng kiểm tra hóa đơn cũ."**
- [x] Với hoá đơn mới, số tháng phòng mặc định cho mọi dòng dịch vụ = số tháng phòng được chọn; SL độc lập và vẫn sửa được. Cho chỉnh số tháng từng dòng trong phần mở rộng; dòng đã chỉnh riêng không bị tự ghi đè khi đổi kỳ. Đây là tracking theo nhóm phòng/dịch vụ, không khẳng định từng dịch vụ đã trả cho từng tháng.
- [x] Khi mở/sửa hoá đơn cũ → gán hoặc đổi kỳ không tự tính lại số tháng của snapshot. Không đổi tiền nếu chỉ bổ sung metadata kỳ. Giữ quy tắc dịch vụ thu đủ tháng theo số người lúc tạo, cho sửa SL thủ công; không tự chia theo ngày.
- [x] Gợi ý tiêu đề từ kỳ có cấu trúc: **"Tháng 11–12/2026 và 1/2027"**. Với hai nhóm khác kỳ, gợi ý ghi rõ cả hai nhóm. Cho sửa tiêu đề; sau khi sửa tay, đổi kỳ không ghi đè tiêu đề mà hiện gợi ý để người dùng áp dụng. Tracking chỉ dùng danh sách tháng, không suy từ tiêu đề.

**Giao diện**

- [x] Máy tính: thông tin chung phía trên; tracker hai dòng với năm và chip kỳ; bảng dịch vụ cạnh phần điện/nước khi đủ rộng, xếp dọc khi thiếu chỗ; tổng tiền và nút lưu chung một hàng cuối. Hồ sơ thu tiền và chỉnh đơn vị/số tháng từng dòng thu gọn, có nhãn tóm tắt.
- [x] Điện thoại: mặc định mở chi tiết chỉ đọc với tổng tiền, đã thu, còn thiếu, kỳ, trạng thái và hoá đơn liên quan; chi tiết dịch vụ/chỉ số mở theo nhu cầu. Admin vẫn có đường chuyển sang form chỉnh sửa; không đổi quyền theo thiết bị.
- [x] Dùng input/nút có nhãn, thao tác bàn phím và focus rõ; vùng chạm khoảng 44px. Khi tải trạng thái hoặc lỗi tải, không coi là danh sách kỳ trống: chặn lưu cho tới khi tải thành công, cho thử lại. Server luôn kiểm tra lại khi lưu.

**Ma trận `/tracking-thanh-toan`**

- [x] Thêm mục điều hướng; chọn năm mặc định hiện tại theo giờ Việt Nam, lọc phòng/tầng; hàng là phòng, cột là 12 tháng. Mỗi ô có tiền phòng và điện/nước, bấm mở các hoá đơn/hợp đồng liên quan cùng tổng tiền, đã thu, còn thiếu.
- [x] Tính trạng thái từ khoản thu trên toàn hoá đơn: chưa thu → **Chưa đóng**; đã thu >0 nhưng chưa đủ → **Đang trả**; trả đủ → **Đã đóng**. Thu một phần không đánh dấu riêng tháng hoặc riêng nhóm là đã đóng. Quá hạn tính động theo quy tắc ngày Việt Nam hiện hành, có thể kèm trạng thái đang trả.
- [x] Khi ô có nhiều hợp đồng/hoá đơn → hiện số hoá đơn; chỉ hoàn tất khi tất cả nghĩa vụ đã hoàn tất. Có tiền đã thu nhưng còn thiếu → đang trả. Hoá đơn 0 đồng hiện **Không phải thu**, không giả lập lần thu tiền.
- [x] Không có hoá đơn → **Chưa có hóa đơn**, không tự coi là nợ hoặc suy ra phòng trống. Khi lịch sử có tháng thiếu → liệt kê đúng các tháng đã đóng; không ghi "đã đóng đến T11" nếu T10 chưa hoàn tất.
- [x] Tracker theo kỳ hoá đơn, sổ sách vẫn theo `Payment.paidAt`. Thu tháng 12 cho kỳ tháng 10 → tracking T10, sổ sách T12. Thu thừa không tự chuyển sang kỳ khác, số còn thiếu hiển thị tối thiểu 0.

**Hoá đơn cũ và bản xuất**

- [x] Bổ sung kỳ cho hoá đơn cũ mà không thay đổi tiền, thanh toán hoặc tiêu đề đã lưu. Dùng thao tác metadata riêng để gán kỳ cho hoá đơn đã có thanh toán; không mở khoá form sửa tiền.
- [x] Chỉ tự đề xuất gán nhãn rõ như `Tháng 9/2026`, `Tháng 9+10+11/2026`; nhãn giữa tháng, mơ hồ, `both` chưa xác định hai kỳ hoặc trùng kỳ → **Cần gán kỳ tracking**, yêu cầu admin xác nhận. Không suy năm/tháng từ ngày tạo hoặc hạn thanh toán.
- [x] Nhãn giữa tháng chỉ được đưa vào tracking tháng sau khi admin xác nhận ý nghĩa; không tự coi nghĩa vụ cả tháng đã hoàn tất. Chưa xây tracking theo ngày trong bản này.
- [x] Có danh sách/cảnh báo hoá đơn chưa gán kỳ; trạng thái không được trình bày như dữ liệu đã đầy đủ. Nếu hợp đồng có hoá đơn chưa xác định kỳ, form cảnh báo và liên kết xem để đối chiếu trước khi lập; chỉ chống trùng tự động trên các kỳ đã xác định.
- [x] PDF và chi tiết hoá đơn ghi kỳ riêng cho phòng và điện/nước; PNG dùng chính PDF. Hoá đơn chưa gán kỳ giữ cách in cũ. Giữ bộ lọc/xuất lô theo tiêu đề hiện hành và kiểm tra không lỗi với tiêu đề qua năm.

### Kỹ thuật

- **Schema:** thêm `BillTrackingPeriod` gồm `id`, `billId`, `leaseId`, `month` (`YYYY-MM`), `category` (`room`/`elec_water`), quan hệ với Bill/Lease; index theo tháng và unique `(leaseId, month, category)` để chống tranh chấp. `leaseId` luôn lấy từ Bill ở server, không tin client. Xoá Bill chưa có payment xoá kỳ liên quan cùng transaction. Khi sửa, thay kỳ nguyên tử và loại trừ kỳ của chính Bill. Hoá đơn cũ xung đột giữ nguyên và đưa vào danh sách cần xử lý, không bỏ unique hoặc tự xoá dữ liệu để gán.
- **Migration:** additive trong `prisma/migrations/20261001010000_bill_tracking_periods/`; chưa tự backfill trong DDL. Chuẩn bị thao tác đề xuất/gán kỳ có kiểm tra, chạy lại không tạo bản ghi trùng; báo rõ số đã gán/chưa gán/xung đột. Hoá đơn cũ chưa có kỳ vẫn đọc/in được.
- **Reuse:** logic kỳ/trạng thái thuần trong `lib/`, Zod dùng chung; tái sử dụng `lib/billing.ts`, `lib/format.ts`, `lib/rooms.ts`, toast, form và design token hiện hành. Không lưu thêm trạng thái trả tiền riêng, không dùng phân bổ tỷ lệ trong sổ sách để đánh dấu tháng.
- **Interfaces:** bổ sung danh sách kỳ vào input tạo/sửa và `InvoiceModel`; thêm server action gán metadata kỳ cho Bill cũ, giữ guard sửa tiền. Sau tạo/sửa/thu/xoá hợp lệ/gán kỳ, revalidate tracking và các trang hoá đơn/phòng/tổng quan liên quan.
- **Quy ước:** int VND + `formatVND()`, UI tiếng Việt, ngày theo `Asia/Ho_Chi_Minh`, Prisma SQLite/Turso không enum, Zod validation, server recompute tổng, không `any`, tương thích TypeScript/build hiện tại.
- **Triển khai:** thử DB demo độc lập, không reset DB thật; sao lưu trước khi áp migration Turso, áp schema tương thích trước khi code mới chạy. Production là bước riêng sau kiểm chứng; Vercel không tự chạy migration.

## Giả định & Edge cases

- Chỉ admin nội bộ; tiền phòng bao gồm thuê phòng và dịch vụ, điện/nước là một nhóm. Không thêm nhập chỉ số nháp, phân bổ payment từng tháng/khoản, chốt sổ, hoàn tiền, bù trừ hoặc cơ chế thay đồng hồ.
- Các hợp đồng khác nhau có thể cùng tháng trong một phòng; không khoá theo `unitId`. Kỳ được chọn phải giao với thời gian hợp đồng (theo ngày Việt Nam); cho phép tháng đầu/cuối là tháng không trọn và hợp đồng tương lai. Không tự tính tiền theo ngày.
- Dịch vụ có số tháng riêng vẫn thuộc nhóm phòng/dịch vụ của hoá đơn; nếu cần tracking riêng từng dịch vụ sẽ là feature khác. Đổi giá/số người/số xe giữa kỳ không tự hồi tố; admin điều chỉnh dòng hoặc tách hoá đơn.
- Có nhiều Bill cũ cùng hợp đồng/khoản/tháng → giữ nguyên lịch sử, không tự chọn một Bill làm đúng; báo xung đột để xử lý trước khi gán kỳ. Ma trận không che khoản chưa trả trên hợp đồng cũ.
- Bộ chỉ số gợi ý phải lấy theo kỳ trước kỳ điện/nước đã chọn, không dùng `dueDate` làm thứ tự tiêu thụ. Nếu không xác định được từ dữ liệu cũ, để admin nhập và cảnh báo đối chiếu; số mới phải ≥ số cũ, giữ quy tắc hiện hành.

## Task breakdown

1. [x] Schema, migration additive, Prisma types và bảo vệ unique/transaction.
2. [x] Helper kỳ/trạng thái, Zod và test: qua năm, kỳ riêng, liên tiếp, trùng, hợp đồng, chưa chọn kỳ.
3. [x] Tạo/sửa/gán metadata hoá đơn, guard xoá và revalidation; bảo toàn snapshot cũ.
4. [x] Form responsive, bộ chọn kỳ có năm, history/cảnh báo và chế độ xem mobile.
5. [x] Ma trận tracking, drill-down theo hợp đồng/hoá đơn và danh sách cần gán kỳ.
6. [x] Chi tiết/PDF/PNG, dữ liệu demo và E2E đủ các ca chính.
7. [x] Test + build, kiểm tra máy tính/điện thoại, cập nhật SRS + CHANGELOG + hướng dẫn liên quan; chuẩn bị kế hoạch production, chưa tự deploy.

## Test scenarios

- [ ] T11–12/2026 + T1/2027: đổi năm không mất chọn, 3 tháng tiền phòng, tiêu đề rõ; trả đủ cập nhật cả hai bảng năm.
- [ ] `both`: phòng T12, điện/nước T10–12; đúng hai kỳ trên form/detail/PDF/PNG, điện/nước không nhân 3.
- [ ] Chọn T10/T12 điện/nước bị chặn; tiền phòng tháng rời hợp lệ. Bỏ hết kỳ/chuyển loại gửi thiếu kỳ bị chặn ở server.
- [ ] Chưa trả/thu một phần/trả đủ, nhiều lần thu, quá hạn, 0 đồng, thu thừa: trạng thái đúng, không phân bổ tự động sang tháng khác.
- [ ] Thu vào tháng khác kỳ: tracker và sổ sách theo đúng hai mốc riêng.
- [ ] Trùng cùng hợp đồng/khoản/tháng: `both` xung đột với Bill phòng hoặc điện/nước; hai request đồng thời chỉ một request thành công. Khác hợp đồng cùng phòng/tháng không bị khoá nhầm.
- [ ] Sửa Bill: kỳ hiện tại vẫn chọn được, không trùng chính mình, thay kỳ nguyên tử; đã có payment không sửa tiền/không xoá. Chỉ gán metadata không làm thay đổi tổng tiền.
- [ ] Legacy rõ/mơ hồ/giữa tháng/trùng: không tự suy sai, chưa gán có cảnh báo, chạy gán lại không nhân đôi, số tiền và payment không đổi.
- [ ] Đổi phòng/năm/loại, bỏ chọn hết, lỗi tải trạng thái: không giữ dữ liệu phòng khác/không gửi kỳ ẩn/không cho lưu sai.
- [ ] SL người/xe, months từng dòng khác nhau, giá đổi: giữ quy tắc snapshot và sửa tay; không reset SL hoặc ghi đè months đã chỉnh riêng.
- [ ] PDF/PNG các loại/legacy/qua năm, xuất ZIP nhiều hoá đơn: tổng tiền khớp, kỳ đầy đủ, không cắt nội dung/tên file không trùng.
- [ ] E2E desktop tạo → thu một phần → thu đủ → ma trận → mở lại hoá đơn; mobile xem tổng/đã thu/còn thiếu và mở chi tiết. Kiểm tra 360px, 768px, 1280px, bàn phím và focus; các trường nhập hoạt động, không chỉ giống mockup.

## Trạng thái

### Kết quả kiểm chứng ngày 2026-10-01

- Unit/integration: **29 file, 197 test pass**, gồm validation kỳ/hợp đồng/trạng thái, model PDF qua năm và transaction trên bản sao SQLite (trùng kỳ rollback, gán lại không nhân đôi, cascade kỳ khi xoá).
- E2E trên Edge với DB demo sao chép: **4 test pass**, gồm luồng khách/phòng/hoá đơn/thu tiền hiện hành; chọn 11–12/2031 + 1/2032, thu nhiều lần và trạng thái hai năm; kỳ đã lập/đã trả không chọn lại; gán metadata legacy giữ nguyên tiền và chặn điện/nước rời; xuất PDF và tải PNG.
- Visual QA: form 360/768/1280px không tràn trang; đã sửa min-width fieldset để bảng dịch vụ cuộn trong khung ở màn hẹp. Chi tiết mobile thu gọn mặc định; ảnh PNG qua năm có đủ kỳ, tiền dịch vụ nhân 3 còn điện/nước chỉ tính chênh lệch chỉ số.
- Các checkbox trong **Test scenarios** ở trên là ma trận nghiệm thu chi tiết; chưa đánh dấu toàn bộ tổ hợp là đã chạy E2E. Không dùng kết quả này để khẳng định đã diễn tập production hoặc chạy hai request thật đồng thời; unique DB đã được kiểm tra trực tiếp.
- DB local `prisma/demo.db` đã bổ sung schema sau backup `prisma/demo.tracking-backup-1790848584703.db`; 36 hoá đơn demo có kỳ, giữ ví dụ legacy ở Phòng 303. Kiểm thử chỉ ghi vào DB sao chép. DB remote chưa thay đổi.
- Production: backup → áp migration additive `20261001010000_bill_tracking_periods` → deploy code → gán/đối chiếu kỳ legacy. Hướng dẫn tại [DEPLOY.md](../../DEPLOY.md); chưa triển khai production.

- [x] Spec được duyệt (bởi người dùng) — 2026-10-01
- [x] Code hoàn thành
- [x] Test + build pass — 197 test, 4 E2E; Next build và kiểm tra TypeScript pass. Còn các warning lint sẵn có về ảnh.
- [x] E2E và visual QA pass trên DB demo
- [x] Người dùng duyệt deploy; production đã sao lưu, áp migration additive và triển khai ngày 2026-10-01.

### Production ngày 2026-10-01

- Backup SQLite đủ 422 bản ghi, kiểm tra row count và `PRAGMA integrity_check` thành công: `prisma/production-before-tracking-1790863357153.db` (ignored, không upload/commit).
- Production đã có migration cột dịch vụ; chỉ áp `20261001010000_bill_tracking_periods` bằng transaction, xác nhận bảng và các index/unique. Không backfill hoặc sửa hóa đơn/payment cũ.
- Deploy https://nhatro-rust.vercel.app — `dpl_FUfXHBE7uu6yNwxXKdvCaHsKDL3k`, Vercel **READY**, build production pass. HTTP login/auth session/PDF worker 200; tracking/tạo hóa đơn chuyển tới login khi chưa đăng nhập.
- Hóa đơn cũ cần admin đối chiếu/gán kỳ tracking qua giao diện. Không tạo dữ liệu thử hoặc diễn tập thu tiền trên DB production.
