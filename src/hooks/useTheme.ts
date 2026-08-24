import type { ThemeName } from '#/theme/theme'

import { THEME_STORAGE_KEY, DEFAULT_THEME, isThemeName } from '#/theme/theme'
import { useSyncExternalStore } from 'react'

const THEME_CHANGED_EVENT = 'werewolf:theme-changed'

function subscribeToTheme(onStoreChange: () => void) {
  window.addEventListener('storage', onStoreChange)
  window.addEventListener(THEME_CHANGED_EVENT, onStoreChange)
  return () => {
    window.removeEventListener('storage', onStoreChange)
    window.removeEventListener(THEME_CHANGED_EVENT, onStoreChange)
  }
}

function getThemeSnapshot(): ThemeName {
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
  return isThemeName(stored) ? stored : DEFAULT_THEME
}

function getServerThemeSnapshot(): ThemeName {
  return DEFAULT_THEME
}

export function useTheme() {
  const theme = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    getServerThemeSnapshot,
  )

  return {
    theme,
    setTheme: (nextTheme: ThemeName) => {
      document.documentElement.dataset.theme = nextTheme
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
      window.dispatchEvent(new Event(THEME_CHANGED_EVENT))
    },
  }
}
