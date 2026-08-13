import { healthContract } from './contract.health'
import { lobbyContract } from './contract.lobby'

export const appContract = {
  health: healthContract,
  lobby: lobbyContract,
}
