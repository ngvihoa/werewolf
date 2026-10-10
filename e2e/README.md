# e2e — Ma sói (Moonveil)

Playwright chromium. Chạy toàn bộ: `pnpm test:e2e` (dev server 3100 tự khởi
động/tái dùng). Chạy một kịch bản:

```bash
pnpm test:e2e scenarios/s03-phu-thuy-hai-binh
```

> **Giới hạn đã biết (2026-10):** DATABASE_URL trỏ tới **Supabase remote**
> (pooler Singapore) — suite dài dồn hàng chục poll/mutation qua mạng; khi
> độ trễ tới Supabase tăng vọt thì test đang chạy gãy ở khâu join/refetch/
> xác nhận (`Game invalidation channel · TIMED_OUT`, request treo). Số test
> pass mỗi run trọn bộ dao động 16–19/20 và **bộ gãy khác nhau mỗi lần**
> (flaky theo mạng, không theo logic — mỗi test đều đã pass riêng lẻ nhiều
> lần). Chạy ổn định nhất theo file/folder riêng hoặc nhóm 5–7 test. Cách
> xử lý tận gốc: DB local cho e2e (ngoài phạm vi bộ test).

## Hai lớp test

| Lớp                    | Vị trí              | Nội dung                                                                                     |
| ---------------------- | ------------------- | -------------------------------------------------------------------------------------------- |
| Hồi quy lối vào        | `*.spec.ts` (gốc)   | Smoke lobby/deep link/QR, hồi quy revamp MODERATED, ván SELF cơ bản, AFK, rời ván            |
| **Kịch bản chơi thật** | `scenarios/<slug>/` | Mỗi folder = 1 ván diễn trọn: `scenario.md` (kịch bản chi tiết) + `index.spec.ts` (bản diễn) |

Kịch bản mô phỏng **luồng chơi thật** — phối hợp nhiều vai qua nhiều đêm với
kết cục cụ thể — chứ không test từng feature rời rạc (việc của unit/integration).

## Index kịch bản

| #   | Kịch bản                                                                   | Chế độ     | Bàn & composition | Vai được xác minh (hành động thật qua UI)                                                                              | Kết cục                       | Vote               | Runtime |
| --- | -------------------------------------------------------------------------- | ---------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ------------------ | ------- |
| S01 | [Ván kinh điển](scenarios/s01-van-kinh-dien/scenario.md)                   | MODERATED  | 8 · Mặc định      | Sói cắn, Bảo vệ chặn, Tiên tri soi (card), Phù thủy **cứu** + **độc**, Thợ săn mark, vote thiết bị 8/8                 | Dân làng thắng                | Thiết bị           | ~3′     |
| S02 | [Phe Sói thắng](scenarios/s02-phe-soi-thang/scenario.md)                   | MODERATED  | 8 · Mặc định      | Skip bước đêm, đếm tay, **phát súng cuối qua thiết bị** (HUNTER_SHOT)                                                  | **Ma sói thắng**              | Đếm tay + thiết bị | ~3.5′   |
| S03 | [Phù thủy hai bình](scenarios/s03-phu-thuy-hai-binh/scenario.md)           | MODERATED  | 6 · Mặc định      | Cứu nạn nhân + **độc Sói** cùng đêm, card Báo Phù thủy                                                                 | Dân làng thắng ngay bình minh | —                  | ~1′     |
| S04 | [Sói Đầu Đàn & Già làng](scenarios/s04-soi-dau-dan-truong-lao/scenario.md) | MODERATED  | 7 · Tự chọn       | Cắn thường bị chặn, **cắn xuyên bảo vệ**, Già làng **sống lần cắn đầu**, ngày bế tắc (kết quả hòa + bỏ qua revote)     | Dân làng thắng                | Hòa + thiết bị     | ~4′     |
| S05 | [Kẻ Ngốc thắng](scenarios/s05-ke-ngoc-thang/scenario.md)                   | MODERATED  | 5 · Tự chọn       | Soi Ngốc ra NGƯỜI, vote plurality 2/4 loại Ngốc                                                                        | **Thằng ngốc thắng**          | Thiết bị           | ~1.5′   |
| S06 | [Cặp tình nhân](scenarios/s06-cap-tinh-nhan/scenario.md)                   | MODERATED  | 6 · Tự chọn       | Cupid **ghép đôi 2 mục tiêu**, notice tình nhân trên thiết bị, final 2 khác phe                                        | **Cặp tình nhân thắng**       | Thiết bị           | ~2.5′   |
| S07 | [Người thổi sáo](scenarios/s07-nguoi-thoi-sao/scenario.md)                 | MODERATED  | 5 · Tự chọn       | Charm cộng dồn không lặp, notice "bị mê hoặc", thắng khi cả bàn bị charm                                               | **Người thổi sáo thắng**      | Đếm tay            | ~1.5′   |
| S08 | [Sói Trắng phản bội](scenarios/s08-soi-trang-phan-boi/scenario.md)         | MODERATED  | 7 · Tự chọn       | Sát chiêu **bắt buộc giết Sói**, soi Sói Trắng ra SÓI, ván tiếp diễn khi Sói thường rỗng, sống sót một mình            | **Sói Trắng thắng**           | Đếm tay            | ~4′     |
| S09 | [Đào Nữ & Sói lai](scenarios/s09-dao-nu-va-soi-lai/scenario.md)            | MODERATED  | 7 · Tự chọn       | Kỹ nữ **thăm Sói → chết**, Sói Lai **chuyển hóa bí mật** (card + notice), soi 2 lần NGƯỜI→SÓI, 2 cái chết cùng đêm     | Dân làng thắng                | Đếm tay + thiết bị | ~2′     |
| S10 | [SELF 7 người](scenarios/s10-self-7-nguoi/scenario.md)                     | SELF (bot) | 7 · Mặc định      | Form hành động đêm **trên thiết bị từng vai** (Bảo vệ/Tiên tri/Sói/Phù thủy cứu + độc), consent R21, vote bot, rematch | Dân làng thắng + chơi ván mới | Thiết bị           | ~3.5′   |

