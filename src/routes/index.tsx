import type { FormEvent } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useSyncExternalStore } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { orpcClient } from '#/orpc/client'

const SESSION_STORAGE_KEY = 'werewolf.local-session'
const SESSION_CHANGED_EVENT = 'werewolf:session-changed'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const sessionToken = useSyncExternalStore(
    subscribeToSession,
    getSessionSnapshot,
    getServerSessionSnapshot,
  )

  function saveSession(token: string) {
    window.localStorage.setItem(SESSION_STORAGE_KEY, token)
    window.dispatchEvent(new Event(SESSION_CHANGED_EVENT))
  }

  function leaveSession() {
    window.localStorage.removeItem(SESSION_STORAGE_KEY)
    window.dispatchEvent(new Event(SESSION_CHANGED_EVENT))
  }

  return sessionToken ? (
    <LobbyRoom sessionToken={sessionToken} onLeave={leaveSession} />
  ) : (
    <LobbyEntry onSessionCreated={saveSession} />
  )
}

function subscribeToSession(onStoreChange: () => void) {
  window.addEventListener('storage', onStoreChange)
  window.addEventListener(SESSION_CHANGED_EVENT, onStoreChange)
  return () => {
    window.removeEventListener('storage', onStoreChange)
    window.removeEventListener(SESSION_CHANGED_EVENT, onStoreChange)
  }
}

function getSessionSnapshot() {
  return window.localStorage.getItem(SESSION_STORAGE_KEY)
}

function getServerSessionSnapshot() {
  return null
}

function AppLoading() {
  return (
    <main className="isolate grid min-h-dvh place-items-center px-6">
      <p className="font-mono text-sm tracking-wide text-stone-500 uppercase">
        Đang mở sổ ván chơi...
      </p>
    </main>
  )
}

