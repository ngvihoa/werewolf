import type { PointerEvent } from 'react'
import type { RoleGuide } from './role-guide-data'

import { roleDescription, roleLabel } from '#/game/presentation/labels'
import { RotateCcw, Sparkles } from 'lucide-react'
import { useState } from 'react'

import { ROLE_FACTIONS } from './role-guide-data'

export function RoleGuideCard({ guide }: { guide: RoleGuide }) {
  const [flipped, setFlipped] = useState(false)
  const imagePath = `/role/optimized/${guide.role.toLowerCase()}.webp`
  const faction = ROLE_FACTIONS[guide.faction]

  function handlePointerMove(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType === 'touch') return
    const card = event.currentTarget
    const bounds = card.getBoundingClientRect()
    const x = (event.clientX - bounds.left) / bounds.width
    const y = (event.clientY - bounds.top) / bounds.height
    card.style.setProperty('--card-tilt-x', `${(0.5 - y) * 10}deg`)
    card.style.setProperty('--card-tilt-y', `${(x - 0.5) * 12}deg`)
    card.style.setProperty('--card-shine-x', `${x * 100}%`)
    card.style.setProperty('--card-shine-y', `${y * 100}%`)
  }

  function resetTilt(event: PointerEvent<HTMLButtonElement>) {
    const card = event.currentTarget
    card.style.setProperty('--card-tilt-x', '0deg')
    card.style.setProperty('--card-tilt-y', '0deg')
  }

  return (
    <article className="role-guide-card-shell">
      <button
        aria-label={`${flipped ? 'Xem mặt trước' : 'Xem chức năng'} của ${roleLabel(guide.role)}`}
        aria-pressed={flipped}
        className="role-guide-card group relative block w-full cursor-pointer rounded-[1.4rem] text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-500"
        data-flipped={flipped ? 'true' : 'false'}
        type="button"
        onClick={() => setFlipped((current) => !current)}
        onPointerLeave={resetTilt}
        onPointerMove={handlePointerMove}
      >
        <span className="role-guide-card-flipper relative block aspect-[989/1500] w-full [transform-style:preserve-3d]">
          <span className="role-guide-card-face absolute inset-0 block overflow-hidden rounded-[1.4rem] bg-stone-950 shadow-2xl ring-1 ring-white/15 [backface-visibility:hidden]">
            <img
              alt=""
              className="size-full object-cover"
              decoding="async"
              height={1000}
              loading="lazy"
              src={imagePath}
              width={660}
            />
            <span className="role-guide-card-vignette absolute inset-0 block" />
            <span className="absolute top-4 right-4 flex items-center gap-1.5 rounded-full bg-stone-950/80 px-3 py-1.5 font-mono text-[0.65rem] tracking-[0.12em] text-stone-200 uppercase shadow-lg ring-1 ring-white/15 backdrop-blur-md">
              <Sparkles aria-hidden="true" className="size-3 text-red-300" />
              Chạm để lật
            </span>
            <span className="role-guide-card-shine absolute inset-0 block opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          </span>

          <span className="role-guide-card-face role-guide-card-back absolute inset-0 flex flex-col overflow-hidden rounded-[1.4rem] bg-stone-950 p-5 text-stone-50 shadow-2xl ring-1 ring-white/15 [backface-visibility:hidden] [transform:rotateY(180deg)] sm:p-6">
            <span className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full bg-red-500/20 blur-3xl" />
            <span className="relative flex items-start justify-between gap-3">
              <span>
                <span className="block font-mono text-[0.65rem] tracking-[0.16em] text-red-300 uppercase">
                  {faction.shortLabel}
                </span>
                <span className="mt-1 block text-2xl font-semibold tracking-tight text-stone-50">
                  {roleLabel(guide.role)}
                </span>
              </span>
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/8 text-stone-300 ring-1 ring-white/15">
                <RotateCcw aria-hidden="true" className="size-4" />
              </span>
            </span>

            <span className="relative mt-5 block border-t border-white/15 pt-4 text-sm/6 text-stone-300">
              {roleDescription(guide.role)}
            </span>

            <span className="relative mt-auto grid gap-3 pt-5">
              <CardFact label="Thức giấc" value={guide.timing} />
              <CardFact label="Gợi ý" value={guide.strategy} />
              <CardFact label="Điều kiện thắng" value={guide.victory} />
            </span>
          </span>
        </span>
      </button>
    </article>
  )
}

function CardFact({ label, value }: { label: string; value: string }) {
  return (
    <span className="grid grid-cols-[5.5rem_1fr] gap-3 border-t border-white/10 pt-3">
      <span className="font-mono text-[0.62rem] tracking-[0.12em] text-stone-500 uppercase">
        {label}
      </span>
      <span className="text-xs/5 text-stone-300">{value}</span>
    </span>
  )
}
