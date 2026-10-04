import type { PlayerGameView } from '#/game/projections/model'
import type { CommandHandler } from '../../game/-components/types'
import type { FormEvent } from 'react'

import { WaitingState } from '#/components/ui/WaitingState'
import { PlayerToken } from '#/components/ui/PlayerToken'
import { InlineError } from '#/components/InlineError'
import { useState } from 'react'

import { CommandButton } from '../../game/-components/CommandButton'

/**
 * Revamp MODERATED (M6): biểu quyết ban ngày qua thiết bị — picker người sống
 * hoặc phiếu trắng; counts theo ứng viên hiện live cho cả bàn (KHÔNG lộ ai
 * bỏ ai). Đủ phiếu hệ thống tự tính, quản trò công bố.
 */
export function TableVoteForm({
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
  const [blank, setBlank] = useState(false)
  const [targetId, setTargetId] = useState('')

  if (!vote) return null

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onCommand({
      type: 'SUBMIT_VOTE',
      actorId: view.me.id,
      targetId: blank ? null : targetId,
    })
  }

  if (vote.hasVoted) {
    return (
      <WaitingState
        title="Đã ghi phiếu của bạn"
        description="Đủ phiếu thì hệ thống tính kết quả và quản trò công bố."
      />
    )
  }

  const targets = view.players.filter((player) => player.alive)
  const candidateCounts = vote.candidateCounts ?? {}
  const ranked = Object.entries(candidateCounts).sort((a, b) => b[1] - a[1])

  return (
    <form className="flex flex-col gap-5" onSubmit={submit}>
      <div className="flex flex-col gap-1">
        <p className="font-mono text-sm tracking-wide text-accent uppercase">
          Lượt biểu quyết {vote.voteAttempt}/2
        </p>
        <p className="font-mono text-sm tabular-nums text-ink-subtle">
          {vote.votedCount}/{vote.aliveCount} người đã bỏ phiếu
        </p>
        {ranked.length > 0 ? (
          <ul className="flex flex-col list-none gap-1 pt-1">
            {ranked.map(([candidateId, count]) => (
              <li
                className="flex items-center justify-between gap-3 text-sm/6 text-ink-muted"
                key={candidateId}
              >
                <span>
                  {targets.find((player) => player.id === candidateId)
                    ?.displayName ?? 'Người chơi'}
                </span>
                <span className="font-mono tabular-nums">{count}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <div
        aria-label="Chọn người bị loại"
        className={`grid auto-rows-fr grid-cols-2 gap-2.5 sm:grid-cols-3 ${blank ? 'pointer-events-none opacity-40' : ''}`}
        role="group"
      >
        {targets.map((player, index) => (
          <PlayerToken
            key={player.id}
            displayName={player.displayName}
            index={index}
            selectable
            selected={player.id === targetId}
            onSelect={() => setTargetId(player.id)}
          />
        ))}
      </div>
      <label className="flex items-center gap-3 text-base/7 text-ink-muted sm:text-sm/6">
        <input
          className="size-5 accent-danger sm:size-4"
          name="blank"
          type="checkbox"
          checked={blank}
          onChange={(event) => setBlank(event.target.checked)}
        />
        Bỏ phiếu trắng
      </label>
      <div className="sticky bottom-0 -mx-1 bg-linear-to-t from-midnight via-midnight/90 px-1 pt-5 pb-safe">
        {error ? <InlineError message={error} /> : null}
        <CommandButton
          primary
          pending={pending}
          type="submit"
          disabled={!blank && !targetId}
        >
          Ghi phiếu
        </CommandButton>
      </div>
    </form>
  )
}
