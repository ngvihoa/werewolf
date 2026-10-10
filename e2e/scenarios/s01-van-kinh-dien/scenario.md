# S01 — Ván kinh điển: làng thắng sau hai đêm

## Mục tiêu

Mô phỏng trọn một ván 8 người "sách giáo khoa" ở chế độ có Quản trò — nhịp
đêm/ngày chuẩn mà mọi bàn chơi đều đi qua. Đây là kịch bản đối chiếu cơ sở:
mọi phối hợp vai ở đây phải chạy đúng như Quản trò thực tế sẽ đọc trên panel
và người chơi sẽ thấy trên thiết bị:

- Bảo vệ che được đòn cắn thường.
- Phù thủy **cứu** nạn nhân Sói.
- Biểu quyết qua thiết bị chạy đủ cả bàn (8/8 phiếu) và tự tổng kết.
- Phù thủy **độc** Sói ở đêm 2 — làng thắng ngay tại bình minh.

## Bối cảnh

| Hạng mục       | Giá trị                                                                       |
| -------------- | ----------------------------------------------------------------------------- |
| Chế độ         | MODERATED                                                                     |
| Số người       | 8                                                                             |
| Composition    | Mặc định 8 người: Ma sói ×2, Tiên tri, Phù thủy, Bảo vệ, Thợ săn, Dân làng ×2 |
| Luật hòa phiếu | Mặc định (REVOTE_ONCE)                                                        |

## Dàn vai

Chủ vai phát hiện runtime qua god-view roster (`findRoleOwners`). Gọi tắt:
Sói 1, Sói 2, Tiên tri, Phù thủy, Bảo vệ, Thợ săn, Dân A, Dân B.

## Kịch bản

### Hồi 1 — Đêm 1

1. **Thợ săn** đánh dấu Dân A (mốc dự phòng — Thợ săn không chết đêm nay nên
   mark không phát nổ).
2. **Bảo vệ** bảo hộ Dân B.
3. **Tiên tri** soi Sói 1 — card "Báo Tiên tri": "{Tiên tri} soi {Sói 1}: SÓI".
4. **Ma sói** cắn Dân B (2 Sói còn sống, hàng đợi chỉ cần một lượt cắn).
5. **Phù thủy** tick "Dùng bình cứu cho nạn nhân Sói" — cứu Dân B; không dùng
   bình độc.

### Hồi 2 — Ngày 1: cả bàn vào biểu quyết

6. Bình minh: **"Kết quả dự kiến" = "Không ai bị loại trong đêm này"** — Bảo
   vệ + Phù thủy đều chặn được cái chết, nhưng Quản trò không được tiết lộ
   điều đó, chỉ công bố bình minh.
7. Quản trò bấm "Bắt đầu biểu quyết". 8 người sống bỏ phiếu trên **thiết bị
   của mình**: 6 phe làng vote Sói 1; 2 Sói vote Tiên tri (tạo nhiễu).
8. Lá phiếu thứ 8 chạm đủ → bot tổng kết trong cùng request — monitor hiện
   **"8/8 phiếu"**. Quản trò "Xác nhận kết quả" → **Sói 1 bị loại**.

### Hồi 3 — Đêm 2

9. **Thợ săn** đánh dấu Tiên tri (mốc lại — vẫn sống).
10. **Bảo vệ** bảo hộ Dân A (khác đêm trước — luật cấm lặp liên tiếp).
11. **Tiên tri** soi Sói 2 — card "Báo Tiên tri": SÓI.
12. **Ma sói** (chỉ còn Sói 2) cắn Dân A — bị bảo hộ chặn.
13. **Phù thủy** chọn bình độc vào Sói 2 (bình cứu đã dùng, checkbox hiển thị
    trạng thái "đã dùng").

### Hồi 4 — Bình minh định đoạt

14. "Kết quả dự kiến" chỉ có **Sói 2** (Dân A được bảo vệ, không có trong
    danh sách). Quản trò công bố → điểm thắng kiểm ngay: phe Sói đã chết
    hết → **"Phe Dân làng chiến thắng"**.
15. Thiết bị của Thợ săn (đại diện người chơi): reload → cùng banner, phần
    "Sự thật được lộ ra" lộ mọi vai, dòng "Vai trò của bạn: Thợ săn".

## Điểm xác minh

- Đêm 1 không ai chết dù Sói cắn (2 lớp phòng ngự độc lập).
- "Báo Tiên tri" hai đêm đều đúng "SÓI".
- Biểu quyết thiết bị: đủ 8/8 phiếu, tự tổng kết, Sói 1 bị loại đúng người.
- Đêm 2: bảo vệ chặn cắn, bình độc giết Sói 2.
- Kết cục "Phe Dân làng chiến thắng" ở cả panel Quản trò lẫn thiết bị người chơi.

## Ghi chú kỹ thuật

- Vote thiết bị chạy tuần tự qua từng người (mỗi trang reload để lấy view
  tươi — pattern reload-poll); lá cuối tự trigger tally nên không cần bấm
  tổng kết.
- Runtime ước tính: ~4 phút (2 đêm + 1 vòng vote 8 người).
