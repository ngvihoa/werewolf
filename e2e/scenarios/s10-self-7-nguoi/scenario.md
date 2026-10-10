# S10 — Ván SELF 7 người: cả bàn tự hành động, bot quản trò điều phối

## Mục tiêu

Mô phỏng chế độ **không quản trò** (SELF, R20–R24) ở bàn 7 người — quy mô mà
Phù thủy và Bảo vệ mới vào bàn: mọi xác nhận "Quản trò" do bot lo, người
chơi tự submit hành động/bỏ phiếu trên thiết bị của mình. Kịch bản đi trọn:
đêm có cứu → consent mở biểu quyết → vote loại Sói → đêm 2 độc Sói cuối →
làng thắng → **chơi ván mới cùng phòng**.

Xác minh:

- Form hành động đêm tự động trên thiết bị đúng chủ vai, đúng lượt (Bảo vệ →
  Tiên tri → Sói → Phù thủy).
- Phù thủy **cứu** nạn nhân Sói ngay đêm 1 — không ai chết.
- Consent (R21): đủ majority bấm "Sẵn sàng bỏ phiếu" + hết thảo luận tối
  thiểu → bot mở biểu quyết.
- Vote thiết bị 7/7 tự tổng kết, bot tự công bố.
- Đêm 2: Phù thủy **độc** Sói cuối — làng thắng.
- Rematch: chủ phòng mở ván mới cùng phòng, phòng về sảnh chờ.

## Bối cảnh

| Hạng mục    | Giá trị                                                              |
| ----------- | -------------------------------------------------------------------- |
| Chế độ      | SELF (không quản trò — bot điều phối)                                |
| Số người    | 7 (chủ phòng + 6 người chơi, chủ phòng cũng là người chơi)           |
| Composition | Mặc định 7 người: Ma sói ×2, Tiên tri, Phù thủy, Bảo vệ, Dân làng ×2 |

## Dàn vai

Phát hiện runtime qua dialog "Xem vai trò" trên từng thiết bị
(`findPlayerByRole`): Ma sói 1, Ma sói 2, Tiên tri, Phù thủy, Bảo vệ,
Dân V1, Dân V2.

## Kịch bản

### Hồi 1 — Đêm 1: bàn tự ngủ, tự hành động

1. Bảo vệ bảo hộ Tiên tri (form "Gửi hành động" trên thiết bị Bảo vệ).
2. Tiên tri soi **Ma sói 1** → "Lịch sử soi" ghi MA SÓI.
3. Ma sói 1 cắn **Dân V1** (cả hai Sói đều thấy form — một Sói submit là đàn
   cùng hành động).
4. Phù thủy tick **"Dùng bình cứu"** — cứu Dân V1.
5. Bot tự xác nhận từng bước, tự mở bình minh: **không ai chết**.

### Hồi 2 — Ngày 1: consent và biểu quyết

6. Cả 7 người sống bấm "Sẵn sàng bỏ phiếu" (mỗi người thấy "Bạn đã sẵn
   sàng"); đủ majority + hết thảo luận tối thiểu → bot mở biểu quyết.
7. Thiết bị: 5 phe làng vote **Ma sói 1**; 2 Sói vote Tiên tri. Lá cuối tự
   tổng kết → bot công bố → Ma sói 1 bị loại, ván về Đêm 02.

### Hồi 3 — Đêm 2: liều thuốc cuối

8. Bảo vệ bảo hộ Tiên tri (không lặp cùng mục tiêu hai đêm liên tiếp là luật
   của Bảo vệ — đêm trước đã hộ Tiên tri? Không: đêm 1 hộ Tiên tri, đêm 2 hộ
   Dân V2). Tiên tri soi **Ma sói 2** → MA SÓI.
9. Ma sói 2 cắn **Dân V1** (lần này không ai cứu). Phù thủy **độc Ma sói 2**.
10. Bot công bố bình minh: Dân V1 + Ma sói 2 cùng chết → phe Sói rỗng →
    **"Phe Dân làng chiến thắng"**.

### Hồi 4 — Kết thúc và chơi lại

11. Thiết bị chủ phòng: banner "Phe Dân làng chiến thắng" + nút **"Chơi ván
    mới cùng phòng"** → "Xác nhận chơi ván mới" → phòng về sảnh chờ
    ("Xáo và phân vai").

## Điểm xác minh

- Form hành động đêm tự hiện đúng chủ vai, đúng thứ tự hàng đợi.
- Bình cứu đêm 1 chặn được cắn; bình độc đêm 2 hạ Sói cuối.
- Consent majority + thảo luận tối thiểu mở biểu quyết đúng cơ chế bot.
- Vote 7/7 tự tổng kết, bot tự công bố loại Ma sói 1.
- Rematch reset phòng về sảnh chờ.

## Ghi chú kỹ thuật

- SELF không có reload-poll cho panel quản trò (không có quản trò) — mọi
  trang đều là trang người chơi, dùng reloadUntilVisible cho từng bước.
- Thảo luận tối thiểu 30s (hằng số bot) — vòng consent chờ mốc này.
- Runtime ước tính: ~5 phút.
