import type { Role } from '../domain'

export const MVP_ROLE_COMPOSITIONS = {
  5: ['WEREWOLF', 'SEER', 'VILLAGER', 'VILLAGER', 'VILLAGER'],
  6: ['WEREWOLF', 'SEER', 'WITCH', 'VILLAGER', 'VILLAGER', 'VILLAGER'],
} as const satisfies Record<5 | 6, readonly Role[]>

export const MVP_SETTINGS = {
  revealRoleOnDeath: false,
  seerResult: 'TEAM_ALIGNMENT',
  voteTie: 'REVOTE_ONCE',
  witchCanSelfHeal: true,
  witchCanUseBothPotions: true,
  witchCanSelfPoison: false,
} as const
