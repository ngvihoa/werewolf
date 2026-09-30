export function isRoomCodeCollision(error: unknown) {
  return isPostgresConstraintViolation(error, '23505', 'games_room_code_unique')
}

export function isDuplicateDisplayNameCollision(error: unknown) {
  return isPostgresConstraintViolation(
    error,
    '23505',
    'game_players_game_display_name_unique_idx',
  )
}

function isPostgresConstraintViolation(
  error: unknown,
  code: string,
  constraintName: string,
) {
  if (!error || typeof error !== 'object') {
    return false
  }

  // DrizzleQueryError giữ lỗi gốc của postgres-js trong `cause`.
  // Vẫn kiểm tra chính error để helper hoạt động cả khi nhận PostgresError trực tiếp.
  const wrappedError = error as { cause?: unknown }
  const candidates = [error, wrappedError.cause]

  return candidates.some(
    (candidate) =>
      candidate !== null &&
      typeof candidate === 'object' &&
      'code' in candidate &&
      candidate.code === code &&
      'constraint_name' in candidate &&
      candidate.constraint_name === constraintName,
  )
}
