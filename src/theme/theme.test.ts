import { describe, expect, it } from 'vitest'

import { DEFAULT_THEME, isThemeName } from './theme'

describe('theme selection', () => {
  it('defaults to Moonlit Indigo', () => {
    expect(DEFAULT_THEME).toBe('moonlit-indigo')
  })

  it('accepts only a known theme name', () => {
    expect(isThemeName('misty-forest')).toBe(true)
    expect(isThemeName('occult-parchment')).toBe(false)
    expect(isThemeName('unknown-theme')).toBe(false)
    expect(isThemeName(null)).toBe(false)
  })
})
