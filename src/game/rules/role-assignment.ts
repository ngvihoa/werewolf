import type { Result, Role, RoleCompositionSelection } from '../domain'

import { MVP_ROLE_COMPOSITIONS } from './mvp-settings'

type RandomIndex = (upperBound: number) => number

const NO_VILLAGER_REPLACEMENT_PRIORITY: readonly Role[] = [
  'WITCH',
  'PROTECTOR',
  'HUNTER',
  'ELDER',
  'FOOL',
  'PIPER',
  'CUPID',
  'COURTESAN',
  'HYBRID_WOLF',
  'ALPHA_WEREWOLF',
]

function secureRandomIndex(upperBound: number): number {
  const range = 2 ** 32
  const limit = range - (range % upperBound)
  const value = new Uint32Array(1)

  do crypto.getRandomValues(value)
  while ((value[0] ?? range) >= limit)

  return (value[0] ?? 0) % upperBound
}

export function getRoleComposition(playerCount: number): Result<Role[]> {
  if (playerCount < 5 || playerCount > 15) {
    return {
      ok: false,
      error: {
        code: 'INVALID_PLAYER_COUNT',
        message: 'Games require between 5 and 15 players',
      },
    }
  }

  const composition =
    MVP_ROLE_COMPOSITIONS[playerCount as keyof typeof MVP_ROLE_COMPOSITIONS]
  return { ok: true, value: [...composition] }
}

export function resolveRoleComposition(
  playerCount: number,
  selection: RoleCompositionSelection = { mode: 'DEFAULT' },
): Result<Role[]> {
  const defaultComposition = getRoleComposition(playerCount)
  if (!defaultComposition.ok) return defaultComposition
  if (selection.mode === 'DEFAULT') return defaultComposition

  if (selection.mode === 'NO_VILLAGER') {
    if (playerCount === 15) {
      return invalidComposition(
        'No-villager composition is unavailable for 15 players',
      )
    }

    const roles: Role[] = defaultComposition.value.filter(
      (role) => role !== 'VILLAGER',
    )
    const replacements = NO_VILLAGER_REPLACEMENT_PRIORITY.filter(
      (role) => !roles.includes(role),
    )
    while (roles.length < playerCount) {
      const replacement = replacements.shift()
      if (!replacement) {
        return invalidComposition(
          'No unique role is available to replace Villager',
        )
      }
      roles.push(replacement)
    }
    return { ok: true, value: roles }
  }

  if (selection.roles.length > playerCount) {
    return invalidComposition('Selected roles exceed the player count')
  }
  const duplicateSpecialRole = selection.roles.find((role, index, roles) => {
    return (
      role !== 'VILLAGER' &&
      role !== 'WEREWOLF' &&
      roles.indexOf(role) !== index
    )
  })
  if (duplicateSpecialRole) {
    return invalidComposition(
      `${duplicateSpecialRole} can only be selected once`,
    )
  }

  const roles = [...selection.roles]
  const defaultWerewolfCount = defaultComposition.value.filter(
    (role) => role === 'WEREWOLF' || role === 'ALPHA_WEREWOLF',
  ).length
  const selectedWerewolfCount = roles.filter(
    (role) => role === 'WEREWOLF' || role === 'ALPHA_WEREWOLF',
  ).length
  const missingWerewolves = Math.min(
    defaultWerewolfCount - selectedWerewolfCount,
    playerCount - roles.length,
  )
  roles.push(...Array<Role>(Math.max(0, missingWerewolves)).fill('WEREWOLF'))
  roles.push(...Array<Role>(playerCount - roles.length).fill('VILLAGER'))
  return { ok: true, value: roles }
}

export function validateRoleComposition(roles: readonly Role[]): Result<true> {
  const supportedCount = getRoleComposition(roles.length)
  if (!supportedCount.ok) return supportedCount
  const duplicateSpecialRole = roles.find((role, index) => {
    return (
      role !== 'VILLAGER' &&
      role !== 'WEREWOLF' &&
      roles.indexOf(role) !== index
    )
  })
  if (duplicateSpecialRole) {
    return invalidComposition(`${duplicateSpecialRole} can only appear once`)
  }

  return { ok: true, value: true }
}

export function assignRoles(
  playerIds: readonly string[],
  selection: RoleCompositionSelection = { mode: 'DEFAULT' },
  randomIndex: RandomIndex = secureRandomIndex,
): Result<Map<string, Role>> {
  const composition = resolveRoleComposition(playerIds.length, selection)
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

function invalidComposition(message: string): Result<never> {
  return {
    ok: false,
    error: { code: 'INVALID_ROLE_COMPOSITION', message },
  }
}
