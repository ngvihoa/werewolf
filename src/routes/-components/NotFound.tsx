export function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div className="flex max-w-sm flex-col gap-4">
        <p className="font-mono text-sm tracking-wide text-red-300 uppercase">
          404 / Không tìm thấy
        </p>
        <h1 className="text-3xl font-medium tracking-tight text-stone-50">
          Đường dẫn này không tồn tại
        </h1>
        <a className="text-sm text-stone-400 underline" href="/">
          Trở về sảnh
        </a>
      </div>
    </main>
  )
}
