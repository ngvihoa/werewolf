export const THEME_STORAGE_KEY = 'werewolf.theme.v1'

export const THEMES = [
  { value: 'moonlit-indigo', label: 'Moonlit Indigo' },
  { value: 'misty-forest', label: 'Misty Forest' },
  { value: 'burgundy-dusk', label: 'Burgundy Dusk' },
  { value: 'moonlit-lodge', label: 'Moonlit Lodge' },
] as const

export type ThemeName = (typeof THEMES)[number]['value']

export const DEFAULT_THEME: ThemeName = 'moonlit-indigo'

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
