import type { NightAction } from '../rules/night-actions'

export type GameCommand =
  | { type: 'SUBMIT_NIGHT_ACTION'; action: NightAction }
  | { type: 'CONFIRM_STEP' }
  | { type: 'REJECT_STEP'; reason: string }
  | { type: 'SKIP_STEP'; reason: string }
  | { type: 'CONFIRM_NIGHT_RESOLUTION' }
  | { type: 'START_VOTE' }
  | {
      type: 'SUBMIT_VOTE_RESULT'
      tied: boolean
      selectedPlayerId: string | null
    }
  | { type: 'CONFIRM_VOTE_RESULT' }
