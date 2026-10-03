import type {
  CreatedGame,
  GameMutationResult,
  JoinedGame,
  StoreResult,
} from './model'
import type { RoleCompositionSelection } from '../domain'
import type { GameCommand } from '../orchestration/commands'
import type { GameView } from '../projections/model'

export type Awaitable<T> = T | Promise<T>

export type TickInput = {
  gameId: string
  sessionToken: string
}

// MODERATED: người tạo là Quản trò và nhận moderator session.
// SELF: người tạo là chủ phòng — một player thường được quyền cấu hình.
export type CreateGameInput =
  | { mode: 'MODERATED'; moderatorName: string }
  | { mode: 'SELF'; creatorName: string }

/**
 * Định nghĩa schema cho một lệnh thực thi trong game
 */
export type ExecuteGameCommandInput = {
  gameId: string
  sessionToken: string
  idempotencyKey: string
  expectedVersion: number
  command: GameCommand
}

/**
 * Abstract layer cho game state management provider
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export interface GameStore {
  /**
   * Tạo một game mới
   * @param input Mode và tên người tạo phòng
   * @returns Kết quả tạo game
   */
  createGame(input: CreateGameInput): Awaitable<StoreResult<CreatedGame>>

  /**
   * Tham gia một game
   * @param roomCode Mã phòng
   * @param displayName Tên hiển thị của player
   * @returns Kết quả tham gia phòng
   */
  joinGame(
    roomCode: string,
    displayName: string,
  ): Awaitable<StoreResult<JoinedGame>>

  /**
   * Lấy game view dựa trên session token
   * @param sessionToken Token phiên
   * @returns Game view
   */
  getGameView(sessionToken: string): Awaitable<StoreResult<GameView>>

  /**
   * Đặt trạng thái sẵn sàng cho người chơi
   * Player mode
   * @param sessionToken Token phiên
   * @param expectedVersion Phiên bản hiện tại của game
   * @param ready Trạng thái sẵn sàng
   * @returns Kết quả đặt trạng thái sẵn sàng
   */
  setReady(
    sessionToken: string,
    expectedVersion: number,
    ready: boolean,
    idempotencyKey: string,
  ): Awaitable<StoreResult<GameMutationResult>>

  /**
   * Gán vai trò cho người chơi
   * Moderator mode
   * @param sessionToken Token phiên
   * @returns Kết quả là thông tin của Game ở trang thái Local
   */
  assignRoles(
    sessionToken: string,
    expectedVersion: number,
    idempotencyKey: string,
    composition?: RoleCompositionSelection,
  ): Awaitable<StoreResult<GameMutationResult>>

  /**
   * Bắt đầu game
   * Moderator mode
   * @param sessionToken Token phiên
   * @returns Kết quả là thông tin của Game ở trang thái Local
   */
  startGame(
    sessionToken: string,
    expectedVersion: number,
    idempotencyKey: string,
  ): Awaitable<StoreResult<GameMutationResult>>

  rematch(
    sessionToken: string,
    expectedVersion: number,
    idempotencyKey: string,
  ): Awaitable<StoreResult<GameMutationResult>>

  /**
   * Thực thi một lệnh bất kỳ xảy ra trong một đêm
   * @param input Thông tin lệnh
   * @returns Kết quả thực thi lệnh
   */
  execute(
    input: ExecuteGameCommandInput,
  ): Awaitable<StoreResult<GameMutationResult>>

  /**
   * R22 — lazy tick: client gọi khi countdown về 0; store dùng đồng hồ server
   * để chạy bot timeout (skip step / abstain / mất phát bắn hunter). Idempotent:
   * tick khi không có gì hết giờ chỉ trả về version hiện tại.
   */
  tick(input: TickInput): Awaitable<StoreResult<GameMutationResult>>
}
