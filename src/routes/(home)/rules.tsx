import { MotionConfig, domAnimation, LazyMotion } from 'framer-motion'
import { ShieldCheck, ArrowRight } from 'lucide-react'
import { createFileRoute, Link } from '@tanstack/react-router'

import { RulesNightVictory, RulesPhases } from './-components/RulesPhases'
import { RulesRoleGallery } from './-components/RulesRoleGallery'
import { RulesHero } from './-components/RulesHero'

export const Route = createFileRoute('/(home)/rules')({
  component: RulesPage,
  head: () => ({
    meta: [
      {
        title: 'Luật chơi & Vai trò | Moonveil',
      },
      {
        name: 'description',
        content:
          'Luật chơi Ma Sói, nhịp một ván đấu và chức năng của 14 vai trò trong Moonveil.',
      },
    ],
  }),
})

function RulesPage() {
  return (
    <LazyMotion features={domAnimation}>
      <MotionConfig reducedMotion="user">
        <main className="min-h-dvh">
          <header className="relative z-30 border-b border-white/15">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-5 sm:px-8 lg:px-12">
              <Link
                className="flex min-w-0 items-center gap-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-500"
                to="/"
              >
                <img
                  alt=""
                  className="size-9 shrink-0"
                  decoding="async"
                  src="/logo.webp"
                />
                <span className="truncate font-mono text-sm tracking-wide text-stone-300 uppercase">
                  Moonveil
                  <span className="hidden sm:inline"> / Luật chơi</span>
                </span>
              </Link>
              <nav
                className="flex items-center gap-5"
                aria-label="Điều hướng chính"
              >
                <Link
                  className="hidden text-sm text-stone-400 transition-colors hover:text-stone-50 sm:block"
                  to="/"
                >
                  Trang chủ
                </Link>
                <Link
                  className="inline-flex items-center gap-2 rounded-full bg-red-700 px-4 py-2 text-sm font-medium text-white transition-all hover:-translate-y-0.5 hover:bg-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
                  to="/play"
                >
                  Vào bàn chơi
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </nav>
            </div>
          </header>

          <RulesHero />
          <RulesPhases />
          <RulesNightVictory />
          <RulesRoleGallery />

          <section className="px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
            <div className="relative mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 overflow-hidden rounded-3xl bg-red-700 px-6 py-10 text-white shadow-2xl shadow-red-950/15 sm:px-10 lg:flex-row lg:items-center lg:px-12 lg:py-12">
              <div className="pointer-events-none absolute -right-16 -bottom-28 size-80 rounded-full border-[3rem] border-white/5" />
              <div className="relative flex max-w-2xl flex-col gap-3">
                <p className="flex items-center gap-2 font-mono text-sm tracking-wide text-red-100 uppercase">
                  <ShieldCheck aria-hidden="true" className="size-4" />
                  Đã biết luật, giờ hãy giữ bí mật
                </p>
                <h2 className="text-balance text-3xl font-medium tracking-tight sm:text-4xl">
                  Mở phòng và để từng lá bài tự tìm đến chủ nhân.
                </h2>
              </div>
              <Link
                className="relative inline-flex shrink-0 items-center gap-2 rounded-lg bg-white px-5 py-3 font-medium text-red-800 transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                to="/play"
              >
                Bắt đầu ván chơi
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </div>
          </section>

          <footer className="border-t border-white/15 px-5 py-8 sm:px-8 lg:px-12">
            <div className="mx-auto flex max-w-7xl flex-col gap-3 text-sm text-stone-500 sm:flex-row sm:items-center sm:justify-between">
              <Link className="transition-colors hover:text-stone-200" to="/">
                Moonveil — Trợ lý quản trò
              </Link>
              <p className="font-mono">
                14 vai trò · Một ngôi làng · Rất nhiều bí mật
              </p>
            </div>
          </footer>
        </main>
      </MotionConfig>
    </LazyMotion>
  )
}
