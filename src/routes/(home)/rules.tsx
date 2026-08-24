import type { RoleFaction } from './-components/role-guide-data'
import type { LucideIcon } from 'lucide-react'

import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import {
  ShieldCheck,
  ArrowRight,
  RadioTower,
  ArrowDown,
  BookOpen,
  MoonStar,
  Sparkles,
  EyeOff,
  Gavel,
  Users,
  Vote,
  Sun,
} from 'lucide-react'

import { RoleGuideCard } from './-components/RoleGuideCard'
import { ROLE_GUIDES } from './-components/role-guide-data'

export const Route = createFileRoute('/(home)/rules')({
  component: RulesPage,
  head: () => ({
    meta: [
      {
        title: 'Luật chơi & Vai trò | Werewolf Moderator',
      },
      {
        name: 'description',
        content:
          'Luật chơi Ma Sói, nhịp một ván đấu và chức năng của 14 vai trò trong Werewolf Moderator.',
      },
    ],
  }),
})

type RoleFilter = 'ALL' | RoleFaction

type Phase = {
  description: string
  icon: LucideIcon
  number: string
  title: string
}

const PHASES: readonly Phase[] = [
  {
    number: '01',
    icon: Users,
    title: 'Chuẩn bị',
    description:
      'Tạo phòng 5–15 người, phân vai bí mật và chỉ bắt đầu khi mọi người đã xem vai, sẵn sàng.',
  },
  {
    number: '02',
    icon: MoonStar,
    title: 'Ban đêm',
    description:
      'Các vai thức giấc theo hàng đợi. Mỗi hành động riêng được gửi tới Quản trò để xác nhận.',
  },
  {
    number: '03',
    icon: Sun,
    title: 'Ban ngày',
    description:
      'Kết quả đêm được công bố nhưng vai người chết vẫn bí mật. Cả làng quan sát và tranh luận.',
  },
  {
    number: '04',
    icon: Vote,
    title: 'Biểu quyết',
    description:
      'Cả bàn chọn một người để loại. Hòa lần đầu sẽ bỏ phiếu lại; hòa lần hai không ai bị loại.',
  },
]

const ROLE_FILTERS: readonly { label: string; value: RoleFilter }[] = [
  { value: 'ALL', label: 'Tất cả 14 vai' },
  { value: 'VILLAGE', label: 'Phe Làng' },
  { value: 'WEREWOLF', label: 'Phe Sói' },
  { value: 'WILDCARD', label: 'Biến số' },
]

const NIGHT_ORDER = [
  'Thần tình yêu',
  'Thợ săn',
  'Bảo vệ',
  'Tiên tri',
  'Kỹ nữ',
  'Ma sói',
  'Sói Trắng',
  'Phù thủy',
  'Người thổi sáo',
] as const

const VICTORY_RULES = [
  {
    label: 'Phe Làng',
    description: 'Không còn bất kỳ Ma sói nào sống sót.',
    className: 'text-emerald-300',
  },
  {
    label: 'Phe Sói',
    description:
      'Đàn Sói, không tính Sói Trắng, đạt ngang hoặc hơn tất cả người còn lại.',
    className: 'text-red-300',
  },
  {
    label: 'Thằng ngốc',
    description: 'Bị cả làng biểu quyết loại khỏi ván.',
    className: 'text-amber-300',
  },
  {
    label: 'Người thổi sáo',
    description: 'Mọi người còn sống khác đều đã bị mê hoặc.',
    className: 'text-violet-300',
  },
  {
    label: 'Sói Trắng / Tình nhân',
    description: 'Sống một mình / đôi khác phe là hai người cuối cùng.',
    className: 'text-sky-300',
  },
] as const

