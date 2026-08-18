# Product Scope

## 1. Product Concept

Sản phẩm là một **Werewolf Moderator Assistant** dành cho các ván Ma Sói chơi trực tiếp.

Mọi người vẫn ngồi cùng nhau ngoài đời và sử dụng điện thoại như một công cụ hỗ trợ. Hệ thống quản lý thông tin bí mật, thứ tự hành động, trạng thái và lịch sử; phần thảo luận xã hội vẫn diễn ra trực tiếp.

Hệ thống không đóng vai Quản trò hoàn toàn.

### Phân vai trách nhiệm

**System**

- Random role.
- Hiển thị role cho đúng người.
- Điều phối phase.
- Xây dựng và chạy Night Action Queue.
- Validate action.
- Tính toán kết quả theo rule.
- Theo dõi Current Game State.
- Ghi Game History.
- Phát hiện tình huống cần Quản trò quyết định.

**Moderator**

- Thiết lập game.
- Theo dõi toàn bộ role và state.
- Xác nhận hoàn thành từng bước quan trọng.
- Xử lý ngoại lệ.
- Manual override khi cần.
- Xem lại lịch sử game.

**Player**

- Xem role của bản thân.
- Xem mô tả chức năng role.
- Xem trạng thái cá nhân.
- Xem trạng thái công khai của người chơi khác.
- Thực hiện action khi hệ thống kích hoạt lượt của role mình.

---

## 2. Phạm vi MVP

### Người tham gia

- 1 Moderator.
- 5–6 Player.

Moderator không được tính là một role trong ván.

### Role

MVP chỉ hỗ trợ:

- Villager
- Werewolf
- Seer
- Witch

### Các chức năng chính

1. Tạo game.
2. Người chơi tham gia game.
3. Chọn role set.
4. Random role tự động.
5. Người chơi xem role riêng.
6. Người chơi xem mô tả role.
7. Ready check.
8. Bắt đầu game.
9. Night Action Queue.
10. Player gửi action.
11. Moderator confirm.
12. Day phase.
13. Ghi nhận người bị vote loại.
14. Cập nhật trạng thái sống/chết.
15. Kiểm tra điều kiện thắng.
16. Lưu toàn bộ lịch sử quan trọng.
17. Moderator xem và sửa trạng thái khi xảy ra ngoại lệ.

---

## 3. Ngoài phạm vi MVP

Chưa cần triển khai:

- Voice chat / text chat trong hệ thống.
- Matchmaking online.
- Spectator online.
- Ranking / Elo.
- Friend system.
- Tournament.
- Bot thay người chơi.
- Nhiều Werewolf cùng vote target.
- Neutral faction.
- Lovers / Cupid.
- Sheriff.
- Các role có conversion.
- Các role phụ thuộc hành vi vật lý như Little Girl.

Các tính năng này chỉ nên được xem xét sau khi core loop của MVP ổn định.
