# S07 — Người thổi sáo mê hoặc cả bàn và thắng ở bình minh

## Mục tiêu

Mô phỏng đường thắng độc lập của Người thổi sáo: mỗi đêm **mê hoặc một người
mới**, thắng khi **mọi người còn sống khác đều đã bị mê hoặc**. Kịch bản dàn
thế để thổi sáo hoàn thành nhiệm vụ ngay tại bình minh đêm 2.

Xác minh:

- Charm cộng dồn qua các đêm, mỗi đêm buộc chọn người mới (không lặp).
- Notice riêng tư trên thiết bị người bị mê hoặc: "Bạn đã bị Người thổi sáo
  mê hoặc."
- Điểm thắng PIPER được kiểm **ngay sau khi giải quyết đêm** — trước khi làng
  kịp làm gì thêm.

## Bối cảnh

| Hạng mục    | Giá trị                                                                                      |
| ----------- | -------------------------------------------------------------------------------------------- |
| Chế độ      | MODERATED                                                                                    |
| Số người    | 5                                                                                            |
| Composition | **Tự chọn vai**: Người thổi sáo, Ma sói, Tiên tri, Dân làng (4 vai — tự lấp thêm 1 Dân làng) |

## Dàn vai

Người thổi sáo, Ma sói, Tiên tri, Dân V1, Dân V2 — phát hiện runtime.

## Kịch bản

### Hồi 1 — Đêm 1

1. Tiên tri soi Dân V1 → NGƯỜI. Ma sói cắn **Dân V1**. Người thổi sáo mê hoặc
   **Tiên tri**.
2. Bình minh: V1 chết. Điểm thắng chưa đủ (còn V2 và Ma sói chưa bị mê hoặc).

### Hồi 2 — Ngày 1: bàn hoang tàng

3. Mở biểu quyết (4 người sống), đếm tay loại **Dân V2** — bàn không còn niềm
   tin. Còn 3: Thổi sáo, Ma sói, Tiên tri.
4. Thiết bị Tiên tri (đại diện người bị mê hoặc): reload → notice "Bạn đã bị
   Người thổi sáo mê hoặc."

### Hồi 3 — Đêm 2: đồng chí cuối cùng

5. Tiên tri soi Ma sói → SÓI. Ma sói cắn **Tiên tri**. Người thổi sáo mê hoặc
   **Ma sói** (người mới — lượt trước đã mê Tiên tri).
6. Bình minh: Tiên tri chết. Điểm thắng kiểm ngay: người sống khác Thổi sáo
   chỉ còn Ma sói — đã bị mê → **"Người thổi sáo chiến thắng"**.

### Hồi 4 — Kết thúc ván

7. Panel Quản trò: banner "Người thổi sáo chiến thắng" (ván kết thúc tại bình
   minh, ngày không mở).
8. Thiết bị Ma sói: cùng banner, "Vai trò của bạn: Ma sói".

## Điểm xác minh

- Charm không lặp: đêm 2 form còn đúng người chưa bị mê (Ma sói).
- Notice "bị mê hoặc" hiện trên thiết bị nạn nhân.
- PIPER thắng tại bình minh đêm 2 — banner đúng, ngày không mở.

## Ghi chú kỹ thuật

- Ván kết thúc trong `confirmNightResolution` (trước `transitionAfterElimination`)
  nên `announceDawn` phải assert `gameOver: 'PIPER'` thay vì heading mở ngày.
- Runtime ước tính: ~2 phút.
