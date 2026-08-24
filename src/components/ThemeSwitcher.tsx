import { isThemeName, THEMES } from '#/theme/theme'
import { useTheme } from '#/hooks/useTheme'
import { Palette } from 'lucide-react'

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="theme-switcher fixed right-4 bottom-4 z-50 flex items-center gap-2 rounded-full px-3 py-2 shadow-xl backdrop-blur-md sm:right-5 sm:bottom-5">
      <Palette aria-hidden="true" className="size-4 shrink-0" />
      <label className="sr-only" htmlFor="theme-select">
        Giao diện
      </label>
      <select
        className="min-w-0 cursor-pointer appearance-none bg-transparent pr-4 text-sm font-medium outline-none"
        id="theme-select"
        value={theme}
        onChange={(event) => {
          if (isThemeName(event.target.value)) setTheme(event.target.value)
        }}
      >
        {THEMES.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
