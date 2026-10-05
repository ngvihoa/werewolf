import type { ReactNode } from 'react'

import { copyToClipboard } from '#/lib/clipboard'
import { Check, Copy } from 'lucide-react'
import { useState } from 'react'

export function RoomHeader({
  isModerator,
  roomCode,
  actions,
  leaveLabel = 'Rời phòng',
  onLeave,
}: {
  isModerator: boolean
  roomCode?: string
  actions?: ReactNode
  // SELF trong ván đổi nhãn thành "Rời ván" — rút khỏi ván trong game state
  // (R23), không phải rút phiên local.
  leaveLabel?: string
  onLeave: () => void
}) {
  const [copyStatus, setCopyStatus] = useState<'IDLE' | 'COPIED' | 'ERROR'>(
    'IDLE',
  )

  async function copyRoomCode() {
    if (!roomCode) return
    try {
      await copyToClipboard(roomCode)
      setCopyStatus('COPIED')
      window.setTimeout(() => setCopyStatus('IDLE'), 2_000)
    } catch {
      setCopyStatus('ERROR')
    }
  }

  return (
    <header className="flex items-center justify-between gap-3 border-b border-line pb-4">
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden="true"
          className="size-2 shrink-0 rounded-full bg-danger shadow-[0_0_24px_var(--color-red-500)]"
        />
        <p className="truncate font-mono text-sm tracking-wide text-ink uppercase">
          {isModerator ? 'Bảng Quản trò' : 'Phòng người chơi'}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {roomCode ? (
          <>
            <button
              aria-label={
                copyStatus === 'COPIED'
                  ? 'Đã sao chép mã phòng'
                  : 'Sao chép mã phòng'
              }
              className="flex h-10 items-center gap-2 rounded-full bg-midnight/90 pr-3.5 pl-4 ring-1 ring-line-strong backdrop-blur-sm transition-colors hover:bg-midnight/95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
              title={
                copyStatus === 'COPIED'
                  ? 'Đã sao chép'
                  : copyStatus === 'ERROR'
                    ? 'Không thể sao chép'
                    : 'Sao chép mã phòng'
              }
              type="button"
              onClick={() => void copyRoomCode()}
            >
              <span className="theme-room-code font-mono text-sm tracking-[0.14em]">
                {roomCode}
              </span>
              {copyStatus === 'COPIED' ? (
                <Check
                  aria-hidden="true"
                  className="size-3.5 text-emerald-300"
                />
              ) : (
                <Copy aria-hidden="true" className="size-3.5 text-ink-muted" />
              )}
            </button>
            <span aria-live="polite" className="sr-only">
              {copyStatus === 'COPIED'
                ? 'Đã sao chép mã phòng'
                : copyStatus === 'ERROR'
                  ? 'Không thể sao chép mã phòng'
                  : ''}
            </span>
          </>
        ) : null}
        {actions}
        <button
          className="relative shrink-0 px-2 py-2 text-sm text-ink transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
          type="button"
          onClick={onLeave}
        >
          {leaveLabel}
          <span
            aria-hidden="true"
            className="pointer-fine:hidden absolute top-1/2 left-1/2 size-[max(100%,3rem)] -translate-1/2"
          />
        </button>
      </div>
    </header>
  )
}
