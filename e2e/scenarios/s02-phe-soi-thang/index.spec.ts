import { expect, test } from '@playwright/test'

import {
  skipUntilNightResolution,
  expectGameOverEventually,
  reloadUntilVisible,
  expectDawnDeaths,
  expectPlayerDead,
  skipUntilStep,
  announceDawn,
  hunterShoot,
  manualTally,
  startVote,
} from '../../fixtures/scenario'
import {
  findRoleOwners,
  proxyNightStep,
  playerByName,
  createTable,
  startTable,
} from '../../fixtures/table'

// S02 — Phe Sói thắng và phát súng cuối của Thợ săn (kịch bản đầy đủ:
// e2e/scenarios/s02-phe-soi-thang/scenario.md).
// Làng bỏ vệ toàn bộ đêm 1 rồi treo phiếu sai liên tục; Thợ săn bị đếm tay
// loại nhưng bắn trúng Sói 1 qua thiết bị; Sói 2 gieo rắc tới khi cân số người
// còn sống → "Phe Ma sói chiến thắng".

test('Làng treo phiếu sai liên tục — Sói thắng, Thợ săn kéo một Sói theo', async ({
  browser,
}) => {
  test.setTimeout(420_000)
  const table = await createTable(browser, 8)

  try {
    await startTable(table)

    const roles = await findRoleOwners(table.moderator.page)
    const [wolf1Name, wolf2Name] = roles.get('Ma sói') ?? []
    const seer = playerByName(table, roles.get('Tiên tri')?.[0] ?? '')
    const witch = playerByName(table, roles.get('Phù thủy')?.[0] ?? '')
    const hunter = playerByName(table, roles.get('Thợ săn')?.[0] ?? '')
    const [villagerAName, villagerBName] = roles.get('Dân làng') ?? []
    if (!wolf1Name || !wolf2Name || !villagerAName || !villagerBName) {
      throw new Error('Composition is missing wolves or villagers')
    }
    const wolf1 = playerByName(table, wolf1Name)
    const wolf2 = playerByName(table, wolf2Name)
    const villagerA = playerByName(table, villagerAName)
    const villagerB = playerByName(table, villagerBName)

    // ===== Đêm 1: cả bàn bỏ vệ =====
    await skipUntilNightResolution(
      table.moderator.page,
      'Kịch bản e2e: bàn không hành động',
    )
    await expectDawnDeaths(table.moderator.page, [])
    await announceDawn(table.moderator.page)

    // ===== Ngày 1: mở biểu quyết rồi đếm tay loại oan Thợ săn =====
    await startVote(table.moderator.page, 8)
    await manualTally(table.moderator.page, hunter.name)
    await hunterShoot(hunter, wolf1.name, table.moderator.page)
    await expectPlayerDead(table.moderator.page, hunter.name)
    await expectPlayerDead(table.moderator.page, wolf1.name)

    // ===== Đêm 2: bỏ qua vai làng, Sói 2 cắn Dân A (step Thợ săn tự skip) =====
    await skipUntilStep(
      table.moderator.page,
      'Ma sói tấn công',
      'Kịch bản e2e: phe làng hoang mang',
    )
    await proxyNightStep(table.moderator.page, {
      submitLabel: 'Ghi nhận lựa chọn của Ma sói',
      targetName: villagerA.name,
    })
    await skipUntilNightResolution(
      table.moderator.page,
      'Kịch bản e2e: phe làng hoang mang',
    )
    await expectDawnDeaths(table.moderator.page, [villagerA.name])
    await announceDawn(table.moderator.page)

    // ===== Ngày 2: treo tiếp =====
    await startVote(table.moderator.page, 5)
    await manualTally(table.moderator.page, villagerB.name)

    // ===== Đêm 3: cắn Phù thủy =====
    await skipUntilStep(
      table.moderator.page,
      'Ma sói tấn công',
      'Kịch bản e2e: phe làng hoang mang',
    )
    await proxyNightStep(table.moderator.page, {
      submitLabel: 'Ghi nhận lựa chọn của Ma sói',
      targetName: witch.name,
    })
    await skipUntilNightResolution(
      table.moderator.page,
      'Kịch bản e2e: phe làng hoang mang',
    )
    await expectDawnDeaths(table.moderator.page, [witch.name])
    await announceDawn(table.moderator.page)

    // ===== Ngày 3: treo Tiên tri → Sói 2 cân số người sống → Sói thắng =====
    await startVote(table.moderator.page, 3)
    await manualTally(table.moderator.page, seer.name)
    await expectGameOverEventually(table.moderator.page, 'WEREWOLF')

    // Thiết bị của Sói 2: phe mình thắng, vai lộ ra.
    await reloadUntilVisible(
      wolf2.page,
      () => wolf2.page.getByText('Phe Ma sói chiến thắng'),
      30_000,
    )
    await expect(wolf2.page.getByText('Sự thật được lộ ra')).toBeVisible()
    await expect(wolf2.page.getByText('Vai trò của bạn: Ma sói')).toBeVisible()
  } finally {
    await table.close()
  }
})
