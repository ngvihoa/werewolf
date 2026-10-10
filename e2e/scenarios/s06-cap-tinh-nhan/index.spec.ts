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

// S06 — Cặp tình nhân của Thần tình yêu thắng ở final 2 (kịch bản đầy đủ:
// e2e/scenarios/s06-cap-tinh-nhan/scenario.md).
// Cupid ghép Sói + Dân V1; làng mất Tiên tri (đêm 1), V2 (ngày 1), V3 (đêm 2);
// ngày 2 loại Thần tình yêu → final 2 là cặp đôi khác phe → LOVERS thắng.

test('Cupid ghép Sói với Dân — cặp tình nhân thắng ở final 2', async ({
  browser,
}) => {
  test.setTimeout(300_000)
  const table = await createTable(browser, 6)

  try {
    await assignCustomComposition(table, [
      'CUPID',
      'WEREWOLF',
      'SEER',
      'VILLAGER',
    ])
    await startTable(table)

    const roles = await waitForRoleOwners(table.moderator.page, [
      'Thần tình yêu',
      'Ma sói',
      'Tiên tri',
      'Dân làng',
    ])
    const cupid = playerByName(table, roles.get('Thần tình yêu')?.[0] ?? '')
    const wolf = playerByName(table, roles.get('Ma sói')?.[0] ?? '')
    const seer = playerByName(table, roles.get('Tiên tri')?.[0] ?? '')
    const villagers = roles.get('Dân làng') ?? []
    if (villagers.length < 3) {
      throw new Error('Composition should autofill 3 villagers')
    }
    const [loverVillagerName, v2Name, v3Name] = villagers
    const loverVillager = playerByName(table, loverVillagerName ?? '')
    const v2 = playerByName(table, v2Name ?? '')
    const v3 = playerByName(table, v3Name ?? '')

    // ===== Đêm 1: ghép đôi Sói + V1, cắn Tiên tri =====
    await proxyNightStep(table.moderator.page, {
      submitLabel: 'Ghi nhận lựa chọn của Thần tình yêu',
      targetName: wolf.name,
      secondTargetName: loverVillager.name,
    })
    // Notice riêng tư trên thiết bị cả hai tình nhân.
    await reloadUntilVisible(
      loverVillager.page,
      () => loverVillager.page.getByText(`Tình nhân của bạn là ${wolf.name}`),
      30_000,
    )
    await proxyNightStep(table.moderator.page, {
      submitLabel: 'Ghi nhận lựa chọn của Tiên tri',
      targetName: wolf.name,
    })
    await expect(table.moderator.page.getByText(': SÓI')).toBeVisible()
    await proxyNightStep(table.moderator.page, {
      submitLabel: 'Ghi nhận lựa chọn của Ma sói',
      targetName: seer.name,
    })
    await skipUntilNightResolution(
      table.moderator.page,
      'Kịch bản e2e: đêm vắng vai',
    )
    await expectDawnDeaths(table.moderator.page, [seer.name])
    await announceDawn(table.moderator.page)

    // ===== Ngày 1: loại V2 =====
    await startVote(table.moderator.page, 5)
    await deviceVoteAll(table.moderator.page, [
      { voter: cupid, targetName: v2.name },
      { voter: loverVillager, targetName: v2.name },
      { voter: v3, targetName: v2.name },
      { voter: v2, targetName: cupid.name },
      { voter: wolf, targetName: v3.name },
    ])
    await confirmVoteResolution(table.moderator.page)

    // ===== Đêm 2: cắn V3 =====
    await proxyNightStep(table.moderator.page, {
      submitLabel: 'Ghi nhận lựa chọn của Ma sói',
      targetName: v3.name,
    })
    await skipUntilNightResolution(
      table.moderator.page,
      'Kịch bản e2e: đêm vắng vai',
    )
    await expectDawnDeaths(table.moderator.page, [v3.name])
    await announceDawn(table.moderator.page)

    // ===== Ngày 2: loại Thần tình yêu → final 2 là cặp đôi → LOVERS thắng =====
    await startVote(table.moderator.page, 3)
    await deviceVoteAll(table.moderator.page, [
      { voter: wolf, targetName: cupid.name },
      { voter: loverVillager, targetName: cupid.name },
      { voter: cupid, targetName: wolf.name },
    ])
    await confirmVoteResolution(table.moderator.page)
    await expectGameOverEventually(table.moderator.page, 'LOVERS')

    // Cả hai thiết bị tình nhân đều thấy thắng của mình.
    for (const lover of [wolf, loverVillager]) {
      await reloadUntilVisible(
        lover.page,
        () => lover.page.getByText('Cặp tình nhân chiến thắng'),
        30_000,
      )
      await expect(lover.page.getByText('Sự thật được lộ ra')).toBeVisible()
    }
  } finally {
    await table.close()
  }
})
