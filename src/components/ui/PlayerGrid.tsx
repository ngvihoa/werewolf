import type { ReactNode } from 'react'

export function PlayerGrid<T>({
  items,
  title = 'Người chơi',
  countLabel,
  emptyLabel,
  renderItem,
}: {
  items: T[]
  title?: string
  countLabel?: string
  emptyLabel?: string
  renderItem: (item: T, index: number) => ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-line pb-3">
        <h2 className="text-xl font-medium text-ink">{title}</h2>
        <p className="font-mono text-sm tabular-nums text-ink-muted">
          {countLabel ?? `${items.length} / 15`}
        </p>
      </div>
      {items.length ? (
        <ul
          className="grid grid-cols-2 gap-2.5 pt-1 sm:grid-cols-3 xl:grid-cols-4"
          role="list"
        >
          {items.map((item, index) => renderItem(item, index))}
        </ul>
      ) : (
        <p className="py-12 text-center text-base/7 text-ink-muted">
          {emptyLabel ?? 'Chưa có người chơi. Room code đang chờ được nhập.'}
        </p>
      )}
    </section>
  )
}
