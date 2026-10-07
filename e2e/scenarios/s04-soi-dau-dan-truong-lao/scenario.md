# S04 — Sói Đầu Đàn cắn xuyên bảo vệ và Già làng sống qua lần cắn đầu

## Mục tiêu

Mô phỏng một ván composition tự chọn tập trung vào hai passive mạnh nhất:

- **Sói Đầu Đàn (Alpha)**: một lần **cắn xuyên bảo vệ** — đòn cắn tăng cường
  không bị Bảo vệ chặn.
- **Già làng (Elder)**: **sống sót lần cắn chí mạng đầu tiên** của Sói — dù
  đòn đó là đòn xuyên bảo vệ; lần cắn thứ hai mới hạ được.

Ngoài ra xác minh Bảo vệ chặn được **đòn cắn thường**, checkbox "Cắn xuyên bảo
vệ" chỉ dùng được một lần, và Tiên tri soi Sói Đầu Đàn ra "SÓI".

## Bối cảnh

| Hạng mục    | Giá trị                                                                                                           |
| ----------- | ----------------------------------------------------------------------------------------------------------------- |
| Chế độ      | MODERATED                                                                                                         |
| Số người    | 7                                                                                                                 |
| Composition | **Tự chọn vai**: Sói Đầu Đàn, Tiên tri, Phù thủy, Bảo vệ, Thợ săn, Già làng, Dân làng (đủ 7 vai — không lấp thêm) |

> Vì mỗi vai chỉ tick được một lần, chọn đủ 7 vai cho 7 người giữ nguyên
> danh sách; phe Sói chỉ có đúng Sói Đầu Đàn.

## Dàn vai

Sói Đầu Đàn, Tiên tri, Phù thủy, Bảo vệ, Thợ săn, Già làng, Dân V — phát
hiện runtime qua god-view roster.

## Kịch bản

### Hồi 1 — Đêm 1: đòn thường bị chặn

1. Thợ săn đánh dấu Dân V; Bảo vệ bảo hộ Dân V; Tiên tri soi **Sói Đầu Đàn**
   → card "Báo Tiên tri": SÓI.
2. **Ma sói tấn công** Dân V **không tick** "Cắn xuyên bảo vệ" → bị bảo hộ
   chặn. Phù thủy bỏ qua.
3. Bình minh: **"Không ai bị loại trong đêm này"**.
4. Ngày 1 bế tắc: Quản trò mở biểu quyết rồi đếm tay với **"Kết quả hòa"** →
   "Xác nhận hòa và bỏ qua lần 2" — không ai bị loại, ván về đêm 2.

### Hồi 2 — Đêm 2: đòn xuyên bảo vệ vẫn không hạ Già làng

4. Thợ săn đánh dấu lại (sống); Bảo vệ bảo hộ **Già làng**; Tiên tri bỏ qua.
5. Ma sói tấn công Già làng **CÓ tick "Cắn xuyên bảo vệ (Sói Đầu Đàn)"** →
   bảo vệ bị xuyên, nhưng **Già làng sống nhờ lần cắn đầu** (passive tiêu
   thụ). Phù thủy bỏ qua.
6. Bình minh: **"Không ai bị loại"** — Già làng vẫn sống.
7. Ngày 2 tiếp tục bế tắc: mở biểu quyết, đếm tay "Kết quả hòa", bỏ qua lượt 2.

### Hồi 3 — Đêm 3: lần cắn thứ hai

8. Thợ săn đánh dấu lại; Bảo vệ bảo hộ Tiên tri (không thể lặp Già làng hai
   đêm liên tiếp); Tiên tri soi Dân V → NGƯỜI.
9. Ma sói tấn công Già làng (đòn thường — đòn tăng cường đã dùng) → Già làng
   **chết**. Phù thủy bỏ qua.
10. Bình minh: "Kết quả dự kiến" = Già làng.

### Hồi 4 — Ngày 3: làng phản công

11. Mở biểu quyết (6 người sống): 5 phe làng vote Sói Đầu Đàn; Sói vote Tiên
    tri. Lá cuối tự tổng kết → xác nhận kết quả → Sói Đầu Đàn bị loại →
    **"Phe Dân làng chiến thắng"**.

## Điểm xác minh

- Đòn thường bị Bảo vệ chặn (đêm 1 không ai chết).
- Đòn tăng cường xuyên được bảo vệ nhưng Già làng sống qua lần cắn đầu (đêm 2).
- Lần cắn thứ hai hạ Già làng (đêm 3) — chứng tỏ passive đã tiêu thụ.
- Checkbox tăng cường biến mất sau khi dùng (đêm 3 form không còn checkbox).
- Tiên tri soi Sói Đầu Đàn: "SÓI".
- Kết cục "Phe Dân làng chiến thắng" qua biểu quyết thiết bị.

## Ghi chú kỹ thuật

- Toàn bộ đêm đi proxy của Quản trò; chỉ vòng biểu quyết cuối đi đường thiết bị.
- Runtime ước tính: ~4 phút (3 đêm, 2 skip lượt Phù thủy mỗi đêm).
