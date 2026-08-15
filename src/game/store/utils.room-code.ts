import { randomInt } from 'node:crypto'

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const ROOM_CODE_LENGTH = 6

export const createRoomCode = (): string => {
  return Array.from({ length: ROOM_CODE_LENGTH })
    .map(() => ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length)])
    .join('')
}
