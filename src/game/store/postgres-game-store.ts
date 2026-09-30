import type {
  CreatedGame,
  GameMutationResult,
  JoinedGame,
  StoreResult,
} from './model'
import type { ExecuteGameCommandInput, GameStore } from './game-store'
import type { RoleCompositionSelection } from '../domain'
import type { PostgresStoreDeps } from './postgres/shared'
import type { GameView } from '../projections/model'

import { db } from '#/db/client'

import {
  createSessionExpiry,
  createSessionToken,
  hashSessionToken,
} from '../auth/session-token'

import { getGameView as getGameViewCommand } from './postgres/game-view'
import { executeGameCommand } from './postgres/execute-command'
import { createRoomCode } from './utils.room-code'
import {
  assignRoles as assignRolesCommand,
  createGame as createGameCommand,
  startGame as startGameCommand,
  joinGame as joinGameCommand,
  setReady as setReadyCommand,
  rematch as rematchCommand,
} from './postgres/lobby-commands'

type PostgresGameStoreDependencies = {
  database?: typeof db
  createRoomCode?: () => string
  createSessionToken?: () => string
  hashSessionToken?: (token: string) => string
  createSessionExpiry?: (now: Date) => Date
  now?: () => Date
}

// Class chỉ giữ dependency injection và mapping 1-1 sang command modules.
// Toàn bộ logic transaction nằm trong `postgres/`:
// - `lobby-commands.ts`: createGame, joinGame, setReady, assignRoles, startGame, rematch
// - `execute-command.ts`: night/vote command pipeline
// - `game-view.ts`: permission-aware projection
// - helpers: sessions, command-receipts, game-events, state-sync, errors
export class PostgresGameStore implements GameStore {
  readonly #deps: PostgresStoreDeps

  constructor(dependencies: PostgresGameStoreDependencies = {}) {
    this.#deps = {
      database: dependencies.database ?? db,
      createRoomCode: dependencies.createRoomCode ?? createRoomCode,
      createSessionToken: dependencies.createSessionToken ?? createSessionToken,
      hashSessionToken: dependencies.hashSessionToken ?? hashSessionToken,
      createSessionExpiry:
        dependencies.createSessionExpiry ?? createSessionExpiry,
      now: dependencies.now ?? (() => new Date()),
    }
  }

  createGame(moderatorName: string): Promise<StoreResult<CreatedGame>> {
    return createGameCommand(this.#deps, moderatorName)
  }

  joinGame(
    roomCode: string,
    displayName: string,
  ): Promise<StoreResult<JoinedGame>> {
    return joinGameCommand(this.#deps, roomCode, displayName)
  }

  setReady(
    sessionToken: string,
    expectedVersion: number,
    ready: boolean,
    idempotencyKey: string,
  ): Promise<StoreResult<GameMutationResult>> {
    return setReadyCommand(
      this.#deps,
      sessionToken,
      expectedVersion,
      ready,
      idempotencyKey,
    )
  }

  assignRoles(
    sessionToken: string,
    expectedVersion: number,
    idempotencyKey: string,
    composition?: RoleCompositionSelection,
  ): Promise<StoreResult<GameMutationResult>> {
    return assignRolesCommand(
      this.#deps,
      sessionToken,
      expectedVersion,
      idempotencyKey,
      composition,
    )
  }

  startGame(
    sessionToken: string,
    expectedVersion: number,
    idempotencyKey: string,
  ): Promise<StoreResult<GameMutationResult>> {
    return startGameCommand(
      this.#deps,
      sessionToken,
      expectedVersion,
      idempotencyKey,
    )
  }

  rematch(
    sessionToken: string,
    expectedVersion: number,
    idempotencyKey: string,
  ): Promise<StoreResult<GameMutationResult>> {
    return rematchCommand(
      this.#deps,
      sessionToken,
      expectedVersion,
      idempotencyKey,
    )
  }

  getGameView(sessionToken: string): Promise<StoreResult<GameView>> {
    return getGameViewCommand(this.#deps, sessionToken)
  }

  execute(
    input: ExecuteGameCommandInput,
  ): Promise<StoreResult<GameMutationResult>> {
    return executeGameCommand(this.#deps, input)
  }
}
