export function AppLoading() {
  return (
    <main className="isolate grid min-h-dvh place-items-center px-6">
      <p className="font-mono text-sm tracking-wide text-stone-500 uppercase">
        Đang mở sổ ván chơi...
      </p>
    </main>
  )
}

export function LobbyError({
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

export function InlineError({ message }: { message: string }) {
  return (
    <p className="border-l-2 border-red-500 pl-3 text-base/7 text-red-300 sm:text-sm/6">
      {message}
    </p>
  )
}
