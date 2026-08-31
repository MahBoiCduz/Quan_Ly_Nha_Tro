# Changelog — Nhật ký thay đổi hành vi & quyết định

> Bổ trợ cho [docs/SRS.md](SRS.md): SRS ghi **trạng thái hiện tại**, file này ghi
> **dòng thời gian quyết định** (đã đổi gì, vì sao, tác động tới đâu). Mục mới
> nhất ở trên. Khi đổi một quy tắc nghiệp vụ → cập nhật **cả hai** file trong
> cùng commit.

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
