# S09 — Kỹ nữ đến thăm nhầm Sói và Sói Lai bị cắn chuyển phe

## Mục tiêu

Mô phỏng hai cơ chế "tin tệ chỉ dành cho một người" của đêm 1, kèm bài học cân
số: **Sói Lai chuyển hóa được tính vào phe Sói NGAY trong đêm đó** — nếu Phù
thủy không xử lý một Ma sói cùng đêm, phe Sói cân số người làng và thắng liền
tại bình minh.

Xác minh:

- **Kỹ nữ** đến thăm Sói → **chết ngay tại bình minh** (người được thăm vẫn sống).
- **Sói Lai** bị cắn thành công → **chuyển hóa bí mật** (card Quản trò + notice
  thiết bị + Tiên tri soi lần nữa đọc được phe mới).
- Hai cái chết cùng đêm hiện cùng nhau trong "Kết quả dự kiến".

## Bối cảnh

| Hạng mục    | Giá trị                                                                                                                          |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Chế độ      | MODERATED                                                                                                                        |
| Số người    | 7                                                                                                                                |
| Composition | **Tự chọn vai**: Ma sói, Kỹ nữ, Sói Lai, Tiên tri, Phù thủy, Dân làng (6 vai — hệ thống đổ thêm 1 Ma sói cho đủ số Sói mặc định) |

## Dàn vai

Ma sói 1, Ma sói 2, Kỹ nữ, Sói Lai, Tiên tri, Phù thủy, Dân V — phát hiện
runtime qua roster.

## Kịch bản

### Hồi 1 — Đêm 1: hai tin tệ và một liều thuốc

1. Tiên tri soi **Sói Lai** → card "Báo Tiên tri": NGƯỜI (chưa chuyển hóa đọc
   là phe Làng).
2. **Kỹ nữ** đến thăm **Ma sói 1**.
3. Ma sói cắn **Sói Lai** (cắn trúng — không ai cứu). Phù thủy **độc Ma sói 1**
   (nếu không, sau đêm này phe Sói 3 người — kể cả Sói Lai đã chuyển — cân 3
   người làng và thắng liền ở bình minh).
4. Bình minh: "Kết quả dự kiến" = **Kỹ nữ + Ma sói 1**; Sói Lai không có trong
   danh sách. Card **"Chuyển hóa bí mật"** hiện đúng tên Sói Lai — Quản trò
   giữ kín.
5. Thiết bị Sói Lai: reload → notice "Bạn đã bị cắn và chuyển sang phe Ma
   sói. Từ đêm tiếp theo, bạn hành động cùng đàn Sói."

### Hồi 2 — Ngày 1: làng loại nhầm

6. Đếm tay loại **Ma sói 2** (bàn mù quáng). Còn 4 người: Sói Lai (bí mật),
   Tiên tri, Phù thủy, Dân V.

### Hồi 3 — Đêm 2: sói đơn độc

7. Tiên tri soi **Sói Lai lần nữa** → card "Báo Tiên tri": **SÓI** (phe đã
   đổi). Phù thủy bỏ qua (hết bình độc).
8. Ma sói (chỉ còn Sói Lai) cắn **Dân V**. Bình minh: Dân V chết. Còn 3 người.

### Hồi 4 — Ngày 2: chốt hạ

9. Mở biểu quyết (3 người sống). Thiết bị: Tiên tri + Phù thủy vote Sói Lai;
   Sói Lai vote Tiên tri. Lá cuối tự tổng kết → "Xác nhận kết quả" → Sói Lai
   bị loại → **"Phe Dân làng chiến thắng"**.

## Điểm xác minh

- Kỹ nữ chết vì thăm Sói; Ma sói 1 chết vì bình độc — hai cái chết cùng đêm.
- Sói Lai bị cắn → sống + chuyển hóa bí mật (card quản trò + notice thiết bị).
- Tiên tri soi hai lần: NGƯỜI → SÓI (sổ tay có 2 dòng soi cùng người).
- Kết cục "Phe Dân làng chiến thắng" qua biểu quyết thiết bị.

## Ghi chú kỹ thuật

- Bài học cân số ghi lại đúng như ván thật: chuyển hóa Sói Lai cộng ngay vào
  phe Sói — composition/kịch bản phải tính cả điều đó.
- Runtime ước tính: ~4 phút.
