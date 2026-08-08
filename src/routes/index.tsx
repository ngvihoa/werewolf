import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col justify-center px-6 py-16">
      <p className="mb-5 font-mono text-xs tracking-[0.24em] text-red-300 uppercase">
        Werewolf Moderator Assistant
      </p>
      <h1 className="max-w-3xl text-5xl leading-none font-semibold tracking-tight text-stone-50 sm:text-7xl">
        Đêm xuống. Hệ thống điều phối, quản trò quyết định.
      </h1>
      <p className="mt-7 max-w-xl text-lg leading-8 text-stone-400">
        Base project đã sẵn sàng với TanStack Start, oRPC, Drizzle và Supabase.
        Bước tiếp theo là xây dựng lobby và game state machine.
      </p>
      <div className="mt-10 flex flex-wrap gap-3 text-sm text-stone-300">
        {['TanStack Start', 'oRPC', 'Drizzle', 'Supabase'].map((item) => (
          <span
            className="rounded-full border border-stone-700 bg-stone-900 px-4 py-2"
            key={item}
          >
            {item}
          </span>
        ))}
      </div>
    </main>
  )
}
