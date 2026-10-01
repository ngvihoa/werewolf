import type { LucideIcon } from 'lucide-react'

import { createFileRoute, Link } from '@tanstack/react-router'
import {
  SlidersHorizontal,
  ShieldCheck,
  ArrowRight,
  RadioTower,
  EyeOff,
  Users,
  Moon,
} from 'lucide-react'

export const Route = createFileRoute('/(home)/')({ component: LandingPage })

type Feature = {
  description: string
  icon: LucideIcon
  title: string
}

const FEATURES: Feature[] = [
  {
    icon: EyeOff,
    title: 'Bí mật đúng người',
    description:
      'Mỗi người chơi chỉ nhận vai trò, lượt hành động và kết quả riêng thuộc về mình.',
  },
  {
    icon: SlidersHorizontal,
    title: 'Quản trò giữ quyền quyết định',
    description:
      'Xác nhận, từ chối, làm lại hoặc bỏ qua từng bước mà không làm mất dấu lịch sử.',
  },
  {
    icon: RadioTower,
    title: 'Cả bàn luôn đồng bộ',
    description:
      'Thay đổi xuất hiện trên mọi thiết bị ngay lập tức và tự phục hồi khi mất kết nối.',
  },
]

const STEPS = [
  ['01', 'Tạo phòng', 'Quản trò mở phòng và chia sẻ mã gồm 6 ký tự.'],
  [
    '02',
    'Mời người chơi',
    'Mỗi người vào bằng điện thoại và nhận phiên bí mật riêng.',
  ],
  [
    '03',
    'Bắt đầu đêm',
    'Hệ thống điều phối lượt; cả bàn vẫn trò chuyện ngoài đời.',
  ],
] as const

