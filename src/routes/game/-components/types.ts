import type { GameCommand } from '#/game/orchestration/commands'

export type CommandHandler = (command: GameCommand) => void
