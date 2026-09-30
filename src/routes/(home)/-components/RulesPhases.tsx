import type { LucideIcon } from 'lucide-react'
import type { Phase } from '../rules-content'

import { EyeOff, Gavel, MoonStar, RadioTower } from 'lucide-react'

import { NIGHT_ORDER, PHASES, VICTORY_RULES } from '../rules-content'

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

export function RulesPhases() {
  return (
    <section
      className="scroll-mt-4 border-y border-white/15 bg-white/[0.04]"
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
  )
}

export function RulesNightVictory() {
  return (
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
            Thần tình yêu chỉ xuất hiện ở đêm đầu tiên. Những vai không có trong
            ván sẽ tự động được bỏ qua.
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
              Ngoài cuộc đối đầu Làng – Sói, các vai biến số có thể kết thúc ván
              ngay khi đạt điều kiện riêng.
            </p>
          </div>
          <div className="grid gap-3">
            {VICTORY_RULES.map((rule) => (
              <div
                className="grid gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-5 py-4 sm:grid-cols-[10rem_1fr] sm:items-center"
                key={rule.label}
              >
                <p className={`font-medium ${rule.className}`}>{rule.label}</p>
                <p className="text-sm/6 text-stone-400">{rule.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
