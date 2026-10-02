import { useEffect, useRef, useState } from 'react'
import { THEMES, THEME_SWATCHES } from '#/theme/theme'
import { Check, Palette } from 'lucide-react'
import { useTheme } from '#/hooks/useTheme'
import { cn } from '#/lib/cn'

/**
 * Nút đổi theme dạng popover swatch: thu gọn là icon-only (im lặng), bấm mở
 * panel 4 hàng "3 chấm màu + tên", chọn là đóng. Không render ở /game —
 * trong ván không ai đổi theme giữa chừng (nguyên tắc 1 trọng tâm), được
 * đảm bảo bằng cách mount theo route (RootDocument không còn render nó).
 */
export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div
      className="theme-switcher-root fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] z-50 flex flex-col items-end gap-2 sm:right-5 sm:bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))]"
      ref={rootRef}
    >
      {open ? (
        <div
          aria-label="Chọn giao diện"
          className="theme-switcher flex w-60 flex-col gap-1 rounded-2xl p-2 shadow-xl"
          role="menu"
        >
          {THEMES.map((option) => {
            const active = option.value === theme
            return (
              <button
                aria-checked={active}
                className={cn(
                  'flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm font-medium transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white/60',
                  active && 'bg-white/10',
                )}
                key={option.value}
                role="menuitemradio"
                type="button"
                onClick={() => {
                  setTheme(option.value)
                  setOpen(false)
                }}
              >
                <span aria-hidden="true" className="flex shrink-0 gap-1">
                  {THEME_SWATCHES[option.value].map((color) => (
                    <span
                      className="size-3.5 rounded-full ring-1 ring-black/25"
                      key={color}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </span>
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                {active ? (
                  <Check aria-hidden="true" className="size-4 shrink-0" />
                ) : null}
              </button>
            )
          })}
        </div>
      ) : null}
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Chọn giao diện"
        className="theme-switcher grid size-12 cursor-pointer place-items-center rounded-full shadow-xl backdrop-blur-md transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
        type="button"
        onClick={() => setOpen((value) => !value)}
      >
        <Palette aria-hidden="true" className="size-5" />
      </button>
    </div>
  )
}
