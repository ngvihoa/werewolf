import { describe, expect, it } from 'vitest'

import {
    createSessionExpiry,
    SESSION_DURATION_MS,
    createSessionToken,
    hashSessionToken,
} from './session-token'

describe('session token service', () => {
    it('creates different random tokens', () => {
        const first = createSessionToken()
        const second = createSessionToken()

        expect(first).toMatch(/^ww_[A-Za-z0-9_-]+$/)
        expect(second).not.toBe(first)
    })

    it('creates a deterministic SHA-256 hash', () => {
        const token = 'ww_example-token'

        const firstHash = hashSessionToken(token)
        const secondHash = hashSessionToken(token)

        // Schema database yêu cầu SHA-256 dạng 64 ký tự hexadecimal.
        expect(firstHash).toMatch(/^[0-9a-f]{64}$/)
        expect(secondHash).toBe(firstHash)

        // Raw token không được xuất hiện trong database value.
        expect(firstHash).not.toContain(token)
    })

    it('calculates session expiry from the supplied clock', () => {
        const now = new Date('2026-08-13T00:00:00.000Z')

        const expiresAt = createSessionExpiry(now)

        expect(expiresAt.getTime()).toBe(now.getTime() + SESSION_DURATION_MS)
    })
})