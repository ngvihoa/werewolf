import { createHash, randomBytes } from 'node:crypto'

/**
 * Token chỉ tồn tại trong 24 giờ
 */
export const SESSION_DURATION_MS = 24 * 60 * 60 * 1000

/**
 * Hàm sinh token random
 */
export const createSessionToken = () => {
    return `ww_${randomBytes(32).toString('base64url')}`
}

/**
 * Hàm hash/encoding session token để lưu vào db
 */
export const hashSessionToken = (sessionToken: string) => {
    return createHash('sha256').update(sessionToken, 'utf8').digest('hex')
}

/**
 * Tạo thời gian expire của token
 * @param now
 * @param duration
 * @returns
 */
export const createSessionExpiry = (
    now: Date,
    duration = SESSION_DURATION_MS,
) => {
    return new Date(now.getTime() + duration)
}
