import type { GameStore } from './game-store'

import { InMemoryGameStore } from './in-memory-game-store'

const localGlobal = globalThis as typeof globalThis & {
  __werewolfGameStore?: InMemoryGameStore
}

export const localGameStore: GameStore =
  localGlobal.__werewolfGameStore ??
  (localGlobal.__werewolfGameStore = new InMemoryGameStore())
