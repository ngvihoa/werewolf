import type { GameStore } from './game-store'

import { PostgresGameStore } from './postgres-game-store'

const localGlobal = globalThis as typeof globalThis & {
  __werewolfGameStore?: PostgresGameStore
}

export const localGameStore: GameStore =
  localGlobal.__werewolfGameStore ??
  (localGlobal.__werewolfGameStore = new PostgresGameStore())
