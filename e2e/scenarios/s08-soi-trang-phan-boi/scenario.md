# S08 — Sói Trắng phản bội đàn và thắng khi sống sót một mình

## Mục tiêu

Mô phỏng đường thắng cô độc nhất của game: **Sói Trắng** ban đầu cùng đàn,
nhưng chỉ thắng khi là **người cuối cùng còn sống**. Kịch bản: đêm đầu Sói
Trắng dùng sát chiêu một-lần **giết chính Sói của đàn** (bắt buộc chọn Sói —
không thể chọn người khác), rồi lần lượt cả bàn gục ngã, để lại Sói Trắng một
mình.

Xác minh:

- Form Sói Trắng giới hạn mục tiêu: chỉ chọn được **Sói khác** (engine chặn).
- Tiên tri soi Sói Trắng ra **"SÓI"** (Sói Trắng đếm là Sói).
- Khi Sói thường chết hết mà Sói Trắng còn sống: **ván KHÔNG kết thúc** — cả
  điều kiện thắng phe Dân làng lẫn phe Ma sói đều bị treo (win-condition
  chờ Sói Trắng định đoạt).
- Sống sót một mình → **"Sói Trắng chiến thắng"**.

## Bối cảnh

| Hạng mục    | Giá trị                                                                                                    |
| ----------- | ---------------------------------------------------------------------------------------------------------- |
| Chế độ      | MODERATED                                                                                                  |
| Số người    | 7                                                                                                          |
| Composition | **Tự chọn vai**: Ma sói, Sói Trắng, Tiên tri, Phù thủy, Thợ săn, Dân làng (6 vai — tự lấp thêm 1 Dân làng) |

## Dàn vai

Ma sói, Sói Trắng, Tiên tri, Phù thủy, Thợ săn, Dân V1, Dân V2.

## Kịch bản

### Hồi 1 — Đêm 1: phản bội

1. Thợ săn đánh dấu V1 (mốc dự phòng). Tiên tri soi **Sói Trắng** → SÓI.
2. Ma sói cắn **Dân V1**. **Sói Trắng** dùng sát chiêu giết **Ma sói** (bắt
   buộc — mục tiêu duy nhất hợp lệ). Phù thủy **cứu V1**.
3. Bình minh: danh sách chết chỉ có **Ma sói** — V1 được cứu. Công bố → ngày
   mở bình thường (chứng tỏ ván chưa kết thúc dù Sói thường đã chết hết).

### Hồi 2 — Bàn rệu rã dần (ngày 1 – ngày 4)

Mỗi ngày: mở biểu quyết rồi **đếm tay** loại một người; mỗi đêm Phù thủy có
bình thì dùng, hết bình thì bỏ qua bước.

4. Ngày 1: loại **Dân V1** (6 → 5). Đêm 2: Phù thủy **độc Thợ săn** (5 → 4
   sau bình minh).
5. Ngày 2: loại **Tiên tri** (→ 3). Đêm 3: Phù thủy hết bình — bỏ qua; đêm
   không ai chết.
6. Ngày 3: loại **Dân V2** (→ 2). Đêm 4: bỏ qua bước Phù thủy; không ai chết.
7. Ngày 4: loại **Phù thủy** (→ 1) — **Sói Trắng sống sót một mình** →
   **"Sói Trắng chiến thắng"** ngay sau khi xác nhận kết quả.

### Hồi 3 — Kết thúc ván

8. Panel Quản trò: banner "Sói Trắng chiến thắng".
9. Thiết bị Sói Trắng: cùng banner, "Vai trò của bạn: Sói Trắng".

## Điểm xác minh

- Đêm 1: Ma sói chết bởi tay đồng bọn; nạn nhân cắn được cứu; ngày vẫn mở.
- Tiên tri soi Sói Trắng: "SÓI".
- Chuỗi 4 ngày giảm đều — mỗi vòng loại đúng một người, ván không kết thúc
  sớm dù phe Sói (thường) rỗng tuếch.
- Kết cục WHITE_WOLF — winner độc lập, không phải phe Ma sói.

## Ghi chú kỹ thuật

- Đường đếm tay toàn bộ các ngày (lò xo dàn thế) — nội dung cốt lõi là điều
  kiện thắng, không phải phối hợp vote.
- Runtime ước tính: ~5 phút — kịch bản dài nhất trong bộ.