function RulesPage() {
  const [activeFilter, setActiveFilter] = useState<RoleFilter>('ALL')
  const visibleRoles =
    activeFilter === 'ALL'
      ? ROLE_GUIDES
      : ROLE_GUIDES.filter((guide) => guide.faction === activeFilter)

  return (
    <main className="min-h-dvh overflow-hidden">
      <header className="relative z-30 border-b border-white/15">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-5 sm:px-8 lg:px-12">
          <Link
            className="flex min-w-0 items-center gap-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-500"
            to="/"
          >
            <span className="size-2 shrink-0 rounded-full bg-red-500 shadow-[0_0_24px_var(--color-red-500)]" />
            <span className="truncate font-mono text-sm tracking-wide text-stone-300 uppercase">
              Werewolf
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

      <section className="relative isolate">
        <div className="rules-hero-orbit pointer-events-none absolute top-10 left-1/2 size-[36rem] -translate-x-1/2 rounded-full border border-white/10 lg:left-[72%]" />
        <div className="pointer-events-none absolute -top-44 left-[6%] size-[30rem] rounded-full bg-red-500/10 blur-3xl" />
        <div className="mx-auto grid min-h-[calc(100dvh-5rem)] max-w-7xl items-center gap-14 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.88fr_1.12fr] lg:px-12 lg:py-24">
          <div className="relative z-10 flex max-w-3xl flex-col items-start gap-7">
            <p className="flex items-center gap-2 font-mono text-sm tracking-wide text-red-300 uppercase">
              <BookOpen aria-hidden="true" className="size-4" />
              Cẩm nang trước khi trời tối
            </p>
            <h1 className="max-w-[12ch] text-balance text-5xl font-medium tracking-[-0.045em] text-stone-50 sm:text-6xl lg:text-7xl">
              Mỗi lá bài là một bí mật.
            </h1>
            <p className="max-w-[56ch] text-pretty text-lg/8 text-stone-400">
              Nắm nhịp ngày – đêm, hiểu điều kiện chiến thắng và lật từng thẻ để
              khám phá sức mạnh của 14 vai trò đang có trong game.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <a
                className="inline-flex items-center gap-2 rounded-lg bg-red-700 px-5 py-3 font-medium text-white shadow-lg shadow-red-950/15 transition-transform hover:-translate-y-0.5 hover:bg-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
                href="#vai-tro"
              >
                Khám phá các vai
                <ArrowDown aria-hidden="true" className="size-4" />
              </a>
              <a
                className="rounded-lg px-3 py-3 font-medium text-stone-300 transition-colors hover:text-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
                href="#luat-choi"
              >
                Đọc luật trong 3 phút
              </a>
            </div>
            <div className="grid w-full max-w-xl grid-cols-3 divide-x divide-white/15 border-t border-white/15 pt-5">
              <GuideStat label="Người chơi" value="5–15" />
              <GuideStat label="Vai trò" value="14" />
              <GuideStat label="Nhịp chơi" value="Ngày / Đêm" />
            </div>
          </div>

          <HeroCardDeck />
        </div>
      </section>

      <section
        className="border-y border-white/15 bg-white/[0.04]"
        id="luat-choi"
      >
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
            <div className="flex flex-col items-start gap-5 lg:sticky lg:top-12 lg:self-start">
              <p className="font-mono text-sm tracking-wide text-red-300 uppercase">
                Luật cốt lõi
              </p>
              <h2 className="max-w-[13ch] text-balance text-4xl font-medium tracking-tight text-stone-50 sm:text-5xl">
                Một vòng chơi, bốn nhịp rõ ràng.
              </h2>
              <p className="max-w-md text-pretty text-base/7 text-stone-400">
                Hệ thống giữ đúng thứ tự và thông tin bí mật. Quản trò vẫn xác
                nhận kết quả trước khi ván chuyển sang nhịp tiếp theo.
              </p>
            </div>
            <ol className="grid gap-px overflow-hidden rounded-3xl bg-white/15 ring-1 ring-white/15 sm:grid-cols-2">
              {PHASES.map((phase) => (
                <PhaseCard key={phase.number} phase={phase} />
              ))}
            </ol>
          </div>

          <div className="mt-16 grid gap-px overflow-hidden rounded-3xl bg-white/15 ring-1 ring-white/15 lg:grid-cols-3">
            <RuleNote
              icon={EyeOff}
              title="Người chết không lộ vai"
              description="Chỉ cái chết được công bố. Vai trò tiếp tục là dữ kiện để cả làng suy luận."
            />
            <RuleNote
              icon={Gavel}
              title="Quản trò xác nhận"
              description="Hành động, kết quả đêm và biểu quyết chỉ có hiệu lực sau khi Quản trò duyệt."
            />
            <RuleNote
              icon={RadioTower}
              title="Thiết bị giữ bí mật"
              description="Mỗi người chỉ nhìn thấy vai, lượt hành động và kết quả riêng thuộc về mình."
            />
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto grid max-w-7xl gap-14 px-5 py-20 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:px-12 lg:py-28">
          <div className="relative overflow-hidden rounded-3xl bg-stone-950 p-7 ring-1 ring-white/15 sm:p-10">
            <div className="pointer-events-none absolute -top-24 -left-20 size-72 rounded-full bg-violet-500/10 blur-3xl" />
            <div className="relative flex items-center justify-between gap-5 border-b border-white/15 pb-6">
              <div>
                <p className="font-mono text-xs tracking-[0.14em] text-violet-300 uppercase">
                  Hàng đợi ban đêm
                </p>
                <h2 className="mt-2 text-3xl font-medium text-stone-50">
                  Ai thức giấc trước?
                </h2>
              </div>
              <MoonStar aria-hidden="true" className="size-8 text-violet-300" />
            </div>
            <ol className="relative mt-6 grid gap-2">
              {NIGHT_ORDER.map((role, index) => (
                <li
                  className="grid grid-cols-[2.25rem_1fr_auto] items-center gap-3 rounded-xl bg-white/[0.04] px-4 py-3 ring-1 ring-white/10"
                  key={role}
                >
                  <span className="font-mono text-xs text-stone-500">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="text-sm text-stone-300">{role}</span>
                  <span className="size-1.5 rounded-full bg-violet-300/70" />
                </li>
              ))}
            </ol>
            <p className="relative mt-5 text-sm/6 text-stone-500">
              Thần tình yêu chỉ xuất hiện ở đêm đầu tiên. Những vai không có
              trong ván sẽ tự động được bỏ qua.
            </p>
          </div>

          <div className="flex flex-col justify-center gap-7">
            <div className="flex flex-col gap-4">
              <p className="font-mono text-sm tracking-wide text-red-300 uppercase">
                Kết thúc ván
              </p>
              <h2 className="max-w-[14ch] text-balance text-4xl font-medium tracking-tight text-stone-50 sm:text-5xl">
                Không phải ai cũng muốn cứu ngôi làng.
              </h2>
              <p className="max-w-xl text-pretty text-base/7 text-stone-400">
                Ngoài cuộc đối đầu Làng – Sói, các vai biến số có thể kết thúc
                ván ngay khi đạt điều kiện riêng.
              </p>
            </div>
            <div className="grid gap-3">
              {VICTORY_RULES.map((rule) => (
                <div
                  className="grid gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-5 py-4 sm:grid-cols-[10rem_1fr] sm:items-center"
                  key={rule.label}
                >
                  <p className={`font-medium ${rule.className}`}>
                    {rule.label}
                  </p>
                  <p className="text-sm/6 text-stone-400">{rule.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        className="relative border-y border-white/15 bg-stone-950/30"
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
                Di chuột để ánh sáng bám theo mặt thẻ, sau đó chạm để lật và xem
                thời điểm hành động, chiến thuật cùng điều kiện thắng.
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

          <div className="mt-12 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleRoles.map((guide) => (
              <RoleGuideCard guide={guide} key={guide.role} />
            ))}
          </div>
        </div>
      </section>

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
            Werewolf Moderator Assistant
          </Link>
          <p className="font-mono">
            14 vai trò · Một ngôi làng · Rất nhiều bí mật
          </p>
        </div>
      </footer>
    </main>
  )
}

function HeroCardDeck() {
  return (
    <div className="role-hero-deck relative mx-auto h-[32rem] w-full max-w-2xl sm:h-[38rem] lg:ml-auto">
      <div className="pointer-events-none absolute top-1/2 left-1/2 size-80 -translate-1/2 rounded-full bg-red-500/20 blur-3xl" />
      <div className="role-hero-card role-hero-card-left absolute top-[18%] left-[5%] w-[45%] sm:left-[8%] sm:w-[40%]">
        <img
          alt="Thẻ vai Phù thủy"
          className="w-full drop-shadow-2xl"
          decoding="async"
          height={1000}
          loading="eager"
          src="/role/optimized/witch.webp"
          width={660}
        />
      </div>
      <div className="role-hero-card role-hero-card-right absolute top-[18%] right-[5%] w-[45%] sm:right-[8%] sm:w-[40%]">
        <img
          alt="Thẻ vai Ma sói"
          className="w-full drop-shadow-2xl"
          decoding="async"
          height={1000}
          loading="eager"
          src="/role/optimized/werewolf.webp"
          width={660}
        />
      </div>
      <div className="role-hero-card role-hero-card-center absolute top-[7%] left-1/2 z-10 w-[49%] -translate-x-1/2 sm:w-[43%]">
        <img
          alt="Thẻ vai Tiên tri"
          className="w-full drop-shadow-2xl"
          decoding="async"
          fetchPriority="high"
          height={1000}
          src="/role/optimized/seer.webp"
          width={660}
        />
        <span className="role-hero-glint pointer-events-none absolute inset-0 rounded-[4%]" />
      </div>
      <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/65 px-4 py-2 font-mono text-xs tracking-[0.14em] text-white uppercase shadow-xl ring-1 ring-white/20 backdrop-blur-md">
        <Sparkles aria-hidden="true" className="size-3.5 text-amber-300" />
        14 thân phận đang chờ
      </div>
    </div>
  )
}

function GuideStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 px-4 first:pl-0 last:pr-0">
      <p className="truncate font-mono text-base text-stone-200">{value}</p>
      <p className="truncate text-sm text-stone-500">{label}</p>
    </div>
  )
}

