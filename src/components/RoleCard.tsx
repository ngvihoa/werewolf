import type { Role } from '#/game/domain'

import { roleDescription, roleLabel } from '#/game/presentation/labels'
import { useRef, useState } from 'react'
import { roleArtUrl } from '#/game/presentation/role-art'

const HOLD_REVEAL_MS = 250

export function RoleCard({ role }: { role: Role }) {
  const [revealed, setRevealed] = useState(false)
  const holdTimer = useRef<number | null>(null)
  // Phân biệt "giữ để xem rồi nhả" với "chạm": nhả sau khi giữ sẽ ẩn thẻ
  // và phải nuốt sự kiện click phát sinh ngay sau đó.
  const holdRevealed = useRef(false)
  const holding = useRef(false)

  function startHold() {
    holdRevealed.current = false
    holding.current = true
    holdTimer.current = window.setTimeout(() => {
      holdRevealed.current = true
      setRevealed(true)
    }, HOLD_REVEAL_MS)
  }

  function endHold() {
    holding.current = false
    if (holdTimer.current !== null) {
      window.clearTimeout(holdTimer.current)
      holdTimer.current = null
    }
    if (holdRevealed.current) setRevealed(false)
  }

  function cancelHold() {
    holding.current = false
    if (holdTimer.current !== null) {
      window.clearTimeout(holdTimer.current)
      holdTimer.current = null
    }
    holdRevealed.current = false
  }

  function handleClick() {
    if (holdRevealed.current) {
      holdRevealed.current = false
      return
    }
    setRevealed((current) => !current)
  }

  return (
    <div className="mx-auto flex w-full max-w-56 flex-col items-center gap-4">
      <button
        aria-label={revealed ? 'Ẩn thẻ vai' : 'Xem thẻ vai'}
        aria-pressed={revealed}
        className="group w-full touch-manipulation select-none rounded-2xl [perspective:1000px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-500"
        type="button"
        onPointerDown={startHold}
        onPointerUp={endHold}
        onPointerCancel={cancelHold}
        onPointerLeave={() => {
          // Touch: pointerleave bắn ra sau pointerup, chỉ hủy khi còn giữ.
          if (holding.current) cancelHold()
        }}
        onClick={handleClick}
      >
        <span
          className={`relative block aspect-square w-full rounded-2xl shadow-2xl transition-transform duration-700 transform-3d motion-reduce:transition-none ${
            revealed ? 'transform-[rotateY(180deg)]' : ''
          }`}
        >
          <span
            aria-hidden={revealed}
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-stone-900 px-6 text-center ring-1 ring-line group-hover:bg-stone-800"
          >
            <span className="font-mono text-xs tracking-[0.16em] text-accent uppercase">
              Thân phận được giữ kín
            </span>
            <span className="text-sm/6 text-ink-muted">
              Giữ tay trên thẻ để xem, nhả tay để ẩn. Chạm cũng được khi không
              có người khác nhìn màn hình.
            </span>
          </span>
          <span
            aria-hidden={!revealed}
            className="absolute inset-0 flex flex-col overflow-hidden rounded-2xl bg-midnight ring-1 ring-line [backface-visibility:hidden] [transform:rotateY(180deg)]"
          >
            <span
              aria-hidden="true"
              className="relative flex flex-1 items-center justify-center"
            >
              <span className="absolute inset-0 bg-[radial-gradient(closest-side,rgb(232_162_94/0.16),transparent)]" />
              <img
                alt=""
                className="relative size-full object-contain p-5"
                decoding="async"
                height={512}
                src={roleArtUrl(role)}
                width={512}
              />
            </span>
            <span className="relative border-t border-line px-4 pt-2.5 pb-4 text-left">
              <span className="block font-mono text-xs tracking-[0.16em] text-accent uppercase">
                Thân phận của bạn
              </span>
              <span className="block pt-0.5 text-xl font-semibold text-ink">
                {roleLabel(role)}
              </span>
              <span className="mt-1 line-clamp-2 block text-xs/5 text-ink-muted">
                {roleDescription(role)}
              </span>
            </span>
          </span>
        </span>
      </button>
      <p className="text-sm text-ink-muted" aria-live="polite">
        {revealed ? 'Nhả tay hoặc chạm để ẩn vai' : 'Giữ hoặc chạm để xem vai'}
      </p>
    </div>
  )
}
