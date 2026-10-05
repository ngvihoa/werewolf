import { useEffect, useRef, useState } from 'react'
import { Check, Copy, Loader2, X } from 'lucide-react'
import { copyToClipboard } from '#/lib/clipboard'
import { Button } from '#/components/ui/Button'
import QRCode from 'qrcode'

/**
 * QR mời vào phòng cho Quản trò: encode link /join/$code để người chơi quét
 * là vào thẳng bước điền tên — gõ mã tay chỉ còn là phương án phụ. Nút 80px
 * luôn hiện trong RoomSummary, bấm phóng to full-screen để chiếu/để bàn xa.
 */
export function RoomInviteQR({ roomCode }: { roomCode: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)
  const joinUrl =
    typeof window === 'undefined'
      ? ''
      : `${window.location.origin}/join/${roomCode}`

  useEffect(() => {
    if (!joinUrl) return
    let cancelled = false
    QRCode.toDataURL(joinUrl, {
      color: { dark: '#101a2eff', light: '#f5eedaff' },
      margin: 2,
      width: 560,
    })
      .then((url) => {
        if (!cancelled) setDataUrl(url)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [joinUrl])

  async function copyJoinLink() {
    try {
      await copyToClipboard(joinUrl)
      setLinkCopied(true)
      window.setTimeout(() => setLinkCopied(false), 2_000)
    } catch {
      setLinkCopied(false)
    }
  }

  return (
    <>
      <button
        aria-label={`Mở mã QR mời vào phòng ${roomCode}`}
        className="block shrink-0 rounded-xl bg-[#f5eeda] p-1.5 ring-1 ring-line-strong transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
        title="Mời người chơi quét mã QR"
        type="button"
        onClick={() => dialogRef.current?.showModal()}
      >
        {dataUrl ? (
          <img
            alt=""
            className="size-20 rounded-lg"
            decoding="async"
            src={dataUrl}
          />
        ) : (
          <span className="grid size-20 place-items-center rounded-lg text-[#101a2e]">
            <Loader2 aria-hidden="true" className="size-5 animate-spin" />
          </span>
        )}
      </button>
      <dialog
        aria-label={`Mã QR mời vào phòng ${roomCode}`}
        className="m-auto bg-transparent p-0 backdrop:bg-black/85"
        ref={dialogRef}
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close()
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') event.currentTarget.close()
        }}
      >
        <div className="ink-panel relative flex flex-col items-center gap-5 rounded-3xl px-6 py-7 sm:px-8">
          <button
            aria-label="Đóng mã QR"
            className="absolute top-2 right-2 grid size-10 place-items-center rounded-full text-ink-muted transition-colors hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
            type="button"
            onClick={() => dialogRef.current?.close()}
          >
            <X aria-hidden="true" className="size-5" />
          </button>
          <p className="font-mono text-sm tracking-wide text-accent uppercase">
            Quét mã để vào phòng
          </p>
          {dataUrl ? (
            <img
              alt={`Mã QR dẫn đến phòng ${roomCode}`}
              className="size-64 rounded-xl sm:size-72"
              src={dataUrl}
            />
          ) : (
            <span className="grid size-64 place-items-center sm:size-72">
              <Loader2 aria-hidden="true" className="size-6 animate-spin" />
            </span>
          )}
          <p className="theme-room-code font-mono text-2xl tracking-[0.14em]">
            {roomCode}
          </p>
          <Button variant="secondary" onClick={() => void copyJoinLink()}>
            {linkCopied ? (
              <Check aria-hidden="true" className="size-4 text-success" />
            ) : (
              <Copy aria-hidden="true" className="size-4" />
            )}
            {linkCopied ? 'Đã sao chép link mời' : 'Sao chép link mời'}
          </Button>
          <p className="max-w-[36ch] text-center text-sm/6 text-ink-muted">
            Người chơi quét mã hoặc mở link sẽ vào thẳng bước điền tên.
          </p>
          <span aria-live="polite" className="sr-only">
            {linkCopied ? 'Đã sao chép link mời' : ''}
          </span>
        </div>
      </dialog>
    </>
  )
}
