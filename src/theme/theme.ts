export const THEME_STORAGE_KEY = 'werewolf.theme.v1'

export const THEMES = [
  { value: 'moonlit-indigo', label: 'Moonlit Indigo' },
  { value: 'misty-forest', label: 'Misty Forest' },
  { value: 'burgundy-dusk', label: 'Burgundy Dusk' },
  { value: 'moonlit-lodge', label: 'Moonlit Lodge' },
] as const

export type ThemeName = (typeof THEMES)[number]['value']

export const DEFAULT_THEME: ThemeName = 'moonlit-indigo'

/*
 * Swatch 3 chấm cho popover đổi theme: [nền panel, chữ, accent]. Phải map
 * cứng vì CSS var() trong DOM chỉ có giá trị của theme ĐANG bật — giữ đồng bộ
 * với các block html[data-theme] trong styles.css.
 */
export const THEME_SWATCHES: Record<
  ThemeName,
  readonly [string, string, string]
> = {
  'moonlit-indigo': ['#222137', '#faf4ea', '#d95d69'],
  'moonlit-lodge': ['#141216', '#fffaf3', '#a83b48'],
  'misty-forest': ['#1f302d', '#f7f5ec', '#d4a85f'],
  'burgundy-dusk': ['#3b222c', '#fff5f0', '#e0a0a6'],
}

const THEME_VALUES = new Set<string>(THEMES.map((theme) => theme.value))

export function isThemeName(value: unknown): value is ThemeName {
  return typeof value === 'string' && THEME_VALUES.has(value)
}

export const themeBootstrapScript = `(() => {
  try {
    const stored = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
    const themes = ${JSON.stringify(THEMES.map((theme) => theme.value))};
    document.documentElement.dataset.theme = themes.includes(stored)
      ? stored
      : ${JSON.stringify(DEFAULT_THEME)};
  } catch {
    document.documentElement.dataset.theme = ${JSON.stringify(DEFAULT_THEME)};
  }
})();`