function PhaseCard({ phase }: { phase: Phase }) {
  const Icon = phase.icon
  return (
    <li className="group flex min-h-72 flex-col gap-7 bg-stone-950 p-7 transition-colors hover:bg-stone-900 sm:p-8">
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm text-red-300">{phase.number}</span>
        <span className="grid size-11 place-items-center rounded-full bg-red-500/10 text-red-300 ring-1 ring-red-400/20 transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110">
          <Icon aria-hidden="true" className="size-5" />
        </span>
      </div>
      <div className="mt-auto flex flex-col gap-3">
        <h3 className="text-2xl font-medium text-stone-50">{phase.title}</h3>
        <p className="text-sm/6 text-stone-400">{phase.description}</p>
      </div>
    </li>
  )
}

function RuleNote({
  description,
  icon: Icon,
  title,
}: {
  description: string
  icon: LucideIcon
  title: string
}) {
  return (
    <article className="flex min-h-60 flex-col gap-6 bg-stone-950 p-7 sm:p-8">
      <Icon aria-hidden="true" className="size-6 text-red-300" />
      <div className="mt-auto">
        <h3 className="text-lg font-medium text-stone-50">{title}</h3>
        <p className="mt-2 text-sm/6 text-stone-400">{description}</p>
      </div>
    </article>
  )
}
