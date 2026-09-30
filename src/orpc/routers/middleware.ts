import { ORPCError, os } from '@orpc/server'

// Session token do server sinh ra với định dạng cố định: tiền tố "ww_" cộng
// với base64url. Middleware này là ranh giới đầu tiên của oRPC: mọi procedure
// có input mang sessionToken đều bị chặn sớm trước khi token lạ được hash
// hoặc dùng để tra cứu trong store.
const SESSION_TOKEN_PATTERN = /^[A-Za-z0-9_-]+$/
const SESSION_TOKEN_MAX_LENGTH = 128

export const sessionTokenGuard = os.middleware(async ({ next }, input) => {
  if (typeof input === 'object' && input !== null && 'sessionToken' in input) {
    const sessionToken = (input as Record<string, unknown>).sessionToken

    if (
      typeof sessionToken !== 'string' ||
      sessionToken.length === 0 ||
      sessionToken.length > SESSION_TOKEN_MAX_LENGTH ||
      !SESSION_TOKEN_PATTERN.test(sessionToken)
    ) {
      throw new ORPCError('BAD_REQUEST', {
        message: 'Malformed session token',
      })
    }
  }

  return next()
})
