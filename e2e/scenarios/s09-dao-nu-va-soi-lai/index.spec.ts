import { expect, test } from '@playwright/test'

import {
  expectDawnHybridConversion,
  expectGameOverEventually,
  skipUntilNightResolution,
  assignCustomComposition,
  confirmVoteResolution,
  reloadUntilVisible,
  waitForRoleOwners,
  expectDawnDeaths,
  proxyWitchStep,
  deviceVoteAll,
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

// S09 — Kỹ nữ đến thăm nhầm Sói và Sói Lai bị cắn chuyển phe (kịch bản đầy
// đủ: e2e/scenarios/s09-dao-nu-va-soi-lai/scenario.md).
// Đêm 1: soi Sói Lai ra NGƯỜI, Kỹ nữ thăm Sói → chết, Sói cắn Sói Lai →
// chuyển hóa bí mật; ngày 1 đếm tay loại Sói 1; đêm 2 soi lại ra SÓI + độc
// Sói 2; ngày 2 vote thiết bị loại Sói Lai → làng thắng.

test('Kỹ nữ thăm Sói chết, Sói Lai bị cắn chuyển phe — làng thắng', async ({
  browser,
}) => {
  test.setTimeout(420_000)
  const table = await createTable(browser, 7)

  try {
    await assignCustomComposition(table, [
      'WEREWOLF',
      'COURTESAN',
      'HYBRID_WOLF',
      'SEER',
      'WITCH',
      'VILLAGER',
    ])
    await startTable(table)

    const roles = await waitForRoleOwners(table.moderator.page, [
      'Ma sói',
      'Kỹ nữ',
      'Sói Lai',
      'Tiên tri',
      'Phù thủy',
      'Dân làng',
    ])
    const wolves = roles.get('Ma sói') ?? []
    if (wolves.length < 2) {
      throw new Error('Composition should backfill to 2 wolves')
    }
    const wolf1 = playerByName(table, wolves[0] ?? '')
    const wolf2 = playerByName(table, wolves[1] ?? '')
    const courtesan = playerByName(table, roles.get('Kỹ nữ')?.[0] ?? '')
    const seer = playerByName(table, roles.get('Tiên tri')?.[0] ?? '')
    const witch = playerByName(table, roles.get('Phù thủy')?.[0] ?? '')
    const hybrid = playerByName(table, roles.get('Sói Lai')?.[0] ?? '')
    const [villagerName] = roles.get('Dân làng') ?? []
    if (!villagerName) throw new Error('Composition is missing the villager')
    const villager = playerByName(table, villagerName)

    // ===== Đêm 1: soi Sói Lai (NGƯỜI), Kỹ nữ thăm Sói, cắn Sói Lai =====
    await proxyNightStep(table.moderator.page, {
      submitLabel: 'Ghi nhận lựa chọn của Tiên tri',
      targetName: hybrid.name,
    })
    await expect(table.moderator.page.getByText(': NGƯỜI')).toBeVisible()
    await proxyNightStep(table.moderator.page, {
      submitLabel: 'Ghi nhận lựa chọn của Kỹ nữ',
      targetName: wolf1.name,
    })
    await proxyNightStep(table.moderator.page, {
      submitLabel: 'Ghi nhận lựa chọn của Ma sói',
      targetName: hybrid.name,
    })
    // Không độc Ma sói 1 cùng đêm thì Sói Lai chuyển hóa đưa phe Sói lên cân
    // số người làng → Sói thắng ngay tại bình minh.
    await proxyWitchStep(table.moderator.page, { poisonTargetName: wolf1.name })
    await skipUntilNightResolution(
      table.moderator.page,
      'Kịch bản e2e: Phù thủy đã dùng bình độc',
    )
    // Hai cái chết cùng đêm: Kỹ nữ thăm trúng Sói + Ma sói 1 dính bình độc.
    await expectDawnDeaths(table.moderator.page, [courtesan.name, wolf1.name])
    await expectDawnHybridConversion(table.moderator.page, hybrid.name)
    await announceDawn(table.moderator.page)

    // Notice chuyển hóa trên thiết bị Sói Lai.
    await reloadUntilVisible(
      hybrid.page,
      () =>
        hybrid.page.getByText('Bạn đã bị cắn và chuyển sang phe Ma sói.', {
          exact: false,
        }),
      30_000,
    )

    // ===== Ngày 1: đếm tay loại Ma sói 2 =====
    await startVote(table.moderator.page, 5)
    await manualTally(table.moderator.page, wolf2.name)

    // ===== Đêm 2: soi lại Sói Lai (SÓI), đàn mới cắn Dân, độc Sói 2 =====
    await proxyNightStep(table.moderator.page, {
      submitLabel: 'Ghi nhận lựa chọn của Tiên tri',
      targetName: hybrid.name,
    })
    await expect(table.moderator.page.getByText(': SÓI')).toBeVisible()
    await proxyNightStep(table.moderator.page, {
      submitLabel: 'Ghi nhận lựa chọn của Ma sói',
      targetName: villager.name,
    })
    await skipUntilNightResolution(
      table.moderator.page,
      'Kịch bản e2e: Phù thủy hết bình độc',
    )
    await expectDawnDeaths(table.moderator.page, [villager.name])
    await announceDawn(table.moderator.page)

    // Sổ tay Tiên tri: hai dòng soi cùng Sói Lai (trước + sau chuyển hóa).
    await seer.page.reload()
    await seer.page.getByRole('button', { name: /Sổ tay của vai bạn/ }).click()
    await expect(
      seer.page.getByRole('button', { name: `Soi · ${hybrid.name}` }),
    ).toHaveCount(2)

    // ===== Ngày 2: vote thiết bị loại Sói Lai → làng thắng =====
    await startVote(table.moderator.page, 3)
    await deviceVoteAll(table.moderator.page, [
      { voter: seer, targetName: hybrid.name },
      { voter: witch, targetName: hybrid.name },
      { voter: hybrid, targetName: seer.name },
    ])
    await confirmVoteResolution(table.moderator.page)
    await expectGameOverEventually(table.moderator.page, 'VILLAGE')
  } finally {
    await table.close()
  }
})
