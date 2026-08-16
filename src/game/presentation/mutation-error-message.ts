const STORE_ERROR_MESSAGES: Record<string, string> = {
  DUPLICATE_DISPLAY_NAME:
    'Tên này đã có người sử dụng trong phòng. Hãy chọn một tên khác.',
  GAME_ALREADY_STARTED:
    'Ván chơi đã bắt đầu. Hãy quay lại phòng hiện tại để tiếp tục.',
  GAME_NOT_FOUND:
    'Không tìm thấy phòng này. Hãy kiểm tra lại mã phòng hoặc tạo phòng mới.',
  IDEMPOTENCY_KEY_REUSED:
    'Yêu cầu cũ không còn hợp lệ. Hãy thực hiện lại thao tác.',
  INVALID_GAME_STATE:
    'Trạng thái ván chơi đã thay đổi nên thao tác này không còn hợp lệ. Hãy kiểm tra màn hình và chọn lại.',
  NOT_ALL_PLAYERS_READY:
    'Vẫn còn người chơi chưa sẵn sàng. Hãy đợi mọi người xác nhận trước khi bắt đầu.',
  NOT_AUTHORIZED:
    'Bạn không có quyền thực hiện thao tác này. Hãy dùng đúng màn hình của người chơi hoặc Quản trò.',
  ROLES_NOT_ASSIGNED:
    'Chưa thể bắt đầu vì vai trò chưa được phân. Quản trò cần xáo và phân vai trước.',
  SESSION_NOT_FOUND:
    'Phiên tham gia đã hết hạn hoặc không còn hợp lệ. Hãy rời phòng và tham gia lại.',
  STALE_VERSION:
    'Trạng thái phòng tiếp tục thay đổi trong lúc đồng bộ. Hãy kiểm tra thông tin mới nhất rồi thử lại.',
}

export function mutationErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = String(error.code)
    return (
      STORE_ERROR_MESSAGES[code] ??
      'Không thể hoàn tất thao tác ở trạng thái hiện tại. Hãy kiểm tra màn hình và thử lại.'
    )
  }

  return 'Không thể kết nối đến máy chủ. Hãy kiểm tra mạng và thử lại.'
}
