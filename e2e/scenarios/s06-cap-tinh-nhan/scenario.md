# S06 — Cặp tình nhân của Thần tình yêu thắng ở final 2

## Mục tiêu

Mô phỏng đường thắng đặc biệt của cặp đôi: Thần tình yêu **ghép Sói với một
Dân làng** đêm đầu, rồi ván diễn tới khi chỉ còn đúng hai người — một Sói một
Dân, nhưng là **tình nhân** → "Cặp tình nhân chiến thắng" trước cả điều kiện
thắng phe.

Xác minh:

- Form proxy ghép đôi **hai mục tiêu** ("Chọn hai người thành tình nhân").
- Notice riêng tư trên thiết bị mỗi tình nhân: "Tình nhân của bạn là {X}…".
- Điểm thắng LOVERS: cả hai sống, khác phe, **đúng 2 người còn sống** — được
  kiểm trước điều kiện thắng phe Sói (cùng request công bố kết quả biểu quyết).

## Bối cảnh

| Hạng mục    | Giá trị                                                                                              |
| ----------- | ---------------------------------------------------------------------------------------------------- |
| Chế độ      | MODERATED                                                                                            |
| Số người    | 6                                                                                                    |
| Composition | **Tự chọn vai**: Thần tình yêu, Ma sói, Tiên tri, Dân làng (4 vai — hệ thống tự lấp thêm 2 Dân làng) |

## Dàn vai

Thần tình yêu, Ma sói (tình nhân 1), Tiên tri, Dân V1 (**tình nhân 2**),
Dân V2, Dân V3 — phát hiện runtime qua roster.

## Kịch bản

### Hồi 1 — Đêm 1: ghép đôi

1. **Thần tình yêu** ghép **Ma sói + Dân V1** (form hai mục tiêu).
2. Thiết bị: V1 và Ma sói đều thấy notice "Tình nhân của bạn là …".
3. Tiên tri soi Ma sói → SÓI. Ma sói cắn **Tiên tri** (mắt cung thông tin của
   làng). Không Phù thủy.
4. Bình minh: Tiên tri chết.

### Hồi 2 — Ngày 1: làng mất mát không nghi ngờ

5. Mở biểu quyết (5 người sống). Thiết bị: Thần tình yêu + V1 + V3 vote
   **Dân V2**; V2 vote Thần tình yêu; Ma sói vote V3. → V2 bị loại.

### Hồi 3 — Đêm 2

6. Ma sói cắn **Dân V3**. Bình minh: V3 chết. Còn 3 người: Thần tình yêu,
   Ma sói, V1.

### Hồi 4 — Ngày 2: cặp đôi chứng minh

7. Mở biểu quyết (3 người sống). Thiết bị: Ma sói + V1 vote **Thần tình yêu**;
   Thần tình yêu vote Ma sói. → Thần tình yêu bị loại.
8. "Xác nhận kết quả" → chỉ còn đúng Ma sói + V1 — hai tình nhân khác phe →
   **"Cặp tình nhân chiến thắng"** (không phải "Phe Ma sói").

### Hồi 5 — Kết thúc ván

9. Panel Quản trò: banner "Cặp tình nhân chiến thắng".
10. Thiết bị của Ma sói và V1: cùng banner — cả hai "Chiến thắng" dù phe Sói
    chỉ còn một người.

## Điểm xác minh

- Form ghép đôi nhận đúng 2 mục tiêu; notice tình nhân hiện trên cả hai thiết bị.
- Tiên tri chết đêm 1; V2 bị loại ngày 1; V3 chết đêm 2 — đúng từng mốc.
- Final 2 khác phe nhưng là tình nhân → LOVERS thắng TRƯỚC điều kiện "Sói ≥
  người sống" của phe Ma sói.

## Ghi chú kỹ thuật

- Thần tình yêu không tự ghép chính mình (ràng buộc engine) — kịch bản chọn
  Ma sói + Dân V1 là hợp lệ.
- Runtime ước tính: ~3 phút (2 đêm, 2 vòng vote thiết bị).
