import type { GameCommand } from '../orchestration/commands'

import { describe, expect, it } from 'vitest'

import { authorizeCommand, stampEnteredBy } from './command-authorization'

const moderatorSession = { kind: 'MODERATOR', playerId: null } as const
const playerSession = { kind: 'PLAYER', playerId: 'p1' } as const
const strangerSession = { kind: 'PLAYER', playerId: 'p2' } as const

const seerInspect = {
  type: 'SUBMIT_NIGHT_ACTION',
  action: { type: 'SEER_INSPECT', actorId: 'p1', targetId: 'p2' },
} as const satisfies GameCommand

describe('authorizeCommand theo mode (revamp MODERATED, M2)', () => {
  it('MODERATED: quản trò được proxy submit action đêm với actorId bất kỳ', () => {
    expect(
      authorizeCommand(moderatorSession, seerInspect, 'MODERATED'),
    ).toEqual({ ok: true, value: true })
    expect(
      authorizeCommand(
        moderatorSession,
        {
          type: 'SUBMIT_NIGHT_ACTION',
          action: { type: 'SEER_INSPECT', actorId: 'p2', targetId: 'p1' },
        },
        'MODERATED',
      ),
    ).toEqual({ ok: true, value: true })
  })

  it('MODERATED: quản trò giữ trọn lệnh điều phối — confirm/skip/undo/override/vote', () => {
    const commands = [
      { type: 'CONFIRM_STEP' },
      { type: 'CONFIRM_NIGHT_RESOLUTION' },
      { type: 'CONFIRM_HUNTER_SHOT' },
      { type: 'SKIP_STEP', reason: 'Bỏ lượt' },
      { type: 'SKIP_HUNTER_SHOT' },
      { type: 'UNDO_STEP', reason: 'Bấm nhầm' },
      {
        type: 'MODERATOR_OVERRIDE_MARK_DEAD',
        playerId: 'p2',
        reason: 'Bỏ về giữa ván',
      },
      { type: 'START_VOTE' },
      { type: 'SUBMIT_VOTE_RESULT', tied: false, selectedPlayerId: 'p2' },
      { type: 'CONFIRM_VOTE_RESULT' },
    ] as const satisfies GameCommand[]
    for (const command of commands) {
      expect(authorizeCommand(moderatorSession, command, 'MODERATED')).toEqual({
        ok: true,
        value: true,
      })
    }
  })

  it('MODERATED: player bị chặn night action và consent R21', () => {
    expect(
      authorizeCommand(playerSession, seerInspect, 'MODERATED'),
    ).toMatchObject({ ok: false, error: { code: 'NOT_AUTHORIZED' } })
    expect(
      authorizeCommand(
        playerSession,
        { type: 'SUBMIT_VOTE_CONSENT', actorId: 'p1' },
        'MODERATED',
      ),
    ).toMatchObject({ ok: false, error: { code: 'NOT_AUTHORIZED' } })
  })

  it('MODERATED: player vẫn biểu quyết và Thợ săn bắn phát bắn của mình', () => {
    expect(
      authorizeCommand(
        playerSession,
        { type: 'SUBMIT_VOTE', actorId: 'p1', targetId: 'p2' },
        'MODERATED',
      ),
    ).toEqual({ ok: true, value: true })
    expect(
      authorizeCommand(
        playerSession,
        { type: 'SUBMIT_VOTE', actorId: 'p1', targetId: null },
        'MODERATED',
      ),
    ).toEqual({ ok: true, value: true })
    expect(
      authorizeCommand(
        playerSession,
        { type: 'SUBMIT_HUNTER_SHOT', actorId: 'p1', targetId: 'p2' },
        'MODERATED',
      ),
    ).toEqual({ ok: true, value: true })
    // Nhân danh người khác thì vẫn bị chặn.
    expect(
      authorizeCommand(
        strangerSession,
        { type: 'SUBMIT_VOTE', actorId: 'p1', targetId: null },
        'MODERATED',
      ),
    ).toMatchObject({ ok: false, error: { code: 'NOT_AUTHORIZED' } })
  })

  it('SELF: giữ nguyên policy cũ — player tự submit 4 lệnh, action phải là của mình', () => {
    expect(authorizeCommand(playerSession, seerInspect, 'SELF')).toEqual({
      ok: true,
      value: true,
    })
    expect(
      authorizeCommand(
        playerSession,
        { type: 'SUBMIT_VOTE_CONSENT', actorId: 'p1' },
        'SELF',
      ),
    ).toEqual({ ok: true, value: true })
    expect(
      authorizeCommand(strangerSession, seerInspect, 'SELF'),
    ).toMatchObject({ ok: false, error: { code: 'NOT_AUTHORIZED' } })
  })

  it('session player thiếu playerId bị chặn ở cả hai mode', () => {
    const anonymous = { kind: 'PLAYER', playerId: null } as const
    expect(authorizeCommand(anonymous, seerInspect, 'SELF')).toMatchObject({
      ok: false,
    })
    expect(
      authorizeCommand(
        anonymous,
        { type: 'SUBMIT_VOTE', actorId: 'p1', targetId: null },
        'MODERATED',
      ),
    ).toMatchObject({ ok: false })
  })
})

describe('stampEnteredBy (M4)', () => {
  it('đánh dấu 3 loại event action đêm, giữ nguyên event khác', () => {
    const events = [
      { type: 'NIGHT_ACTION_SUBMITTED', action: seerInspect.action },
      { type: 'NIGHT_ACTION_CONFIRMED', action: seerInspect.action },
      { type: 'HUNTER_SHOT_SUBMITTED', hunterId: 'p1', targetId: 'p2' },
      {
        type: 'SEER_RESULT_RECORDED',
        seerPlayerId: 'p1',
        targetPlayerId: 'p2',
        result: 'WEREWOLF',
      },
      { type: 'PHASE_CHANGED', from: 'NIGHT', to: 'NIGHT_RESOLUTION' },
    ] as const

    const stamped = stampEnteredBy([...events], 'MODERATOR')
    expect(
      stamped.map((event) => ('enteredBy' in event ? event.enteredBy : null)),
    ).toEqual(['MODERATOR', 'MODERATOR', 'MODERATOR', null, null])
    expect(stamped[4]).toEqual(events[4])
  })
})
