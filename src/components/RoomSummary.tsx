import { Check, Copy } from 'lucide-react'
import { useState } from 'react'

async function writeToClipboard(value: string) {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(value)
    return
  }

  const textArea = document.createElement('textarea')
  textArea.value = value
  textArea.style.position = 'fixed'
  textArea.style.opacity = '0'
  document.body.append(textArea)
  textArea.select()
  const copied = document.execCommand('copy')
  textArea.remove()
  if (!copied) throw new Error('Clipboard is unavailable')
}

export function RoomSummary({
  gameStarted,
  roomCode,
  version,
}: {
  gameStarted: boolean
  roomCode: string
  version: number
}) {
  const [copyStatus, setCopyStatus] = useState<'IDLE' | 'COPIED' | 'ERROR'>(
    'IDLE',
  )

  async function copyRoomCode() {
    try {
      await writeToClipboard(roomCode)
      setCopyStatus('COPIED')
      window.setTimeout(() => setCopyStatus('IDLE'), 2_000)
    } catch {
      setCopyStatus('ERROR')
    }
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
              Phòng <span className="font-mono text-red-200">{roomCode}</span>
            </h1>
            <button
              aria-label={
                copyStatus === 'COPIED'
                  ? 'Đã sao chép mã phòng'
                  : 'Sao chép mã phòng'
              }
              className="grid size-10 shrink-0 place-items-center rounded-full text-stone-400 ring-1 ring-white/10 transition-colors hover:bg-white/5 hover:text-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
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
        <div className="flex items-center gap-2 font-mono text-sm text-stone-500">
          <span className="size-1.5 rounded-full bg-emerald-400" />
          Local sync · v<span className="tabular-nums">{version}</span>
        </div>
      </div>
    </div>
  )
}
