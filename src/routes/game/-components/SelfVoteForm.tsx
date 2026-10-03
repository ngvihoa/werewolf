import type { PlayerGameView } from '#/game/projections/model'
import type { CommandHandler } from './types'
import type { FormEvent } from 'react'

import { WaitingState } from '#/components/ui/WaitingState'
import { PlayerToken } from '#/components/ui/PlayerToken'
import { InlineError } from '#/components/InlineError'
import { useState } from 'react'

import { CommandButton } from './CommandButton'

/**
 * R20 — bỏ phiếu trên thiết bị ở mode SELF: mỗi người sống chọn một người bị
 * loại. Nội dung phiếu không lộ cho ai; projection chỉ đưa count để tránh
 * bandwagon khi cả bàn ngồi cạnh nhau.
 */
export function SelfVoteForm({
  view,
  pending,
  error,
  onCommand,
}: {
  view: PlayerGameView
  pending: boolean
  error: string | null
  onCommand: CommandHandler
}) {
  const vote = view.vote
  const [targetId, setTargetId] = useState('')

  if (!vote) return null

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!targetId) return
    onCommand({
      type: 'SUBMIT_VOTE',
      actorId: view.me.id,
      targetId,
    })
  }

  if (vote.hasVoted) {
    return (
      <WaitingState
        title="Đã ghi phiếu của bạn"
        description="Kết quả công khai ngay khi đủ phiếu. Nội dung từng lá phiếu vẫn kín tới lúc đó."
      />
    )
  }

  const targets = view.players.filter((player) => player.alive)

  return (
    <form className="flex flex-col gap-5" onSubmit={submit}>
      {vote.votedCount > 0 ? (
        <p className="font-mono text-sm tabular-nums text-ink-subtle">
          {vote.votedCount}/{vote.aliveCount} người đã bỏ phiếu
          {vote.voteAttempt === 2 ? ' · lần biểu quyết 2' : ''}
        </p>
      ) : null}
      <div
        aria-label="Chọn người bị loại"
        className="grid auto-rows-fr grid-cols-2 gap-2.5 sm:grid-cols-3"
        role="group"
      >
        {targets.map((player, index) => (
          <PlayerToken
            key={player.id}
            displayName={player.displayName}
            index={index}
            dead={false}
            selectable
            selected={player.id === targetId}
            onSelect={() => setTargetId(player.id)}
          />
        ))}
      </div>
      <div className="sticky bottom-0 -mx-1 bg-linear-to-t from-midnight via-midnight/90 px-1 pt-5 pb-safe">
        {error ? <InlineError message={error} /> : null}
        <CommandButton
          primary
          pending={pending}
          type="submit"
          disabled={!targetId}
        >
          Bỏ phiếu
        </CommandButton>
      </div>
    </form>
  )
}
