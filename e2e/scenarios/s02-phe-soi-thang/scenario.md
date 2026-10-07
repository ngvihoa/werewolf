# S02 — Phe Sói thắng và phát súng cuối của Thợ săn

## Mục tiêu

Mô phỏng mặt trái của S01: đêm nào làng cũng bỏ vệ, ngày nào làng cũng treo
phiếu sai — **phe Ma sói thắng**. Trên đường đó, Thợ săn bị biểu quyết loại
và kéo một Sói theo bằng **phát súng cuối qua thiết bị** (phase HUNTER_SHOT
riêng, khác với mark đêm của Thợ săn vốn chỉ nổ khi chủ vai chết trong đêm).

Kịch bản xác minh:

- Bỏ qua từng bước đêm với lý do (công cụ "bỏ qua" của Quản trò).
- Đếm tay dự phòng: loại người không thuộc cốt truyện mà không cần cả bàn vote.
- Phase HUNTER_SHOT: Thợ săn chọn mục tiêu trên thiết bị, Quản trò xác nhận
  phát bắn, mục tiêu chết.
- Banner **"Phe Ma sói chiến thắng"** khi số Sói cân số người còn sống.

## Bối cảnh

| Hạng mục    | Giá trị                                                                       |
| ----------- | ----------------------------------------------------------------------------- |
| Chế độ      | MODERATED                                                                     |
| Số người    | 8                                                                             |
| Composition | Mặc định 8 người: Ma sói ×2, Tiên tri, Phù thủy, Bảo vệ, Thợ săn, Dân làng ×2 |

## Dàn vai

Sói 1, Sói 2, Tiên tri, Phù thủy, Bảo vệ, Thợ săn, Dân A, Dân B — phát hiện
runtime qua god-view roster.

## Kịch bản

### Hồi 1 — Đêm 1 hoang phế

1. Quản trò **bỏ qua từng bước** với lý do "Bàn không hành động" (Thợ săn,
   Bảo vệ, Tiên tri, Ma sói, Phù thủy — 5 bước). Không ai chết, không ai biết
   gì về ai: bình minh mở ngày.

### Hồi 2 — Ngày 1: làng treo sai người

2. Quản trò **mở biểu quyết** rồi **đếm tay** (dự phòng, không chờ cả bàn
   vote): loại **Thợ săn** (bàn nghi oan).
3. Phase **HUNTER_SHOT** mở: "Đang chờ Thợ săn chọn người kéo theo." — Thợ săn
   trên thiết bị của mình chọn **Sói 1** (trúng mù), gửi "Gửi mục tiêu cho
   Quản trò"; Quản trò bấm "Xác nhận phát bắn".
4. Roster: Thợ săn và Sói 1 cùng "Đã chết". Còn 6 người.

### Hồi 3 — Sói gieo rắc, làng tiếp tục treo sai

5. Đêm 2: bỏ qua Bảo vệ/Tiên tri/Phù thủy (Thợ săn đã chết — bước tự skip);
   **Ma sói** cắn **Dân A**. Bình minh: Dân A chết.
6. Ngày 2: mở biểu quyết, đếm tay loại **Dân B**. Còn 4: Sói 2, Tiên tri,
   Phù thủy, Bảo vệ.
7. Đêm 3: bỏ qua ba vai làng; Ma sói cắn **Phù thủy**. Bình minh: Phù thủy chết.
8. Ngày 3: mở biểu quyết, đếm tay loại **Tiên tri**. Còn 2: Sói 2 và Bảo vệ —
   số Sói cân số người còn sống → **"Phe Ma sói chiến thắng"** ngay sau khi
   xác nhận kết quả.

### Hồi 4 — Kết thúc ván

9. Panel Quản trò: banner "Phe Ma sói chiến thắng".
10. Thiết bị của Sói 2: reload → banner cùng tên, "Vai trò của bạn: Ma sói",
    "Sự thật được lộ ra".

## Điểm xác minh

- Bỏ qua bước đêm ghi nhận đúng từng bước (nhãn "Bỏ qua" tăng dần).
- Đếm tay loại đúng người được chọn, mỗi lần một người.
- HUNTER_SHOT: chờ → chọn trên thiết bị → xác nhận → mục tiêu chết.
- Điều kiện thắng phe Sói (Sói ≥ người còn sống) kích hoạt đúng thời điểm.

## Ghi chú kỹ thuật

- Đây là kịch bản "làng chơi tệ" cố ý — toàn bộ biểu quyết đi đường đếm tay
  để dồn thời gian cho phase HUNTER_SHOT và các đêm skip.
- Sói 2 sống xuyên suốt: mỗi đêm chỉ còn một chủ vai cắn nên form proxy không
  có picker "Ai cắn đêm nay?".
- Runtime ước tính: ~4 phút.
