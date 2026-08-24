import { describe, expect, it } from 'vitest'

import { DEFAULT_THEME, isThemeName } from './theme'

describe('theme selection', () => {
  it('defaults to Occult Parchment', () => {
    expect(DEFAULT_THEME).toBe('occult-parchment')
  })

  it('accepts only a known theme name', () => {
    expect(isThemeName('misty-forest')).toBe(true)
    expect(isThemeName('unknown-theme')).toBe(false)
    expect(isThemeName(null)).toBe(false)
  })
})
