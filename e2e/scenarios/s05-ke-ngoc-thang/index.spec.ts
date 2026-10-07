import { expect, test } from '@playwright/test'

import {
  skipUntilNightResolution,
  expectGameOverEventually,
  assignCustomComposition,
  confirmVoteResolution,
  reloadUntilVisible,
  waitForRoleOwners,
  expectDawnDeaths,
  deviceVoteAll,
  announceDawn,
  startVote,
} from '../../fixtures/scenario'
import {
  proxyNightStep,
  playerByName,
  createTable,
  startTable,
} from '../../fixtures/table'

// S05 — Kẻ Ngốc bị biểu quyết loại và thắng một mình (kịch bản đầy đủ:
// e2e/scenarios/s05-ke-ngoc-thang/scenario.md).
// Tiên tri soi Ngốc ra NGƯỜI; làng loại ngốc ngay ngày 1 → "Thằng ngốc
// chiến thắng" dù Sói còn sống.

test('Làng vote loại Ngốc — Ngốc thắng một mình ngay tại chỗ', async ({
  browser,
}) => {
  test.setTimeout(240_000)
  const table = await createTable(browser, 5)

  try {
    await assignCustomComposition(table, [
      'FOOL',
      'WEREWOLF',
      'SEER',
      'WITCH',
      'VILLAGER',
    ])
    await startTable(table)

    const roles = await waitForRoleOwners(table.moderator.page, [
      'Thằng ngốc',
      'Ma sói',
      'Tiên tri',
      'Phù thủy',
      'Dân làng',
    ])
    const fool = playerByName(table, roles.get('Thằng ngốc')?.[0] ?? '')
    const wolf = playerByName(table, roles.get('Ma sói')?.[0] ?? '')
    const seer = playerByName(table, roles.get('Tiên tri')?.[0] ?? '')
    const witch = playerByName(table, roles.get('Phù thủy')?.[0] ?? '')
    const [villagerName] = roles.get('Dân làng') ?? []
    if (!villagerName) throw new Error('Composition is missing the villager')
    const villager = playerByName(table, villagerName)

    // ===== Đêm 1: soi Ngốc ra NGƯỜI, Sói cắn Dân =====
    await proxyNightStep(table.moderator.page, {
      submitLabel: 'Ghi nhận lựa chọn của Tiên tri',
      targetName: fool.name,
    })
    await expect(table.moderator.page.getByText(': NGƯỜI')).toBeVisible()
    await proxyNightStep(table.moderator.page, {
      submitLabel: 'Ghi nhận lựa chọn của Ma sói',
      targetName: villager.name,
    })
    await skipUntilNightResolution(
      table.moderator.page,
      'Kịch bản e2e: Phù thủy chưa dùng bình',
    )
    await expectDawnDeaths(table.moderator.page, [villager.name])
    await announceDawn(table.moderator.page)

    // ===== Ngày 1: 2/4 lá loại Ngốc → Ngốc thắng tức thì =====
    await startVote(table.moderator.page, 4)
    await deviceVoteAll(table.moderator.page, [
      { voter: seer, targetName: fool.name },
      { voter: witch, targetName: fool.name },
      { voter: wolf, targetName: seer.name },
      { voter: fool, targetName: witch.name },
    ])
    await confirmVoteResolution(table.moderator.page)
    await expectGameOverEventually(table.moderator.page, 'FOOL')

    // Thiết bị Phù thủy (đại diện người thua): cùng banner + thẻ vai.
    await reloadUntilVisible(
      witch.page,
      () => witch.page.getByText('Thằng ngốc chiến thắng'),
      30_000,
    )
    await expect(witch.page.getByText('Sự thật được lộ ra')).toBeVisible()
    await expect(
      witch.page.getByText('Vai trò của bạn: Phù thủy'),
    ).toBeVisible()
  } finally {
    await table.close()
  }
})
