import type { RoleGuide } from './role-guide-data'

import { roleAccentColor, roleArtUrl } from '#/game/presentation/role-art'
import { roleDescription, roleLabel } from '#/game/presentation/labels'
import { RotateCcw, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { m } from 'framer-motion'

import { ROLE_FACTIONS } from './role-guide-data'

export function RoleGuideCard({ guide }: { guide: RoleGuide }) {
  const [flipped, setFlipped] = useState(false)
  const imagePath = roleArtUrl(guide.role)
  const accent = roleAccentColor(guide.role)
  const faction = ROLE_FACTIONS[guide.faction]

  return (
    <article className="min-w-0 overflow-visible">
      <m.button
        aria-label={`${flipped ? 'Xem mặt trước' : 'Xem chức năng'} của ${roleLabel(guide.role)}`}
        aria-pressed={flipped}
        className="relative block w-full cursor-pointer rounded-[1.4rem] text-left [perspective:1200px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-500"
        type="button"
        whileTap={{ scale: 0.985 }}
        onClick={() => setFlipped((current) => !current)}
      >
        <m.span
          animate={{ rotateY: flipped ? 180 : 0 }}
          className="relative block aspect-4/5 w-full [transform-style:preserve-3d]"
          initial={false}
          transition={{
            type: 'spring',
            stiffness: 150,
            damping: 20,
            mass: 0.8,
          }}
        >
          <span className="absolute inset-0 block rounded-[1.4rem] bg-white shadow-2xl ring-1 ring-stone-950/10 [backface-visibility:hidden]">
            <span
              aria-hidden="true"
              className="absolute inset-0"
              style={{
                background: `radial-gradient(closest-side at 50% 44%, ${accent}99 0%, ${accent}52 55%, transparent 100%)`,
              }}
            />
            <img
              alt=""
              className="relative size-full object-contain p-6"
              decoding="async"
              height={512}
              loading="lazy"
              src={imagePath}
              width={512}
            />
            {/* Khung giấy in: kẻ mảnh bao vùng hình, cách mép thẻ 6px */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-[6px] rounded-2xl ring-1 ring-stone-950/8"
            />
            <span className="absolute top-4 right-4 flex items-center gap-1.5 rounded-full bg-stone-950/80 px-3 py-1.5 font-mono text-[0.65rem] tracking-[0.12em] text-stone-200 uppercase shadow-lg ring-1 ring-white/15 backdrop-blur-md">
              <Sparkles aria-hidden="true" className="size-3 text-red-300" />
              Chạm để lật
            </span>
          </span>

          <span className="absolute inset-0 flex flex-col rounded-[1.4rem] bg-stone-950 p-4 text-stone-50 shadow-2xl ring-1 ring-white/15 [backface-visibility:hidden] [transform:rotateY(180deg)] sm:p-5">
            <span className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full bg-red-500/15 blur-3xl" />
            <span className="relative flex items-start justify-between gap-3">
              <span>
                <span className="block font-mono text-[0.65rem] tracking-[0.16em] text-red-300 uppercase">
                  {faction.shortLabel}
                </span>
                <span className="mt-1 block text-xl font-semibold tracking-tight text-stone-50 sm:text-2xl xl:text-xl">
                  {roleLabel(guide.role)}
                </span>
              </span>
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/8 text-stone-300 ring-1 ring-white/15">
                <RotateCcw aria-hidden="true" className="size-4" />
              </span>
            </span>

            <span className="relative mt-3 block border-t border-white/15 pt-3 text-xs/5 text-stone-300 sm:mt-4 sm:text-sm/6 xl:mt-3 xl:text-xs/5">
              {roleDescription(guide.role)}
            </span>

            <span className="relative mt-auto grid gap-2 pt-3">
              <CardFact label="Thức giấc" value={guide.timing} />
              <CardFact label="Gợi ý" value={guide.strategy} />
              <CardFact label="Điều kiện thắng" value={guide.victory} />
            </span>
          </span>
        </m.span>
      </m.button>
    </article>
  )
}

function CardFact({ label, value }: { label: string; value: string }) {
  return (
    <span className="grid grid-cols-[4.5rem_1fr] gap-2 border-t border-white/10 pt-2.5 sm:grid-cols-[5.25rem_1fr] xl:grid-cols-[4.5rem_1fr]">
      <span className="font-mono text-[0.55rem] tracking-[0.1em] text-stone-500 uppercase">
        {label}
      </span>
      <span className="text-[0.7rem]/4 text-stone-300">{value}</span>
    </span>
  )
}
