# S03 — Phù thủy dùng cả hai bình trong một đêm

## Mục tiêu

Mô phỏng đêm đầu tiên của một ván 6 người ở chế độ có Quản trò, trong đó
Phù thủy là nhân vật quyết định: vừa **cứu nạn nhân Sói vừa đầu độc chính
Sói** trong cùng một đêm. Kịch bản xác minh qua UI rằng:

- Báo Phù thủy truyền đạt đúng nạn nhân Sói đã chọn cho Quản trò.
- Bình cứu **hủy được đòn cắn** — nạn nhân sống qua bình minh.
- Bình độc **giết Sói ngay trong đêm** — không cần biểu quyết nào.
- Làng thắng ngay tại bình minh đêm 1 (cả bàn thấy màn kết quả).

## Bối cảnh

| Hạng mục       | Giá trị                                                                 |
| -------------- | ----------------------------------------------------------------------- |
| Chế độ         | MODERATED (có Quản trò)                                                 |
| Số người       | 6 (Quản trò + 5 người chơi? — không: Quản trò không tính, 6 người chơi) |
| Composition    | Mặc định 6 người: Ma sói ×1, Tiên tri, Phù thủy, Dân làng ×3            |
| Luật hòa phiếu | Mặc định (không liên quan — ván kết thúc trước khi bỏ phiếu)            |

> Lưu ý cấu trúc bàn: `createTable(browser, 6)` tạo 6 người chơi, Quản trò là
> phiên riêng không nằm trong danh sách phân vai.

## Dàn vai

Chủ từng vai được phát hiện lúc chạy test qua god-view roster của Quản trò
(`findRoleOwners`) — kịch bản không giả định ai nhận vai nào:

- **Ma sói** — cắn đêm 1.
- **Tiên tri** — soi một Dân làng.
- **Phù thủy** — nhân vật chính của kịch bản.
- **Dân làng ×3** — một người làm nạn nhân bị cắn (gọi là **B**), hai người còn lại sống tới cuối.

## Kịch bản

### Hồi 1 — Đêm 1

1. Quản trò ghi nhận lựa chọn của **Tiên tri**: soi Dân làng **B**.
   - Panel hiện card **"Báo Tiên tri"**: "{Tiên tri} soi {B}: NGƯỜI".
2. Quản trò ghi nhận lựa chọn của **Ma sói**: cắn **B**.
3. Tới lượt Phù thủy, panel hiện card **"Báo Phù thủy"**: "Sói đã chọn: {B}".
4. Quản trò ghi nhận lựa chọn của **Phù thủy**: **tick "Dùng bình cứu cho nạn
   nhân Sói"** (cứu B) **và chọn bình độc vào Ma sói** (Phù thủy thật không
   biết ai là Sói — kịch bản được đạo diễn nên Quản trò chọn hộ đúng mục tiêu).

### Hồi 2 — Bình minh

5. Bảng **"Kết quả dự kiến"** chỉ có đúng **Ma sói** (chết vì bình độc);
   **không có B** — đòn cắn đã bị bình cứu hủy.
6. Quản trò bấm **"Công bố kết quả và mở ngày"** — điểm thắng được kiểm ngay
   sau công bố: toàn bộ Ma sói đã chết, ngày không mở nữa mà **Phe Dân làng
   chiến thắng** luôn.

### Hồi 3 — Kết thúc ván

7. Màn Quản trò hiện banner **"Phe Dân làng chiến thắng"**.
8. Thiết bị của Tiên tri (đại diện người chơi) reload rồi hiện màn kết quả với
   cùng banner, phần **"Sự thật được lộ ra"** lộ toàn bộ vai.

## Điểm xác minh

- Card "Báo Tiên tri" với kết quả "NGƯỜI" cho Dân làng.
- Card "Báo Phù thủy" với đúng tên nạn nhân Sói chọn.
- Bình minh: Ma sói nằm trong danh sách chết, B không có.
- Banner "Phe Dân làng chiến thắng" trên cả Quản trò lẫn người chơi.

## Ghi chú kỹ thuật

- Toàn bộ thao tác đêm thuộc Quản trò (proxy + bot auto-confirm M3) nên không
  cần reload-poll cho panel Quản trò; chỉ trang người chơi khi đọc kết quả
  cuối cần reload (`reloadUntilVisible`).
- Phù thủy chọn bình độc vào Sói là "chọn hộ" theo kịch bản — quyền biết ai
  là Sói không tồn tại trong chơi thật; chấp nhận được vì e2e đang đạo diễn
  một ván cụ thể, không test khả năng đoán của người chơi.
- Runtime ước tính: ~2 phút.
