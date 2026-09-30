import type { RoleFilter } from '../rules-content'

import { AnimatePresence, m } from 'framer-motion'
import { useState } from 'react'
import { Sparkles } from 'lucide-react'

import { ROLE_FILTERS } from '../rules-content'

import { RoleGuideCard } from './RoleGuideCard'
import { ROLE_GUIDES } from './role-guide-data'

export function RulesRoleGallery() {
  const [activeFilter, setActiveFilter] = useState<RoleFilter>('ALL')
  const visibleRoles =
    activeFilter === 'ALL'
      ? ROLE_GUIDES
      : ROLE_GUIDES.filter((guide) => guide.faction === activeFilter)

  return (
    <section
      className="relative scroll-mt-4 border-y border-white/15 bg-stone-950/30"
      id="vai-tro"
    >
      <div className="pointer-events-none absolute top-0 left-1/2 h-96 w-full max-w-5xl -translate-x-1/2 bg-red-500/5 blur-3xl" />
      <div className="relative mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div className="flex max-w-3xl flex-col gap-4">
            <p className="flex items-center gap-2 font-mono text-sm tracking-wide text-red-300 uppercase">
              <Sparkles aria-hidden="true" className="size-4" />
              Bộ bài đang sử dụng
            </p>
            <h2 className="text-balance text-4xl font-medium tracking-tight text-stone-50 sm:text-5xl">
              Lật thẻ. Đọc năng lực. Cảm nhận cục diện.
            </h2>
            <p className="max-w-2xl text-pretty text-base/7 text-stone-400">
              Chạm vào từng thẻ để lật và xem thời điểm hành động, chiến thuật
              cùng điều kiện thắng của vai trò đó.
            </p>
          </div>
          <p aria-live="polite" className="font-mono text-sm text-stone-500">
            Đang hiển thị {visibleRoles.length} / {ROLE_GUIDES.length} vai
          </p>
        </div>

        <div
          className="mt-10 flex flex-wrap gap-2"
          role="group"
          aria-label="Lọc vai trò"
        >
          {ROLE_FILTERS.map((filter) => {
            const active = activeFilter === filter.value
            return (
              <button
                aria-pressed={active}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 ${
                  active
                    ? 'bg-red-700 text-white shadow-lg shadow-red-950/10'
                    : 'bg-white/[0.05] text-stone-400 ring-1 ring-white/15 hover:bg-white/10 hover:text-stone-100'
                }`}
                key={filter.value}
                type="button"
                onClick={() => setActiveFilter(filter.value)}
              >
                {filter.label}
              </button>
            )
          })}
        </div>

        <m.div
          className="mt-12 grid grid-cols-1 gap-x-6 gap-y-10 overflow-visible sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          layout
        >
          <AnimatePresence initial={false} mode="popLayout">
            {visibleRoles.map((guide, index) => (
              <m.div
                className="min-w-0 overflow-visible"
                exit={{ opacity: 0, scale: 0.97 }}
                initial={{ opacity: 0, y: 28 }}
                key={guide.role}
                layout
                transition={{
                  layout: { type: 'spring', stiffness: 320, damping: 30 },
                  opacity: { duration: 0.25 },
                  y: {
                    duration: 0.45,
                    delay: Math.min(index * 0.035, 0.2),
                  },
                }}
                viewport={{ amount: 0.12, once: true }}
                whileInView={{ opacity: 1, y: 0 }}
              >
                <RoleGuideCard guide={guide} />
              </m.div>
            ))}
          </AnimatePresence>
        </m.div>
      </div>
    </section>
  )
}
