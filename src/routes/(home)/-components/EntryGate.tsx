import type { FormEvent, InputHTMLAttributes } from 'react'

import { Navigate, Link, useNavigate } from '@tanstack/react-router'
import { useLocalSession } from '#/hooks/useLocalSession'
import { useMutation } from '@tanstack/react-query'
import { orpcClient } from '#/orpc/client'
import { useState } from 'react'
import { Button } from '#/components/ui/Button'

// Mã phòng sinh từ ROOM_CODE_ALPHABET (A-Z không I,O + 2-9 không 0,1).
const ROOM_CODE_PATTERN = /^[A-Z0-9]{6}$/

/**
 * "Cổng vào đêm": trang entry là một card trung tâm duy nhất trên tranh nền,
 * hai lối CREATE/JOIN hiện cùng lúc — không mode ẩn (nguyên tắc #1). Có
 * `joinCode` (deep-link /join/$code) thì card rút còn một lối, mã prefill sẵn.
 */
export function EntryGate({ joinCode }: { joinCode?: string }) {
  const navigate = useNavigate()
  const { sessionToken, saveSession } = useLocalSession()
  const [error, setError] = useState<string | null>(null)
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
              Werewolf / Bàn chơi trực tuyến
            </span>
          </Link>
          <Link
            className="shrink-0 text-sm text-ink-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-500"
            to="/rules"
          >
            Xem luật
          </Link>
        </header>
        <div className="flex flex-1 flex-col justify-center gap-4 py-8">
          <h1 className="text-center text-2xl font-medium tracking-tight text-ink">
            {joinOnly ? 'Vào phòng chơi' : 'Chọn lối vào bàn'}
          </h1>
          <section className="ink-panel flex flex-col gap-6 rounded-3xl px-5 py-7 sm:px-7 sm:py-8">
            {joinOnly ? null : (
              <div className="flex flex-col gap-3">
                <h2 className="text-lg font-medium text-ink">Quản trò</h2>
                <p className="text-sm/6 text-ink-muted">
                  Mở phòng và nhận mã mời cho cả bàn.
                </p>
                <form className="flex flex-col gap-4" onSubmit={submitCreate}>
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
                <div aria-hidden="true" className="flex items-center gap-3">
                  <span className="h-px flex-1 bg-line" />
                  <span className="font-mono text-xs tracking-widest text-ink-subtle uppercase">
                    hoặc
                  </span>
                  <span className="h-px flex-1 bg-line" />
                </div>
              </div>
            )}
            <div className="flex flex-col gap-3">
              <h2 className="text-lg font-medium text-ink">Người chơi</h2>
              <p className="text-sm/6 text-ink-muted">
                Dùng mã phòng bạn nhận được từ Quản trò.
              </p>
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
            {error ? (
              <p className="border-l-2 border-danger pl-3 text-sm/6 text-danger">
                {error}
              </p>
            ) : null}
          </section>
          <p className="text-center font-mono text-xs tracking-wide text-ink-muted">
            Mỗi người dùng một phiên riêng — vai trò giữ bí mật trên thiết bị.
          </p>
        </div>
      </div>
    </main>
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
        className={`rounded-xl bg-surface px-3 py-2.5 text-base text-ink ring-1 ring-line placeholder:text-ink-subtle focus-visible:-outline-offset-1 focus-visible:outline-2 focus-visible:outline-red-500 sm:text-sm ${className}`}
        id={id}
        required
      />
    </div>
  )
}
