import { expect, test } from '@playwright/test'

import {
  skipUntilNightResolution,
  expectGameOverEventually,
  assignCustomComposition,
  reloadUntilVisible,
  waitForRoleOwners,
  expectDawnDeaths,
  expectPlayerDead,
  proxyWitchStep,
  skipUntilStep,
  announceDawn,
  manualTally,
  startVote,
} from '../../fixtures/scenario'
import {
  proxyNightStep,
  playerByName,
  createTable,
  startTable,
} from '../../fixtures/table'

// S08 — Sói Trắng phản bội đàn và thắng khi sống sót một mình (kịch bản đầy
// đủ: e2e/scenarios/s08-soi-trang-phan-boi/scenario.md).
// Đêm 1: Sói Trắng giết Ma sói, Phù thủy cứu nạn nhân cắn → Sói thường rỗng,
// ván tiếp diễn (gate win-condition); 4 ngày đếm tay lần lượt → Sói Trắng
// sống sót một mình → WHITE_WOLF thắng.

test('Sói Trắng phản bội đàn, sống sót một mình — Sói Trắng chiến thắng', async ({
  browser,
}) => {
  test.setTimeout(480_000)
  const table = await createTable(browser, 7)

  try {
    await assignCustomComposition(table, [
      'WEREWOLF',
      'WHITE_WOLF',
      'SEER',
      'WITCH',
      'HUNTER',
      'VILLAGER',
    ])
    await startTable(table)

    const roles = await waitForRoleOwners(table.moderator.page, [
      'Ma sói',
      'Sói Trắng',
      'Tiên tri',
      'Phù thủy',
      'Thợ săn',
      'Dân làng',
    ])
    const werewolf = playerByName(table, roles.get('Ma sói')?.[0] ?? '')
    const whiteWolf = playerByName(table, roles.get('Sói Trắng')?.[0] ?? '')
    const seer = playerByName(table, roles.get('Tiên tri')?.[0] ?? '')
    const witch = playerByName(table, roles.get('Phù thủy')?.[0] ?? '')
    const hunter = playerByName(table, roles.get('Thợ săn')?.[0] ?? '')
    const villagers = roles.get('Dân làng') ?? []
    if (villagers.length < 2) {
      throw new Error('Composition should autofill 2 villagers')
    }
    const v1 = playerByName(table, villagers[0] ?? '')
    const v2 = playerByName(table, villagers[1] ?? '')

    // ===== Đêm 1: phản bội — Sói Trắng giết Ma sói, Phù thủy cứu V1 =====
    await proxyNightStep(table.moderator.page, {
      submitLabel: 'Ghi nhận lựa chọn của Thợ săn',
      targetName: v1.name,
    })
    await proxyNightStep(table.moderator.page, {
      submitLabel: 'Ghi nhận lựa chọn của Tiên tri',
      targetName: whiteWolf.name,
    })
    await expect(table.moderator.page.getByText(': SÓI')).toBeVisible()
    await proxyNightStep(table.moderator.page, {
      submitLabel: 'Ghi nhận lựa chọn của Ma sói',
      targetName: v1.name,
    })
    await proxyNightStep(table.moderator.page, {
      submitLabel: 'Ghi nhận lựa chọn của Sói Trắng',
      targetName: werewolf.name,
    })
    await proxyWitchStep(table.moderator.page, { heal: true })

    await skipUntilNightResolution(
      table.moderator.page,
      'Kịch bản e2e: hết vai hành động',
    )
    await expectDawnDeaths(table.moderator.page, [werewolf.name])
    await announceDawn(table.moderator.page)

    // Sói thường đã chết hết nhưng Sói Trắng còn sống — ván PHẢI tiếp diễn.
    await expect(
      table.moderator.page.getByRole('heading', {
        name: 'Mở thảo luận ban ngày',
      }),
    ).toBeVisible()
    await expectPlayerDead(table.moderator.page, werewolf.name)

    // ===== Ngày 1 → Đêm 2: rệu rã dần =====
    await startVote(table.moderator.page, 6)
    await manualTally(table.moderator.page, v1.name)

    await skipUntilStep(
      table.moderator.page,
      'Phù thủy hành động',
      'Kịch bản e2e: hết vai hành động',
    )
    await proxyWitchStep(table.moderator.page, {
      poisonTargetName: hunter.name,
    })
    await skipUntilNightResolution(
      table.moderator.page,
      'Kịch bản e2e: hết vai hành động',
    )
    await expectDawnDeaths(table.moderator.page, [hunter.name])
    await announceDawn(table.moderator.page)

    // ===== Ngày 2 → Đêm 3: không ai chết =====
    await startVote(table.moderator.page, 4)
    await manualTally(table.moderator.page, seer.name)

    await skipUntilStep(
      table.moderator.page,
      'Phù thủy hành động',
      'Kịch bản e2e: hết vai hành động',
    )
    await skipUntilNightResolution(
      table.moderator.page,
      'Kịch bản e2e: hết vai hành động',
    )
    await expectDawnDeaths(table.moderator.page, [])
    await announceDawn(table.moderator.page)

    // ===== Ngày 3 → Đêm 4: =====
    await startVote(table.moderator.page, 3)
    await manualTally(table.moderator.page, v2.name)

    await skipUntilStep(
      table.moderator.page,
      'Phù thủy hành động',
      'Kịch bản e2e: hết vai hành động',
    )
    await skipUntilNightResolution(
      table.moderator.page,
      'Kịch bản e2e: hết vai hành động',
    )
    await expectDawnDeaths(table.moderator.page, [])
    await announceDawn(table.moderator.page)

    // ===== Ngày 4: loại Phù thủy → Sói Trắng sống sót một mình =====
    await startVote(table.moderator.page, 2)
    await manualTally(table.moderator.page, witch.name)
    await expectGameOverEventually(table.moderator.page, 'WHITE_WOLF')

    await reloadUntilVisible(
      whiteWolf.page,
      () => whiteWolf.page.getByText('Sói Trắng chiến thắng'),
      30_000,
    )
    await expect(
      whiteWolf.page.getByText('Vai trò của bạn: Sói Trắng'),
    ).toBeVisible()
  } finally {
    await table.close()
  }
})