function LandingPage() {
  return (
    <main className="min-h-dvh overflow-hidden">
      <header className="relative z-10 border-b border-white/15">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-5 py-5 sm:px-8 lg:px-12">
          <Link
            className="flex min-w-0 items-center gap-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-500"
            to="/"
          >
            <span className="size-2 shrink-0 rounded-full bg-red-500 shadow-[0_0_24px_var(--color-red-500)]" />
            <span className="truncate font-mono text-sm tracking-wide text-stone-300 uppercase">
              Werewolf / Trợ lý quản trò
            </span>
          </Link>
          <nav
            className="flex items-center gap-5"
            aria-label="Điều hướng chính"
          >
            <Link
              className="hidden text-sm text-stone-400 transition-colors hover:text-stone-50 md:block"
              to="/rules"
            >
              Luật & vai trò
            </Link>
            <a
              className="hidden text-sm text-stone-400 transition-colors hover:text-stone-50 lg:block"
              href="#cach-hoat-dong"
            >
              Cách hoạt động
            </a>
            <Link
              className="inline-flex items-center gap-2 rounded-full bg-red-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
              to="/play"
            >
              Vào bàn chơi
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative isolate">
        {/* Tranh đêm của làng làm phông hero, mờ dần vào nền trang. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[url('/bg/night-bg.webp')] bg-cover bg-center [mask-image:linear-gradient(to_bottom,black_70%,transparent_100%)]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-linear-to-b from-midnight/80 via-midnight/65 to-midnight/35"
        />
        <div className="pointer-events-none absolute -top-40 left-[8%] size-96 rounded-full bg-red-500/10 blur-3xl" />
        <div className="mx-auto grid min-h-[calc(100dvh-5rem)] max-w-6xl items-center gap-14 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1.08fr_0.92fr] lg:px-12 lg:py-24">
          <div className="relative flex max-w-3xl flex-col items-start gap-7">
            <p className="flex items-center gap-2 font-mono text-sm tracking-wide text-red-300 uppercase">
              <Moon aria-hidden="true" className="size-4" />
              Đêm bí mật. Bàn chơi thật.
            </p>
            <h1 className="max-w-[14ch] text-balance text-5xl font-medium tracking-[-0.045em] text-stone-50 sm:text-6xl lg:text-7xl">
              Điều phối Ma Sói mà không đánh mất cuộc chơi.
            </h1>
            <p className="max-w-[58ch] text-pretty text-lg/8 text-stone-400">
              Điện thoại lo thứ tự lượt, thông tin bí mật và trạng thái ván. Mọi
              người vẫn nhìn nhau, tranh luận và bỏ phiếu ngay tại bàn.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                className="inline-flex items-center gap-2 rounded-lg bg-red-700 px-5 py-3 text-base font-medium text-white shadow-lg shadow-red-950/15 transition-transform hover:-translate-y-0.5 hover:bg-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
                to="/play"
              >
                Bắt đầu ván chơi
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
              <Link
                className="rounded-lg px-3 py-3 text-base font-medium text-stone-300 transition-colors hover:text-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
                to="/rules"
              >
                Xem luật & vai trò
              </Link>
            </div>
            <div className="grid w-full max-w-xl grid-cols-3 divide-x divide-white/15 border-t border-white/15 pt-5">
              <LandingStat label="Người chơi" value="5–15" />
              <LandingStat label="Vai trò" value="14" />
              <LandingStat label="Thiết bị" value="Mọi màn hình" />
            </div>
          </div>

          <GameFlowPreview />
        </div>
      </section>

      <section
        className="border-y border-white/15 bg-white/[0.04]"
        id="tinh-nang"
      >
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
            <div className="flex flex-col items-start gap-5">
              <p className="font-mono text-sm tracking-wide text-red-300 uppercase">
                Một người dẫn nhịp
              </p>
              <h2 className="max-w-[14ch] text-balance text-4xl font-medium tracking-tight text-stone-50 sm:text-5xl">
                Công cụ cho Quản trò, không phải người thay thế.
              </h2>
              <p className="max-w-md text-pretty text-base/7 text-stone-400">
                Luật và trạng thái được kiểm tra tự động, nhưng những quyết định
                ngoại lệ vẫn luôn nằm trong tay con người.
              </p>
            </div>
            <div className="grid gap-px overflow-hidden rounded-2xl bg-white/15 ring-1 ring-white/15 sm:grid-cols-3">
              {FEATURES.map((feature) => (
                <FeatureCard key={feature.title} feature={feature} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="cach-hoat-dong">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
          <div className="flex flex-col gap-4 text-center">
            <p className="font-mono text-sm tracking-wide text-red-300 uppercase">
              Từ sảnh đến đêm đầu tiên
            </p>
            <h2 className="text-balance text-4xl font-medium tracking-tight text-stone-50 sm:text-5xl">
              Bắt đầu trong ba bước.
            </h2>
          </div>
          <ol className="mt-14 grid gap-8 sm:grid-cols-3">
            {STEPS.map(([number, title, description]) => (
              <li
                className="relative flex flex-col gap-4 border-t border-white/15 pt-6"
                key={number}
              >
                <span className="font-mono text-sm text-red-300">{number}</span>
                <h3 className="text-xl font-medium text-stone-50">{title}</h3>
                <p className="text-base/7 text-stone-400">{description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="px-5 pb-20 sm:px-8 lg:px-12 lg:pb-28">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 rounded-3xl bg-red-700 px-6 py-10 text-white shadow-2xl shadow-red-950/15 sm:px-10 lg:flex-row lg:items-center lg:px-12 lg:py-12">
          <div className="flex max-w-2xl flex-col gap-3">
            <p className="font-mono text-sm tracking-wide text-red-100 uppercase">
              Khi cả làng đã sẵn sàng
            </p>
            <h2 className="text-balance text-3xl font-medium tracking-tight sm:text-4xl">
              Mở phòng, cất điện thoại xuống và bắt đầu nghi ngờ nhau.
            </h2>
          </div>
          <Link
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-white px-5 py-3 font-medium text-red-800 transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            to="/play"
          >
            Mở bàn chơi
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/15 px-5 py-8 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 text-sm text-stone-500 sm:flex-row sm:items-center sm:justify-between">
          <p>Werewolf Moderator Assistant</p>
          <p className="font-mono">System điều phối · Quản trò quyết định</p>
        </div>
      </footer>
    </main>
  )
}

function LandingStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 px-4 first:pl-0 last:pr-0">
      <p className="truncate font-mono text-base text-stone-200">{value}</p>
      <p className="truncate text-sm text-stone-500">{label}</p>
    </div>
  )
}

function FeatureCard({ feature }: { feature: Feature }) {
  const Icon = feature.icon
  return (
    <article className="flex min-h-64 flex-col gap-5 bg-stone-950 p-6 sm:p-7">
      <span className="grid size-11 place-items-center rounded-full bg-red-500/10 text-red-300 ring-1 ring-red-400/20">
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <div className="mt-auto flex flex-col gap-3">
        <h3 className="text-lg font-medium text-stone-50">{feature.title}</h3>
        <p className="text-sm/6 text-stone-400">{feature.description}</p>
      </div>
    </article>
  )
}

function GameFlowPreview() {
  return (
    <div className="relative mx-auto w-full max-w-lg lg:ml-auto">
      <div className="absolute -inset-8 rounded-full bg-red-500/10 blur-3xl" />
      <div className="relative overflow-hidden rounded-3xl bg-stone-950 shadow-2xl shadow-black/20 ring-1 ring-white/15">
        <div className="flex items-center justify-between border-b border-white/15 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="size-2 rounded-full bg-red-500 shadow-[0_0_18px_var(--color-red-500)]" />
            <p className="font-mono text-xs tracking-wide text-stone-400 uppercase">
              Đêm 02 / Đang diễn ra
            </p>
          </div>
          <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 font-mono text-xs text-emerald-300 ring-1 ring-emerald-400/20">
            Đồng bộ
          </span>
        </div>
        <div className="grid gap-6 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-xs text-red-300 uppercase">
                Lượt hiện tại
              </p>
              <p className="pt-1 text-2xl font-medium text-stone-50">
                Tiên tri thức giấc
              </p>
            </div>
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-violet-400/10 text-violet-200 ring-1 ring-violet-300/20">
              <Moon aria-hidden="true" className="size-5" />
            </span>
          </div>
          <div className="grid gap-2">
            <PreviewStep done label="Bảo vệ chọn mục tiêu" number="01" />
            <PreviewStep active label="Tiên tri xem một người" number="02" />
            <PreviewStep label="Ma Sói tấn công" number="03" />
            <PreviewStep label="Phù thủy dùng bình" number="04" />
          </div>
          <div className="flex items-start gap-3 rounded-xl bg-white/8 p-4 ring-1 ring-white/15">
            <ShieldCheck
              aria-hidden="true"
              className="mt-0.5 size-5 shrink-0 text-emerald-300"
            />
            <div>
              <p className="text-sm font-medium text-stone-200">
                Thông tin riêng được bảo vệ
              </p>
              <p className="pt-1 text-sm/6 text-stone-400">
                Mỗi thiết bị chỉ nhận đúng góc nhìn của người đang chơi.
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute -right-3 -bottom-5 flex items-center gap-3 rounded-2xl bg-stone-900 px-4 py-3 shadow-xl ring-1 ring-white/15 sm:-right-7">
        <Users aria-hidden="true" className="size-5 text-red-300" />
        <div>
          <p className="font-mono text-xs text-stone-500 uppercase">
            Trong phòng
          </p>
          <p className="text-sm font-medium text-stone-100">8 người chơi</p>
        </div>
      </div>
    </div>
  )
}

function PreviewStep({
  active = false,
  done = false,
  label,
  number,
}: {
  active?: boolean
  done?: boolean
  label: string
  number: string
}) {
  return (
    <div
      className={`grid grid-cols-[2rem_1fr_auto] items-center gap-3 rounded-lg px-3 py-3 ${
        active ? 'bg-red-500/10 ring-1 ring-red-400/20' : 'bg-white/[0.03]'
      }`}
    >
      <span className="font-mono text-xs text-stone-500">{number}</span>
      <p className="text-sm text-stone-300">{label}</p>
      <span
        className={`size-2 rounded-full ${
          active
            ? 'animate-pulse bg-red-400'
            : done
              ? 'bg-emerald-400'
              : 'bg-stone-700'
        }`}
      />
    </div>
  )
}
