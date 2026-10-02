import { copyToClipboard } from '#/lib/clipboard'
import { Check, Copy, Link2 } from 'lucide-react'
import { useState } from 'react'

import { RoomInviteQR } from './RoomInviteQR'

export function RoomSummary({
  gameStarted,
  roomCode,
  version,
  isModerator = false,
}: {
  gameStarted: boolean
  roomCode: string
  version: number
  /** Quản trò thấy thêm QR mời vào phòng + nút sao chép link mời. */
  isModerator?: boolean
}) {
  const [copyStatus, setCopyStatus] = useState<'IDLE' | 'COPIED' | 'ERROR'>(
    'IDLE',
  )
  const [linkStatus, setLinkStatus] = useState<'IDLE' | 'COPIED' | 'ERROR'>(
    'IDLE',
  )

  async function copyWithStatus(
    value: string,
    setStatus: (status: 'IDLE' | 'COPIED' | 'ERROR') => void,
  ) {
    try {
      await copyToClipboard(value)
      setStatus('COPIED')
      window.setTimeout(() => setStatus('IDLE'), 2_000)
    } catch {
      setStatus('ERROR')
    }
  }

  function copyRoomCode() {
    return copyWithStatus(roomCode, setCopyStatus)
  }

  function copyInviteLink() {
    return copyWithStatus(
      `${window.location.origin}/join/${roomCode}`,
      setLinkStatus,
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="font-mono text-sm tracking-wide text-red-300 uppercase">
        {gameStarted ? 'Ván chơi đã bắt đầu' : 'Đang chờ trong sảnh'}
      </p>
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <h1 className="text-balance text-4xl font-medium tracking-tight text-stone-50 sm:text-5xl">
              Phòng{' '}
              <span className="theme-room-code font-mono">{roomCode}</span>
            </h1>
            <button
              aria-label={
                copyStatus === 'COPIED'
                  ? 'Đã sao chép mã phòng'
                  : 'Sao chép mã phòng'
              }
              className="grid size-10 shrink-0 place-items-center rounded-full text-stone-300 ring-1 ring-white/15 transition-colors hover:bg-white/10 hover:text-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
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
              {copyStatus === 'COPIED' ? (
                <Check aria-hidden="true" className="size-4 text-emerald-300" />
              ) : (
                <Copy aria-hidden="true" className="size-4" />
              )}
            </button>
            {isModerator ? (
              <button
                aria-label={
                  linkStatus === 'COPIED'
                    ? 'Đã sao chép link mời'
                    : 'Sao chép link mời vào phòng'
                }
                className="grid size-10 shrink-0 place-items-center rounded-full text-stone-300 ring-1 ring-white/15 transition-colors hover:bg-white/10 hover:text-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
                title={
                  linkStatus === 'COPIED'
                    ? 'Đã sao chép link mời'
                    : linkStatus === 'ERROR'
                      ? 'Không thể sao chép'
                      : 'Sao chép link mời vào phòng'
                }
                type="button"
                onClick={() => void copyInviteLink()}
              >
                {linkStatus === 'COPIED' ? (
                  <Check
                    aria-hidden="true"
                    className="size-4 text-emerald-300"
                  />
                ) : (
                  <Link2 aria-hidden="true" className="size-4" />
                )}
              </button>
            ) : null}
            <span aria-live="polite" className="sr-only">
              {copyStatus === 'COPIED'
                ? 'Đã sao chép mã phòng'
                : copyStatus === 'ERROR'
                  ? 'Không thể sao chép mã phòng'
                  : ''}
            </span>
          </div>
          <p className="text-pretty text-base/7 text-stone-400 sm:text-sm/6">
            Chia sẻ mã này cho người chơi mở trong tab hoặc thiết bị khác.
          </p>
        </div>
        <div className="flex items-center gap-5">
          {isModerator ? <RoomInviteQR roomCode={roomCode} /> : null}
          <div className="flex items-center gap-2 font-mono text-sm text-stone-500">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            Đã đồng bộ · v<span className="tabular-nums">{version}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
