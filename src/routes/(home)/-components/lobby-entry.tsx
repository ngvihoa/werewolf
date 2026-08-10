import type { FormEvent, InputHTMLAttributes, ReactNode } from 'react'

import { useMutation } from '@tanstack/react-query'
import { orpcClient } from '#/orpc/client'
import { useState } from 'react'

export function LobbyEntry({
  onSessionCreated,
}: {
  onSessionCreated: (token: string) => void
}) {
  const [mode, setMode] = useState<'CREATE' | 'JOIN'>('CREATE')
  const [error, setError] = useState<string | null>(null)
  const createMutation = useMutation({
    mutationFn: (moderatorName: string) =>
      orpcClient.lobby.createGame({ moderatorName }),
    onSuccess(result) {
      if (result.ok) onSessionCreated(result.value.moderatorSessionToken)
      else setError(result.error.message)
    },
    onError: () => setError('Không thể kết nối local server. Hãy thử lại.'),
  })
  const joinMutation = useMutation({
    mutationFn: (input: { roomCode: string; displayName: string }) =>
      orpcClient.lobby.joinGame(input),
    onSuccess(result) {
      if (result.ok) onSessionCreated(result.value.playerSessionToken)
      else setError(result.error.message)
    },
    onError: () => setError('Không thể kết nối local server. Hãy thử lại.'),
  })
  const isPending = createMutation.isPending || joinMutation.isPending

  function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const form = new FormData(event.currentTarget)
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    createMutation.mutate(String(form.get('moderatorName') ?? ''))
  }

  function submitJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const form = new FormData(event.currentTarget)
    joinMutation.mutate({
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      roomCode: String(form.get('roomCode') ?? '').toUpperCase(),
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      displayName: String(form.get('displayName') ?? ''),
    })
  }

  return (
    <main className="isolate min-h-dvh overflow-hidden">
      <div className="mx-auto grid min-h-dvh max-w-6xl lg:grid-cols-[5fr_4fr]">
        <section className="relative flex min-w-0 flex-col justify-between gap-16 px-6 py-8 sm:px-10 sm:py-10 lg:px-14 lg:py-12">
          <div className="pointer-events-none absolute -top-48 -left-56 size-128 rounded-full bg-red-950/40 blur-3xl" />
          <header className="relative flex items-center gap-3">
            <span className="size-2 rounded-full bg-red-500 shadow-[0_0_24px_var(--color-red-500)]" />
            <p className="font-mono text-sm tracking-wide text-stone-400 uppercase">
              Werewolf / Local table 01
            </p>
          </header>
          <div className="relative flex max-w-2xl flex-col gap-7 lg:pb-12">
            <p className="font-mono text-sm tracking-wide text-red-300 uppercase">
              Moderator assistant
            </p>
            <h1 className="max-w-[15ch] text-balance text-5xl font-medium tracking-tight text-stone-50 sm:text-6xl lg:text-7xl">
              Giữ bí mật trong đêm. Giữ nhịp cho cả bàn.
            </h1>
            <p className="max-w-[55ch] text-pretty text-lg text-stone-400 sm:text-base/7">
              Tạo một phòng local, mời 5–6 người chơi và để hệ thống điều phối
              từng lượt. Quản trò vẫn là người đưa ra quyết định cuối cùng.
            </p>
          </div>
          <div className="relative grid grid-cols-3 divide-x divide-white/10 border-t border-white/10 pt-5">
            <EntryStat value="5–6" label="Người chơi" />
            <EntryStat value="4" label="Vai trò" />
            <EntryStat value="Local" label="Dữ liệu" />
          </div>
        </section>

        <section className="flex items-center bg-stone-100 px-6 py-12 text-stone-950 sm:px-10 lg:px-12">
          <div className="mx-auto flex w-full max-w-xs flex-col gap-8">
            <div className="flex flex-col gap-3">
              <p className="font-mono text-sm tracking-wide text-red-700 uppercase">
                Bắt đầu
              </p>
              <h2 className="text-balance text-3xl font-semibold tracking-tight">
                {mode === 'CREATE' ? 'Mở một phòng mới' : 'Vào phòng đang chờ'}
              </h2>
              <p className="text-pretty text-base/7 text-stone-600 sm:text-sm/6">
                {mode === 'CREATE'
                  ? 'Bạn sẽ nhận room code và quyền điều khiển của Quản trò.'
                  : 'Nhập room code từ Quản trò và tên hiển thị của bạn.'}
              </p>
            </div>
            <div className="grid grid-cols-2 border-b border-stone-950/10">
              <ModeButton
                active={mode === 'CREATE'}
                onClick={() => {
                  setMode('CREATE')
                  setError(null)
                }}
              >
                Tạo phòng
              </ModeButton>
              <ModeButton
                active={mode === 'JOIN'}
                onClick={() => {
                  setMode('JOIN')
                  setError(null)
                }}
              >
                Tham gia
              </ModeButton>
            </div>
            {mode === 'CREATE' ? (
              <form className="flex flex-col gap-5" onSubmit={submitCreate}>
                <TextField
                  id="moderator-name"
                  label="Tên Quản trò"
                  name="moderatorName"
                  placeholder="Ví dụ: Hoa"
                  autoComplete="name"
                />
                <PrimaryButton pending={isPending}>
                  Tạo phòng local
                </PrimaryButton>
              </form>
            ) : (
              <form className="flex flex-col gap-5" onSubmit={submitJoin}>
                <TextField
                  id="room-code"
                  label="Room code"
                  name="roomCode"
                  placeholder="ABC123"
                  autoComplete="off"
                  mono
                  maxLength={6}
                />
                <TextField
                  id="display-name"
                  label="Tên hiển thị"
                  name="displayName"
                  placeholder="Ví dụ: An"
                  autoComplete="name"
                />
                <PrimaryButton pending={isPending}>Vào phòng</PrimaryButton>
              </form>
            )}
            {error ? (
              <p className="border-l-2 border-red-700 pl-3 text-base/7 text-red-800 sm:text-sm/6">
                {error}
              </p>
            ) : null}
            <p className="text-pretty text-base/7 text-stone-500 sm:text-sm/6">
              Dữ liệu chỉ tồn tại trong server memory và sẽ mất khi dừng tiến
              trình local.
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}

function EntryStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 px-4 first:pl-0 last:pr-0">
      <p className="font-mono text-lg tabular-nums text-stone-200">{value}</p>
      <p className="truncate text-sm text-stone-500">{label}</p>
    </div>
  )
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      className={`border-b-2 px-2 py-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-red-700 ${active ? 'border-red-700 text-stone-950' : 'border-transparent text-stone-500 hover:text-stone-800'}`}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function TextField({
  id,
  label,
  mono = false,
  ...inputProps
}: {
  id: string
  label: string
  mono?: boolean
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-stone-700" htmlFor={id}>
        {label}
      </label>
      <input
        {...inputProps}
        className={`rounded-md bg-white px-3 py-2.5 text-base text-stone-950 shadow-sm ring-1 ring-stone-950/10 placeholder:text-stone-400 focus-visible:-outline-offset-1 focus-visible:outline-2 focus-visible:outline-red-700 sm:py-2 sm:text-sm ${mono ? 'font-mono tracking-[0.16em] uppercase' : ''}`}
        id={id}
        required
      />
    </div>
  )
}

function PrimaryButton({
  pending,
  children,
}: {
  pending: boolean
  children: ReactNode
}) {
  return (
    <button
      className="rounded-md bg-red-700 px-3 py-2.5 text-sm font-medium text-white ring-1 ring-red-700 transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 sm:py-2"
      type="submit"
      disabled={pending}
    >
      {pending ? 'Đang xử lý...' : children}
    </button>
  )
}
