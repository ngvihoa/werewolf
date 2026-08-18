import type { Role } from '#/game/domain'

import { roleDescription, roleLabel } from '#/game/presentation/labels'
import { useState } from 'react'

export function RoleCard({ role }: { role: Role }) {
  const [revealed, setRevealed] = useState(false)
  const imageName = role.toLowerCase()
  const imagePath = `/role/${imageName}.png`

  return (
    <div className="mx-auto flex w-full max-w-64 flex-col items-center gap-4">
      <button
        aria-label={revealed ? 'Ẩn thẻ vai' : 'Xem thẻ vai'}
        aria-pressed={revealed}
        className="group w-full rounded-2xl [perspective:1000px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-500"
        type="button"
        onClick={() => setRevealed((current) => !current)}
      >
        <span
          className={`relative block aspect-[989/1500] w-full rounded-2xl shadow-2xl transition-transform duration-700 [transform-style:preserve-3d] motion-reduce:transition-none ${
            revealed ? '[transform:rotateY(180deg)]' : ''
          }`}
        >
          <span
            aria-hidden={revealed}
            className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-stone-900 px-6 text-center ring-1 ring-white/15 [backface-visibility:hidden] group-hover:bg-stone-800"
          >
            <span className="font-mono text-xs tracking-[0.16em] text-red-300 uppercase">
              Thân phận được giữ kín
            </span>
            <span className="pt-3 text-sm/6 text-stone-400">
              Chạm vào thẻ khi không có người khác nhìn màn hình.
            </span>
          </span>
          <span
            aria-hidden={!revealed}
            className="absolute inset-0 block overflow-hidden rounded-2xl bg-stone-900 ring-1 ring-white/15 [backface-visibility:hidden] [transform:rotateY(180deg)]"
          >
            <img
              alt=""
              className="size-full object-cover"
              decoding="async"
              height={1500}
              src={imagePath}
              width={989}
            />
            <span className="absolute inset-x-0 bottom-0 block bg-linear-to-t from-stone-950 via-stone-950/95 to-transparent px-5 pt-16 pb-5 text-left">
              <span className="block font-mono text-xs tracking-[0.16em] text-red-300 uppercase">
                Thân phận của bạn
              </span>
              <span className="block pt-1 text-2xl font-semibold text-stone-50">
                {roleLabel(role)}
              </span>
              <span className="block pt-2 text-sm/6 text-stone-300">
                {roleDescription(role)}
              </span>
            </span>
          </span>
        </span>
      </button>
      <p className="text-sm text-stone-400">
        {revealed ? 'Chạm vào thẻ để ẩn vai' : 'Chạm vào thẻ để xem vai'}
      </p>
    </div>
  )
}
