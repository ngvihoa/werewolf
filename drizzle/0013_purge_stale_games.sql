-- Custom SQL migration file, put your code below! --
-- Vòng đời dữ liệu: các bảng con (game_players, game_sessions, game_queue_steps,
-- game_actions, command_receipts, game_events) đều ON DELETE CASCADE về games nên
-- xóa dòng trong games là đủ để dọn toàn bộ dữ liệu của một ván.
CREATE OR REPLACE FUNCTION purge_stale_games(
  p_game_over_days integer DEFAULT 3,
  p_lobby_idle_hours integer DEFAULT 24,
  p_in_progress_days integer DEFAULT 7
) RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  purged integer;
BEGIN
  DELETE FROM games
  WHERE
    (
      status = 'GAME_OVER'
      AND updated_at < now() - make_interval(days => p_game_over_days)
    )
    OR (
      status = 'LOBBY'
      AND updated_at < now() - make_interval(hours => p_lobby_idle_hours)
    )
    OR (
      status = 'IN_PROGRESS'
      AND updated_at < now() - make_interval(days => p_in_progress_days)
    );
  GET DIAGNOSTICS purged = ROW_COUNT;
  RETURN purged;
END;
$$;
