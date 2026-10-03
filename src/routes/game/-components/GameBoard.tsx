import type { CommandHandler } from './types'
import type { GameView } from '#/game/projections/model'

import { ModeratorGamePanel } from './ModeratorGamePanel'
import { PlayerGamePanel } from './PlayerGamePanel'

export function GameBoard({
  view,
  pending,
  error,
  onCommand,
  onRematch,
}: {
  view: GameView
  pending: boolean
  error: string | null
  onCommand: CommandHandler
  onRematch: () => void
}) {
  if (view.viewer === 'MODERATOR') {
    const state = view.game.state
    if (!state) return null
    return (
      <ModeratorGamePanel
        state={state}
        names={
          new Map(
            view.game.lobbyPlayers.map((player) => [
              player.id,
              player.displayName,
            ]),
          )
        }
        pending={pending}
        error={error}
        onCommand={onCommand}
        onRematch={onRematch}
      />
    )
  }

  return (
    <PlayerGamePanel
      view={view}
      pending={pending}
      error={error}
      onCommand={onCommand}
      // T7 (SELF): host mở ván mới từ màn kết quả; MODERATED không truyền —
      // rematch là việc của Quản trò.
      onRematch={view.gameMode === 'SELF' ? onRematch : undefined}
    />
  )
}
