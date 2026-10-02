import type { FormEvent, InputHTMLAttributes, ReactNode } from 'react'

import { ChevronLeft, ChevronRight, Crown, Users } from 'lucide-react'
import { Navigate, Link, useNavigate } from '@tanstack/react-router'
import { useLocalSession } from '#/hooks/useLocalSession'
import { useMutation } from '@tanstack/react-query'
import { orpcClient } from '#/orpc/client'
import { useState } from 'react'
import { Button } from '#/components/ui/Button'
import { cn } from '#/lib/cn'

// Mã phòng sinh từ ROOM_CODE_ALPHABET (A-Z không I,O + 2-9 không 0,1).
const ROOM_CODE_PATTERN = /^[A-Z0-9]{6}$/

type EntryPath = 'MENU' | 'CREATE' | 'JOIN'

/**
 * "Cổng vào đêm": trang entry là một card trung tâm duy nhất trên tranh nền.
 * Mặc định chỉ có 2 nút-lối — chọn lối rồi form mới hiện, tránh chất cả hai
 * form vào một card (nguyên tắc #1). Có `joinCode` (deep-link /join/$code)
 * thì bỏ qua menu, vào thẳng lối Người chơi với mã prefill sẵn.
 */
export function EntryGate({ joinCode }: { joinCode?: string }) {
  const navigate = useNavigate()
  const { sessionToken, saveSession } = useLocalSession()
  const [error, setError] = useState<string | null>(null)
  const [path, setPath] = useState<EntryPath>(
    joinCode !== undefined ? 'JOIN' : 'MENU',
  )
  const createMutation = useMutation({
    mutationFn: (moderatorName: string) =>
      orpcClient.lobby.createGame({ moderatorName }),
    onSuccess(result) {
      if (result.ok) handleSessionCreated(result.value.moderatorSessionToken)
      else setError(result.error.message)
    },
    onError: () => setError('Không thể kết nối máy chủ. Hãy thử lại.'),
  })
  const joinMutation = useMutation({
    mutationFn: (input: { roomCode: string; displayName: string }) =>
      orpcClient.lobby.joinGame(input),
    onSuccess(result) {
      if (result.ok) handleSessionCreated(result.value.playerSessionToken)
      else setError(result.error.message)
    },
    onError: () => setError('Không thể kết nối máy chủ. Hãy thử lại.'),
  })
  const isPending = createMutation.isPending || joinMutation.isPending
  const initialCode = (joinCode ?? '').trim().toUpperCase()
  const joinOnly = joinCode !== undefined

  function handleSessionCreated(token: string) {
    saveSession(token)
    void navigate({ to: '/lobby' })
  }

  function selectPath(next: Exclude<EntryPath, 'MENU'>) {
    setError(null)
    setPath(next)
  }

  function backToMenu() {
    setError(null)
    setPath('MENU')
  }

  function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const form = new FormData(event.currentTarget)
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    createMutation.mutate(String(form.get('moderatorName') ?? '').trim())
  }

  function submitJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const form = new FormData(event.currentTarget)
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    const roomCode = String(form.get('roomCode') ?? '')
      .trim()
      .toUpperCase()
    if (!ROOM_CODE_PATTERN.test(roomCode)) {
      setError('Mã phòng gồm đúng 6 ký tự chữ và số.')
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    const displayName = String(form.get('displayName') ?? '').trim()
    joinMutation.mutate({ roomCode, displayName })
  }

  if (sessionToken) return <Navigate to="/lobby" replace />

  return (
    <main data-bg="entry" className="isolate relative min-h-dvh">
      <div aria-hidden="true" className="phase-backdrop">
        <div className="bg-entry" />
      </div>
      <div aria-hidden="true" className="phase-scrim" />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 -z-[8] h-24 bg-linear-to-b from-midnight/85 via-midnight/50 to-transparent"
      />
      <div className="relative mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 py-5 sm:px-6 sm:py-7">
        <header className="flex items-center justify-between gap-3">
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
            <span className="truncate font-mono text-sm tracking-wide text-ink-muted uppercase">
              Moonveil / Bàn chơi trực tuyến
            </span>
          </Link>
          <Link
            className="shrink-0 text-sm text-ink-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-500"
            to="/rules"
          >
            Xem luật
          </Link>
        </header>
        <div className="relative flex flex-1 flex-col justify-center gap-4 py-8">
          {path === 'MENU' ? (
            <section className="relative mt-24 w-full rounded-3xl bg-[#f6ecd2] px-5 pt-19 pb-6 shadow-lg shadow-black/30 sm:px-8 sm:pb-7">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-2 rounded-2xl border border-[#d9c398]"
              />
              {/* Hình tròn cùng màu card tạo "bump" trên mép — logo treo như
                  được đóng đinh vào vòng tròn, đúng silhouette mockup. */}
              <div
                aria-hidden="true"
                className="absolute -top-16 left-1/2 h-30 w-60 -translate-x-1/2 rounded-t-full bg-[#f6ecd2]"
              />
              <img
                alt="Moonveil"
                className="absolute -top-26 left-1/2 w-64 -translate-x-1/2"
                decoding="async"
                src="/logo-with-name.webp"
              />
              <h1 className="text-center text-3xl font-bold leading-tight tracking-tight text-[#1d2a45] sm:text-4xl">
                Bạn sẽ tham gia với vai trò nào?
              </h1>
              <p className="mt-1 text-center text-sm/6 text-[#5a5142]">
                Chọn cách bạn muốn bước vào Moonveil.
              </p>
              <div className="mt-6 flex flex-col gap-3">
                <PathTile
                  description="Tạo phòng và dẫn dắt ván chơi."
                  icon={
                    <Crown
                      aria-hidden="true"
                      className="size-5"
                      fill="currentColor"
                    />
                  }
                  onClick={() => selectPath('CREATE')}
                  title="Quản trò"
                  variant="host"
                />
                <PathTile
                  description="Vào phòng bằng mã mời."
                  icon={
                    <Users
                      aria-hidden="true"
                      className="size-5"
                      fill="currentColor"
                    />
                  }
                  onClick={() => selectPath('JOIN')}
                  title="Người chơi"
                  variant="player"
                />
              </div>
              <div aria-hidden="true" className="mt-5 flex justify-center">
                <span className="text-lg text-[#c9a55c]">✦</span>
              </div>
            </section>
          ) : (
            <>
              <h1 className="text-center text-2xl font-medium tracking-tight text-ink">
                {path === 'CREATE' ? 'Mở phòng mới' : 'Vào phòng đang chờ'}
              </h1>
              <section className="ink-panel flex flex-col gap-5 rounded-3xl px-5 py-7 sm:px-7 sm:py-8">
                {path === 'CREATE' ? (
                  <div className="flex flex-col gap-4">
                    <BackToMenuButton onClick={backToMenu} />
                    <div className="flex flex-col gap-1">
                      <h2 className="text-lg font-medium text-ink">Quản trò</h2>
                      <p className="text-sm/6 text-ink-muted">
                        Mở phòng và nhận mã mời cho cả bàn.
                      </p>
                    </div>
                    <form
                      className="flex flex-col gap-4"
                      onSubmit={submitCreate}
                    >
                      <EntryField
                        autoComplete="name"
                        id="moderator-name"
                        label="Tên của bạn"
                        maxLength={30}
                        name="moderatorName"
                        placeholder="Ví dụ: Hoa"
                      />
                      <Button
                        pending={isPending}
                        pendingLabel="Đang mở phòng..."
                        type="submit"
                        variant="primary"
                      >
                        Mở phòng mới
                      </Button>
                    </form>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {joinOnly ? null : (
                      <BackToMenuButton onClick={backToMenu} />
                    )}
                    <div className="flex flex-col gap-1">
                      <h2 className="text-lg font-medium text-ink">
                        Người chơi
                      </h2>
                      <p className="text-sm/6 text-ink-muted">
                        Dùng mã phòng bạn nhận được từ Quản trò.
                      </p>
                    </div>
                    <form className="flex flex-col gap-4" onSubmit={submitJoin}>
                      <CodeField initialCode={initialCode} />
                      <EntryField
                        autoComplete="name"
                        // Deep-link /join/$code: mã đã có sẵn, tập trung ngay vào tên.
                        // eslint-disable-next-line jsx-a11y/no-autofocus
                        autoFocus={joinOnly}
                        id="display-name"
                        label="Tên hiển thị"
                        maxLength={30}
                        name="displayName"
                        placeholder="Ví dụ: An"
                      />
                      <Button
                        pending={isPending}
                        pendingLabel="Đang vào phòng..."
                        type="submit"
                        variant="primary"
                      >
                        Vào phòng
                      </Button>
                    </form>
                  </div>
                )}
                {error ? (
                  <p className="border-l-2 border-danger pl-3 text-sm/6 text-danger">
                    {error}
                  </p>
                ) : null}
              </section>
            </>
          )}
        </div>
      </div>
    </main>
  )
}

