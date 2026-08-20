export function SessionError({
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
          Phiên chơi không còn hợp lệ
        </p>
        <h1 className="text-balance text-3xl font-medium tracking-tight text-stone-50">
          Không thể mở lại phòng
        </h1>
        <p className="text-pretty text-base/7 text-stone-400 sm:text-sm/6">
          {message ??
            'Phiên đăng nhập có thể đã hết hạn hoặc không còn tồn tại.'}
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
