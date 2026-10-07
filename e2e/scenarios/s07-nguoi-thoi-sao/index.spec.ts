import { expect, test } from '@playwright/test'

import {
  skipUntilNightResolution,
  assignCustomComposition,
  reloadUntilVisible,
  waitForRoleOwners,
  expectDawnDeaths,
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

// S07 — Người thổi sáo mê hoặc cả bàn và thắng ở bình minh (kịch bản đầy đủ:
// e2e/scenarios/s07-nguoi-thoi-sao/scenario.md).
// Đêm 1: charm Tiên tri, Sói cắn V1; ngày 1 đếm tay loại V2; đêm 2 charm Sói
// + Sói cắn Tiên tri → mọi người sống khác đều bị mê → PIPER thắng ở bình minh.

test('Người thổi sáo mê hoặc đủ cả bàn — thắng ngay bình minh đêm 2', async ({
  browser,
}) => {
  test.setTimeout(300_000)
  const table = await createTable(browser, 5)

  try {
    await assignCustomComposition(table, [
      'PIPER',
      'WEREWOLF',
      'SEER',
      'VILLAGER',
    ])
    await startTable(table)

    const roles = await waitForRoleOwners(table.moderator.page, [
      'Người thổi sáo',
      'Ma sói',
      'Tiên tri',
      'Dân làng',
    ])
    const wolf = playerByName(table, roles.get('Ma sói')?.[0] ?? '')
    const seer = playerByName(table, roles.get('Tiên tri')?.[0] ?? '')
    const villagers = roles.get('Dân làng') ?? []
    if (villagers.length < 2) {
      throw new Error('Composition should autofill 2 villagers')
    }
    const v1 = playerByName(table, villagers[0] ?? '')
    const v2 = playerByName(table, villagers[1] ?? '')

    // ===== Đêm 1: soi V1, cắn V1, charm Tiên tri =====
    await proxyNightStep(table.moderator.page, {
      submitLabel: 'Ghi nhận lựa chọn của Tiên tri',
      targetName: v1.name,
    })
    await proxyNightStep(table.moderator.page, {
      submitLabel: 'Ghi nhận lựa chọn của Ma sói',
      targetName: v1.name,
    })
    await proxyNightStep(table.moderator.page, {
      submitLabel: 'Ghi nhận lựa chọn của Người thổi sáo',
      targetName: seer.name,
    })
    await skipUntilNightResolution(
      table.moderator.page,
      'Kịch bản e2e: đêm vắng vai',
    )
    await expectDawnDeaths(table.moderator.page, [v1.name])
    await announceDawn(table.moderator.page)

    // Notice bị mê hoặc trên thiết bị Tiên tri.
    await reloadUntilVisible(
      seer.page,
      () => seer.page.getByText('Bạn đã bị Người thổi sáo mê hoặc.'),
      30_000,
    )

    // ===== Ngày 1: đếm tay loại V2 =====
    await startVote(table.moderator.page, 4)
    await manualTally(table.moderator.page, v2.name)

    // ===== Đêm 2: soi Sói, cắn Tiên tri, charm Sói → PIPER thắng =====
    await proxyNightStep(table.moderator.page, {
      submitLabel: 'Ghi nhận lựa chọn của Tiên tri',
      targetName: wolf.name,
    })
    await expect(table.moderator.page.getByText(': SÓI')).toBeVisible()
    await proxyNightStep(table.moderator.page, {
      submitLabel: 'Ghi nhận lựa chọn của Ma sói',
      targetName: seer.name,
    })
    await proxyNightStep(table.moderator.page, {
      submitLabel: 'Ghi nhận lựa chọn của Người thổi sáo',
      targetName: wolf.name,
    })
    await skipUntilNightResolution(
      table.moderator.page,
      'Kịch bản e2e: đêm vắng vai',
    )
    await expectDawnDeaths(table.moderator.page, [seer.name])

    // Ván kết thúc tại bình minh — ngày không mở.
    await announceDawn(table.moderator.page, { gameOver: 'PIPER' })

    // Thiết bị Ma sói: banner + thẻ vai.
    await reloadUntilVisible(
      wolf.page,
      () => wolf.page.getByText('Người thổi sáo chiến thắng'),
      30_000,
    )
    await expect(wolf.page.getByText('Vai trò của bạn: Ma sói')).toBeVisible()
  } finally {
    await table.close()
  }
})