function LobbyEntry({
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

function LobbyRoom({
  sessionToken,
  onLeave,
}: {
  sessionToken: string
  onLeave: () => void
}) {
  const queryClient = useQueryClient()
  const viewQuery = useQuery({
    queryKey: ['local-game-view', sessionToken],
    queryFn: async () => {
      const result = await orpcClient.lobby.getGameView({ sessionToken })
      if (!result.ok) throw new Error(result.error.message)
      return result.value
    },
    refetchInterval: 10_000,
  })

  const invalidateView = () =>
    queryClient.invalidateQueries({
      queryKey: ['local-game-view', sessionToken],
    })
  const readyMutation = useMutation({
    mutationFn: (ready: boolean) =>
      orpcClient.lobby.setReady({ sessionToken, ready }),
    onSuccess: invalidateView,
  })
  const assignMutation = useMutation({
    mutationFn: () => orpcClient.lobby.assignRoles({ sessionToken }),
    onSuccess: invalidateView,
  })
  const startMutation = useMutation({
    mutationFn: () => orpcClient.lobby.startGame({ sessionToken }),
    onSuccess: invalidateView,
  })

  if (viewQuery.isPending) return <AppLoading />
  if (viewQuery.isError || !viewQuery.data) {
    return <LobbyError message={viewQuery.error?.message} onLeave={onLeave} />
  }

  const view = viewQuery.data
  const isModerator = view.viewer === 'MODERATOR'
  const roomCode =
    view.viewer === 'MODERATOR' ? view.game.roomCode : view.roomCode
  const version = view.viewer === 'MODERATOR' ? view.game.version : view.version
  const players =
    view.viewer === 'MODERATOR'
      ? view.game.lobbyPlayers.map((player) => ({
          ...player,
          alive:
            view.game.state?.players.find(
              (candidate) => candidate.id === player.id,
            )?.alive ?? true,
        }))
      : view.players.map((player) => ({ ...player, role: null }))
  const rolesAssigned =
    view.viewer === 'MODERATOR'
      ? players.length > 0 && players.every((player) => player.role !== null)
      : view.me.role !== null
  const allReady = players.length > 0 && players.every((player) => player.ready)
  const gameStarted =
    view.viewer === 'MODERATOR'
      ? view.game.state !== null
      : view.phase !== 'LOBBY'

  let mutationError: string | null = null
  if (readyMutation.data?.ok === false) {
    mutationError = readyMutation.data.error.message
  } else if (assignMutation.data?.ok === false) {
    mutationError = assignMutation.data.error.message
  } else if (startMutation.data?.ok === false) {
    mutationError = startMutation.data.error.message
  }

  return (
    <main className="isolate min-h-dvh px-5 py-6 sm:px-8 sm:py-8 lg:px-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <header className="flex items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="size-2 shrink-0 rounded-full bg-red-500 shadow-[0_0_24px_var(--color-red-500)]" />
            <p className="truncate font-mono text-sm tracking-wide text-stone-400 uppercase">
              {isModerator ? 'Moderator console' : 'Player room'}
            </p>
          </div>
          <button
            className="relative shrink-0 px-2 py-2 text-sm text-stone-400 transition-colors hover:text-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
            type="button"
            onClick={onLeave}
          >
            Rời phòng
            <span
              className="pointer-fine:hidden absolute top-1/2 left-1/2 size-[max(100%,3rem)] -translate-1/2"
              aria-hidden="true"
            />
          </button>
        </header>

        <section className="grid gap-10 lg:grid-cols-[3fr_2fr] lg:gap-16">
          <div className="flex min-w-0 flex-col gap-8">
            <div className="flex flex-col gap-3">
              <p className="font-mono text-sm tracking-wide text-red-300 uppercase">
                {gameStarted ? 'Ván chơi đã bắt đầu' : 'Đang chờ trong sảnh'}
              </p>
              <div className="flex flex-wrap items-end justify-between gap-5">
                <div className="flex flex-col gap-2">
                  <h1 className="text-balance text-4xl font-medium tracking-tight text-stone-50 sm:text-5xl">
                    Phòng{' '}
                    <span className="font-mono text-red-200">{roomCode}</span>
                  </h1>
                  <p className="text-pretty text-base/7 text-stone-400 sm:text-sm/6">
                    Chia sẻ mã này cho người chơi mở trong tab hoặc thiết bị
                    khác.
                  </p>
                </div>
                <div className="flex items-center gap-2 font-mono text-sm text-stone-500">
                  <span className="size-1.5 rounded-full bg-emerald-400" />
                  Local sync · v<span className="tabular-nums">{version}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h2 className="text-xl font-medium text-stone-100">
                  Người chơi
                </h2>
                <p className="font-mono text-sm tabular-nums text-stone-500">
                  {players.length} / 6
                </p>
              </div>
              <ul className="divide-y divide-white/10" role="list">
                {players.length ? (
                  players.map((player, index) => (
                    <li
                      className="grid grid-cols-[auto_1fr_auto] items-center gap-4 py-4"
                      key={player.id}
                    >
                      <span className="grid size-10 place-items-center rounded-full bg-white/5 font-mono text-sm text-stone-400 ring-1 ring-white/10">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-base font-medium text-stone-100 sm:text-sm">
                          {player.displayName}
                        </p>
                        <p className="truncate text-base/7 text-stone-500 sm:text-sm/6">
                          {isModerator && player.role
                            ? roleLabel(player.role)
                            : 'Vai trò được giữ kín'}
                        </p>
                      </div>
                      <StatusBadge
                        ready={player.ready}
                        assigned={rolesAssigned}
                      />
                    </li>
                  ))
                ) : (
                  <li className="py-12 text-center text-base/7 text-stone-500 sm:text-sm/6">
                    Chưa có người chơi. Room code đang chờ được nhập.
                  </li>
                )}
              </ul>
            </div>
          </div>

          <aside className="min-w-0 border-t border-white/10 pt-8 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-10">
            {gameStarted ? (
              <GameStartedPanel isModerator={isModerator} />
            ) : view.viewer === 'MODERATOR' ? (
              <ModeratorControls
                playerCount={players.length}
                rolesAssigned={rolesAssigned}
                allReady={allReady}
                assigning={assignMutation.isPending}
                starting={startMutation.isPending}
                error={mutationError}
                onAssign={() => assignMutation.mutate()}
                onStart={() => startMutation.mutate()}
              />
            ) : (
              <PlayerControls
                role={view.me.role}
                ready={view.me.ready}
                pending={readyMutation.isPending}
                error={mutationError}
                onReadyChange={(ready) => readyMutation.mutate(ready)}
              />
            )}
          </aside>
        </section>
      </div>
    </main>
  )
}

function ModeratorControls({
  playerCount,
  rolesAssigned,
  allReady,
  assigning,
  starting,
  error,
  onAssign,
  onStart,
}: {
  playerCount: number
  rolesAssigned: boolean
  allReady: boolean
  assigning: boolean
  starting: boolean
  error: string | null
  onAssign: () => void
  onStart: () => void
}) {
  const validCount = playerCount === 5 || playerCount === 6
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <p className="font-mono text-sm tracking-wide text-red-300 uppercase">
          Điều khiển sảnh
        </p>
        <h2 className="text-balance text-3xl font-medium tracking-tight text-stone-50">
          Chuẩn bị trước khi đêm xuống
        </h2>
        <p className="text-pretty text-base/7 text-stone-400 sm:text-sm/6">
          Phân vai khi đủ 5–6 người. Sau đó, mọi người xem vai riêng và xác nhận
          sẵn sàng.
        </p>
      </div>

      <ol className="flex flex-col divide-y divide-white/10" role="list">
        <ControlStep done={validCount} number="01" label="Đủ 5–6 người chơi" />
        <ControlStep
          done={rolesAssigned}
          number="02"
          label="Đã phân vai bí mật"
        />
        <ControlStep
          done={allReady}
          number="03"
          label="Mọi người đã sẵn sàng"
        />
      </ol>

      <div className="flex flex-col gap-3">
        <button
          className="rounded-md bg-white/5 px-3 py-2 text-sm font-medium text-stone-200 ring-1 ring-white/10 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
          type="button"
          disabled={!validCount || assigning || starting}
          onClick={onAssign}
        >
          {assigning
            ? 'Đang xáo vai...'
            : rolesAssigned
              ? 'Xáo và phân lại vai'
              : 'Xáo và phân vai'}
        </button>
        <button
          className="rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white ring-1 ring-red-700 transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
          type="button"
          disabled={!rolesAssigned || !allReady || starting || assigning}
          onClick={onStart}
        >
          {starting ? 'Đang bắt đầu...' : 'Bắt đầu đêm đầu tiên'}
        </button>
      </div>
      {error ? <InlineError message={error} /> : null}
    </div>
  )
}

function PlayerControls({
  role,
  ready,
  pending,
  error,
  onReadyChange,
}: {
  role: 'VILLAGER' | 'WEREWOLF' | 'SEER' | 'WITCH' | null
  ready: boolean
  pending: boolean
  error: string | null
  onReadyChange: (ready: boolean) => void
}) {
  if (!role) {
    return (
      <div className="flex flex-col gap-4">
        <p className="font-mono text-sm tracking-wide text-red-300 uppercase">
          Đang chờ Quản trò
        </p>
        <h2 className="text-balance text-3xl font-medium tracking-tight text-stone-50">
          Vai trò chưa được phân
        </h2>
        <p className="text-pretty text-base/7 text-stone-400 sm:text-sm/6">
          Giữ tab này mở. Vai của bạn sẽ xuất hiện riêng tại đây sau khi Quản
          trò xáo vai.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <p className="font-mono text-sm tracking-wide text-red-300 uppercase">
          Vai của bạn
        </p>
        <h2 className="text-4xl font-medium tracking-tight text-stone-50">
          {roleLabel(role)}
        </h2>
        <p className="text-pretty text-base/7 text-stone-400 sm:text-sm/6">
          {roleDescription(role)}
        </p>
      </div>

      <div className="rounded-lg bg-white/5 p-5 ring-1 ring-white/10">
        <p className="font-mono text-sm tracking-wide text-stone-500 uppercase">
          Bảo mật vai
        </p>
        <p className="pt-3 text-pretty text-base/7 text-stone-300 sm:text-sm/6">
          Chỉ màn hình của bạn và Quản trò nhận được thông tin này. Đừng chuyền
          thiết bị khi vai đang hiển thị.
        </p>
      </div>

      <button
        className={
          ready
            ? 'rounded-md bg-white/5 px-3 py-2 text-sm font-medium text-stone-200 ring-1 ring-white/10 transition-colors hover:bg-white/10 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500'
            : 'rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white ring-1 ring-red-700 transition-colors hover:bg-red-600 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500'
        }
        type="button"
        disabled={pending}
        onClick={() => onReadyChange(!ready)}
      >
        {pending
          ? 'Đang cập nhật...'
          : ready
            ? 'Hủy sẵn sàng'
            : 'Tôi đã xem vai và sẵn sàng'}
      </button>
      {error ? <InlineError message={error} /> : null}
    </div>
  )
}

function GameStartedPanel({ isModerator }: { isModerator: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="font-mono text-sm tracking-wide text-red-300 uppercase">
        Night 01
      </p>
      <h2 className="text-balance text-3xl font-medium tracking-tight text-stone-50">
        {isModerator ? 'Bàn đã sẵn sàng điều phối' : 'Đêm đầu tiên đã bắt đầu'}
      </h2>
      <p className="text-pretty text-base/7 text-stone-400 sm:text-sm/6">
        Lobby đã khóa. Màn hình game action sẽ được nối ở bước Core Game UI tiếp
        theo.
      </p>
    </div>
  )
}

function LobbyError({
  message,
  onLeave,
}: {
  message?: string
  onLeave: () => void
}) {
  return (
    <main className="isolate grid min-h-dvh place-items-center px-6">
      <div className="flex max-w-sm flex-col gap-5 text-center">
        <p className="font-mono text-sm tracking-wide text-red-300 uppercase">
          Session không còn hợp lệ
        </p>
        <h1 className="text-balance text-3xl font-medium tracking-tight text-stone-50">
          Không thể mở lại phòng local
        </h1>
        <p className="text-pretty text-base/7 text-stone-400 sm:text-sm/6">
          {message ?? 'Server có thể đã restart và xóa dữ liệu trong memory.'}
        </p>
        <button
          className="rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white ring-1 ring-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
          type="button"
          onClick={onLeave}
        >
          Trở về màn hình đầu
        </button>
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
  children: React.ReactNode
}) {
  return (
    <button
      className={`border-b-2 px-2 py-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-red-700 ${
        active
          ? 'border-red-700 text-stone-950'
          : 'border-transparent text-stone-500 hover:text-stone-800'
      }`}
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
} & React.InputHTMLAttributes<HTMLInputElement>) {
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
  children: React.ReactNode
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

function StatusBadge({
  ready,
  assigned,
}: {
  ready: boolean
  assigned: boolean
}) {
  const label = !assigned ? 'Đang chờ' : ready ? 'Sẵn sàng' : 'Xem vai'
  return (
    <span
      className={`rounded-full px-2.5 py-1 font-mono text-sm ring-1 ${
        ready && assigned
          ? 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/20'
          : 'bg-white/5 text-stone-400 ring-white/10'
      }`}
    >
      {label}
    </span>
  )
}

function ControlStep({
  done,
  number,
  label,
}: {
  done: boolean
  number: string
  label: string
}) {
  return (
    <li className="grid grid-cols-[auto_1fr_auto] items-center gap-3 py-4 first:pt-0 last:pb-0">
      <span className="font-mono text-sm text-stone-600">{number}</span>
      <p className="text-base text-stone-300 sm:text-sm">{label}</p>
      <span
        className={`size-2 rounded-full ${done ? 'bg-emerald-400' : 'bg-stone-700'}`}
      />
    </li>
  )
}

function InlineError({ message }: { message: string }) {
  return (
    <p className="border-l-2 border-red-500 pl-3 text-base/7 text-red-300 sm:text-sm/6">
      {message}
    </p>
  )
}

function roleLabel(role: 'VILLAGER' | 'WEREWOLF' | 'SEER' | 'WITCH') {
  return {
    VILLAGER: 'Dân làng',
    WEREWOLF: 'Ma sói',
    SEER: 'Tiên tri',
    WITCH: 'Phù thủy',
  }[role]
}

function roleDescription(role: 'VILLAGER' | 'WEREWOLF' | 'SEER' | 'WITCH') {
  return {
    VILLAGER: 'Quan sát, thảo luận và tìm ra Ma sói vào ban ngày.',
    WEREWOLF: 'Mỗi đêm chọn một người chơi để tấn công.',
    SEER: 'Mỗi đêm soi một người để biết họ thuộc phe nào.',
    WITCH: 'Bạn có một bình cứu và một bình độc dùng trong cả ván.',
  }[role]
}
