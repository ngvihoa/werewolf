import type {
    CreatedGame,
    GameMutationResult,
    JoinedGame,
    LocalGame,
    StoreResult,
} from './model'
import type { GameCommand } from '../orchestration/commands'
import type { GameView } from '../projections/model'

export type Awaitable<T> = T | Promise<T>

/**
 * Định nghĩa schema cho một lệnh thực thi trong game
 */
export type ExecuteGameCommandInput = {
    gameId: string
    sessionToken: string
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
     * Moderator mode
     * @param moderatorName Tên quản trò
     * @returns Kết quả tạo game
     */
    createGame(moderatorName: string): Awaitable<StoreResult<CreatedGame>>

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
    ): Awaitable<StoreResult<GameMutationResult>>

    /**
     * Gán vai trò cho người chơi
     * Moderator mode
     * @param sessionToken Token phiên
     * @returns Kết quả là thông tin của Game ở trang thái Local
     */
    assignRoles(sessionToken: string): Awaitable<StoreResult<LocalGame>>

    /**
     * Bắt đầu game
     * Moderator mode
     * @param sessionToken Token phiên
     * @returns Kết quả là thông tin của Game ở trang thái Local
     */
    startGame(sessionToken: string): Awaitable<StoreResult<LocalGame>>

    /**
     * Thực thi một lệnh bất kỳ xảy ra trong một đêm
     * @param input Thông tin lệnh
     * @returns Kết quả thực thi lệnh
     */
    execute(input: ExecuteGameCommandInput): Awaitable<StoreResult<LocalGame>>
}
