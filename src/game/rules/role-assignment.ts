import type { Result, Role } from '../domain'

import { MVP_ROLE_COMPOSITIONS } from './mvp-settings'

type RandomIndex = (upperBound: number) => number

function secureRandomIndex(upperBound: number): number {
  const range = 2 ** 32
  const limit = range - (range % upperBound)
  const value = new Uint32Array(1)

  do crypto.getRandomValues(value)
  while ((value[0] ?? range) >= limit)

  return (value[0] ?? 0) % upperBound
}

export function getRoleComposition(playerCount: number): Result<Role[]> {
  if (playerCount !== 5 && playerCount !== 6) {
    return {
      ok: false,
      error: {
        code: 'INVALID_PLAYER_COUNT',
        message: 'MVP games require exactly 5 or 6 players',
      },
    }
  }

  return { ok: true, value: [...MVP_ROLE_COMPOSITIONS[playerCount]] }
}

export function validateRoleComposition(roles: readonly Role[]): Result<true> {
  const expected = getRoleComposition(roles.length)
  if (!expected.ok) return expected

  const sortedRoles = [...roles].sort()
  const sortedExpected = expected.value.sort()
  if (sortedRoles.some((role, index) => role !== sortedExpected[index])) {
    return {
      ok: false,
      error: {
        code: 'INVALID_ROLE_COMPOSITION',
        message: `Invalid role composition for ${roles.length} players`,
      },
    }
  }

  return { ok: true, value: true }
}

export function assignRoles(
  playerIds: readonly string[],
  randomIndex: RandomIndex = secureRandomIndex,
): Result<Map<string, Role>> {
  const composition = getRoleComposition(playerIds.length)
  if (!composition.ok) return composition

  const roles = composition.value
  for (let index = roles.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1)
    if (!Number.isInteger(swapIndex) || swapIndex < 0 || swapIndex > index) {
      throw new RangeError('randomIndex returned an out-of-range value')
    }
    ;[roles[index], roles[swapIndex]] = [roles[swapIndex], roles[index]]
  }

  return {
    ok: true,
    value: new Map(
      playerIds.map((playerId, index) => [playerId, roles[index]]),
    ),
  }
}