const TILE_VARIANTS = {
  // Navy mực + vương miện vàng đèn lồng — lối Quản trò.
  host: {
    mainColor: 'bg-[#e8a25e]',
    tile: 'bg-[#1d2a45] hover:bg-[#243352] ring-black/25',
    badge: 'bg-[#e8a25e]/15 ring-[#e8a25e]/45 text-[#1d2a45]',
    text: 'text-[#f6ecd2]',
    desc: 'text-[#f6ecd2]/65',
    chevron: 'text-[#e8a25e]/80',
  },
  // Đỏ máu tối + huy hiệu hồng đá — lối Người chơi.
  player: {
    mainColor: 'bg-[#e0a3ab]',
    tile: 'bg-[#4b1d26] hover:bg-[#5a242f] ring-black/25',
    badge: 'bg-[#d98a94]/15 ring-[#d98a94]/40 text-[#4b1d26]',
    text: 'text-[#f6ecd2]',
    desc: 'text-[#f6ecd2]/65',
    chevron: 'text-[#d98a94]/80',
  },
} as const

function PathTile({
  icon,
  title,
  description,
  onClick,
  variant,
}: {
  icon: ReactNode
  title: string
  description: string
  onClick: () => void
  variant: keyof typeof TILE_VARIANTS
}) {
  const styles = TILE_VARIANTS[variant]
  return (
    <button
      className={cn(
        'flex items-center gap-4 rounded-2xl px-4 py-4 text-left ring-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500',
        styles.tile,
      )}
      type="button"
      onClick={onClick}
    >
      <div
        className={cn(
          'relative isolate grid size-12 shrink-0 place-items-center rounded-full ring-1',
          styles.badge,
        )}
      >
        <div
          aria-hidden="true"
          className={cn('absolute inset-1 rounded-full', styles.mainColor)}
        />
        {(
          ['rotate-0', 'rotate-90', 'rotate-180', 'rotate-[270deg]'] as const
        ).map((rotation, index) => (
          <div
            aria-hidden="true"
            className={cn('absolute h-2 w-1 [clip-path:polygon(50%_0%,100%_50%,50%_100%,0%_50%)]', rotation, styles.mainColor, {
              '-top-1 left-1/2 -translate-x-1/2': index === 0,
              'top-1/2 -right-1 -translate-y-1/2': index === 1,
              '-bottom-1 left-1/2 -translate-x-1/2': index === 2,
              'top-1/2 -left-1 -translate-y-1/2': index === 3,
            })}
            key={rotation}
          />
        ))}
        <span className="relative z-10">{icon}</span>
      </div>
      <span className="min-w-0 flex-1">
        <span className={cn('block text-base font-medium', styles.text)}>
          {title}
        </span>
        <span className={cn('block text-sm/6', styles.desc)}>
          {description}
        </span>
      </span>
      <ChevronRight
        aria-hidden="true"
        className={cn('size-6 shrink-0', styles.chevron)}
      />
    </button>
  )
}

function BackToMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="-mb-1 flex min-h-9 items-center gap-1 self-start rounded-lg px-1.5 text-sm text-ink-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
      type="button"
      onClick={onClick}
    >
      <ChevronLeft aria-hidden="true" className="size-4" />
      Chọn lại lối
    </button>
  )
}

/*
 * Ô mã 6 ngăn: 6 ô hiển thị mirror giá trị + MỘT input thật đè trong suốt —
 * paste/kéo chọn/xóa đều là hành vi input gốc, không auto-advance. Chữ input
 * trong suốt vì ký tự đã hiện trong ô; FormData vẫn đọc được value.
 */
function CodeField({ initialCode }: { initialCode: string }) {
  const [code, setCode] = useState(initialCode)
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-ink-muted" htmlFor="room-code">
        Mã phòng
      </label>
      <div className="relative h-14 w-full rounded-xl focus-within:ring-2 focus-within:ring-red-500/60">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex gap-2"
        >
          {Array.from({ length: 6 }, (_, index) => (
            <span
              className="flex h-full flex-1 items-center justify-center rounded-xl bg-surface font-mono text-xl text-ink ring-1 ring-line"
              key={index}
            >
              {code.at(index) ?? ''}
            </span>
          ))}
        </div>
        <input
          autoComplete="off"
          autoCapitalize="characters"
          className="absolute inset-0 h-full w-full bg-transparent font-mono text-xl text-transparent caret-ink outline-none sm:text-lg"
          id="room-code"
          inputMode="text"
          maxLength={6}
          name="roomCode"
          spellCheck={false}
          value={code}
          onChange={(event) =>
            setCode(
              event.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase(),
            )
          }
        />
      </div>
    </div>
  )
}

function EntryField({
  id,
  label,
  className = '',
  ...inputProps
}: {
  id: string
  label: string
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-ink-muted" htmlFor={id}>
        {label}
      </label>
      <input
        {...inputProps}
        className={cn(
          'rounded-xl bg-surface px-3 py-2.5 text-base text-ink ring-1 ring-line placeholder:text-ink-subtle focus-visible:-outline-offset-1 focus-visible:outline-2 focus-visible:outline-red-500 sm:text-sm',
          className,
        )}
        id={id}
        required
      />
    </div>
  )
}
