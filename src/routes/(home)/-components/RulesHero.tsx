import { ArrowDown, BookOpen, Sparkles } from 'lucide-react'
import { m } from 'framer-motion'

function HeroCardDeck() {
  return (
    <div className="relative mx-auto h-[32rem] w-full max-w-2xl [perspective:1400px] sm:h-[38rem] lg:ml-auto">
      <div className="pointer-events-none absolute top-1/2 left-1/2 size-80 -translate-1/2 rounded-full bg-red-500/20 blur-3xl" />
      <div className="absolute top-[18%] left-[5%] w-[45%] sm:left-[8%] sm:w-[40%]">
        <m.div
          animate={{
            rotateY: [12, 8, 12],
            rotateZ: [-12, -10, -12],
            y: [0, -18, 0],
          }}
          className="[transform-style:preserve-3d]"
          transition={{ duration: 7, ease: 'easeInOut', repeat: Infinity }}
        >
          <img
            alt="Thẻ vai Phù thủy"
            className="w-full rounded-[4%] drop-shadow-2xl"
            decoding="async"
            height={1500}
            loading="eager"
            src="/role/optimized/witch.webp"
            width={989}
          />
        </m.div>
      </div>
      <div className="absolute top-[18%] right-[5%] w-[45%] sm:right-[8%] sm:w-[40%]">
        <m.div
          animate={{
            rotateY: [-12, -8, -12],
            rotateZ: [12, 10, 12],
            y: [0, -15, 0],
          }}
          className="[transform-style:preserve-3d]"
          transition={{
            delay: -3.1,
            duration: 7.5,
            ease: 'easeInOut',
            repeat: Infinity,
          }}
        >
          <img
            alt="Thẻ vai Ma sói"
            className="w-full rounded-[4%] drop-shadow-2xl"
            decoding="async"
            height={1500}
            loading="eager"
            src="/role/optimized/werewolf.webp"
            width={989}
          />
        </m.div>
      </div>
      <div className="absolute top-[7%] left-1/2 z-10 w-[49%] -translate-x-1/2 sm:w-[43%]">
        <m.div
          animate={{ rotateY: [-1, 2, -1], y: [0, -22, 0] }}
          className="relative [transform-style:preserve-3d]"
          transition={{
            delay: -1.7,
            duration: 6,
            ease: 'easeInOut',
            repeat: Infinity,
          }}
        >
          <img
            alt="Thẻ vai Tiên tri"
            className="w-full rounded-[4%] drop-shadow-2xl"
            decoding="async"
            fetchPriority="high"
            height={1500}
            src="/role/optimized/seer.webp"
            width={989}
          />
          <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-[4%]">
            <m.span
              animate={{ x: ['-140%', '140%'] }}
              className="absolute -inset-y-[20%] -left-1/2 w-1/2 rotate-12 bg-linear-to-r from-transparent via-white/45 to-transparent"
              transition={{
                delay: 1.2,
                duration: 1.6,
                ease: 'easeInOut',
                repeat: Infinity,
                repeatDelay: 3.9,
              }}
            />
          </span>
        </m.div>
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

export function RulesHero() {
  return (
    <section className="relative isolate overflow-clip">
      <div className="pointer-events-none absolute top-10 left-1/2 -translate-x-1/2 lg:left-[72%]">
        <m.div
          animate={{ rotate: 360 }}
          className="relative size-[36rem] rounded-full border border-white/10"
          transition={{ duration: 28, ease: 'linear', repeat: Infinity }}
        >
          <span className="absolute top-[7%] left-[21%] size-3 rounded-full bg-red-400 shadow-[0_0_2rem_var(--color-red-500)]" />
          <span className="absolute right-[12%] bottom-[17%] size-1.5 rounded-full bg-red-400 shadow-[0_0_2rem_var(--color-red-500)]" />
        </m.div>
      </div>
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
  )
}
