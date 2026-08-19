import type {
  domainErrorCodeSchema,
  domainErrorSchema,
  gamePhaseSchema,
  playerSchema,
  queueStepSchema,
  roleSchema,
  teamSchema,
  winnerSchema,
  witchResourcesSchema,
  alphaWerewolfResourcesSchema,
  elderResourcesSchema,
} from './schema'
import type { z } from 'zod'

// Runtime schemas là source of truth; domain types được suy ra tự động.
// Khi schema đổi, TypeScript buộc mọi consumer liên quan cập nhật theo.
export type Role = z.infer<typeof roleSchema>
export type Team = z.infer<typeof teamSchema>
export type Winner = z.infer<typeof winnerSchema>
export type GamePhase = z.infer<typeof gamePhaseSchema>
export type QueueStep = z.infer<typeof queueStepSchema>
export type WitchResources = z.infer<typeof witchResourcesSchema>
export type AlphaWerewolfResources = z.infer<
  typeof alphaWerewolfResourcesSchema
>
export type ElderResources = z.infer<typeof elderResourcesSchema>
export type Player = z.infer<typeof playerSchema>
export type DomainErrorCode = z.infer<typeof domainErrorCodeSchema>
export type DomainError = z.infer<typeof domainErrorSchema>

// Result<T> là control-flow type nội bộ và không nhận dữ liệu trực tiếp từ IO.
// Vì vậy nó vẫn là generic TypeScript type thay vì một schema cố định.
export type Result<T> =
  { ok: true; value: T } | { ok: false; error: DomainError }

export function getRoleTeam(role: Role): Team {
  return isWerewolfRole(role) ? 'WEREWOLF' : 'VILLAGE'
}

export function isWerewolfRole(role: Role | null | undefined): boolean {
  return role === 'WEREWOLF' || role === 'ALPHA_WEREWOLF'
}