Tổng runtime cả bộ: **~25 phút** (mỗi test tự lập bàn riêng, chạy tuần tự).

## Phủ 14/14 vai

| Vai            | Kịch bản           | Hiệu ứng được xác minh                                           |
| -------------- | ------------------ | ---------------------------------------------------------------- |
| Dân làng       | S01–S10            | bị cắn/được cứu/bị loại, vote                                    |
| Ma sói         | S01–S10            | cắn (đơn + đàn), bị bắn/độc/vote                                 |
| Tiên tri       | S01, S03–S10       | soi phe (card + sổ tay), soi lại sau chuyển hóa                  |
| Phù thủy       | S01, S03, S08–S10  | bình cứu chặn cắn, bình độc giết trong đêm, hết bình             |
| Bảo vệ         | S01, S04, S10      | chặn cắn thường, không chặn được cắn xuyên, cấm lặp mục tiêu     |
| Thợ săn        | S01, S02, S04, S08 | mark đêm, phát súng cuối qua thiết bị khi bị loại                |
| Sói Đầu Đàn    | S04                | cắn xuyên bảo vệ một lần, checkbox biến mất sau dùng             |
| Sói Trắng      | S08                | sát chiêu giết Sói (giới hạn mục tiêu), gate thắng phe, solo win |
| Sói Lai        | S09                | bị cắn → chuyển hóa bí mật, soi được trước/sau                   |
| Già làng       | S04                | sống lần cắn đầu (kể cả xuyên bảo vệ), lần hai chết              |
| Thằng ngốc     | S05                | soi ra NGƯỜI, bị vote → thắng tức thì                            |
| Người thổi sáo | S07                | charm mỗi đêm một người mới, thắng khi cả bàn bị charm           |
| Thần tình yêu  | S06                | ghép đôi 2 mục tiêu, cặp đôi thắng final 2                       |
| Kỹ nữ          | S09                | thăm Sói → chết; đòn cắn tại nhà vô hiệu khi đi vắng             |

## Quy ước

- **Cấu trúc kịch bản**: `scenarios/<nn-slug>/scenario.md` (kịch bản chi tiết
  theo template: Mục tiêu · Bối cảnh · Dàn vai · Kịch bản theo hồi · Điểm xác
  minh · Ghi chú kỹ thuật) + `index.spec.ts`. Tên folder không dấu.
- **Chủ vai phát hiện runtime** qua god-view roster (`waitForRoleOwners` —
  parser nhận diện nhãn vai, kẹp cả badge số thứ tự) hoặc dialog "Xem vai trò"
  ở SELF; kịch bản không giả định ai nhận vai nào.
- **Đường biểu quyết**: lai — thiết bị cho lá chốt cốt truyện (assert monitor
  "n/n phiếu" + auto-tally), đếm tay dự phòng cho bước nền dàn thế.
- **Panel Quản trò không refetch đáng tin ở headless** — mọi helper dùng
  reload-poll/bounded dispatch (`fixtures/scenario.ts` có chú thích từng case:
  nút pending "Đang cập nhật...", sticky bar đè vùng click, panel stale cần
  reload). Sửa UI panel phải soát các helper này.
- `fixtures/table.ts` — fixture lập bàn chung (MODERATED + SELF);
  `fixtures/scenario.ts` — helpers cấp "đạo diễn".
