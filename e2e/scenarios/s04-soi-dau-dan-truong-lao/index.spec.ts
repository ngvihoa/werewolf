import { expect, test } from '@playwright/test'

import {
  skipUntilNightResolution,
  expectGameOverEventually,
  assignCustomComposition,
  proxyAlphaEnhancedStep,
  confirmVoteResolution,
  waitForRoleOwners,
  expectDawnDeaths,
  manualTallyTied,
  deviceVoteAll,
  skipUntilStep,
  announceDawn,
  startVote,
} from '../../fixtures/scenario'
import {
  proxyNightStep,
  playerByName,
  createTable,
  startTable,
} from '../../fixtures/table'

// S04 — Sói Đầu Đàn cắn xuyên bảo vệ và Già làng sống qua lần cắn đầu
// (kịch bản đầy đủ: e2e/scenarios/s04-soi-dau-dan-truong-lao/scenario.md).
// Composition CUSTOM 7 vai: đêm 1 đòn thường bị chặn; đêm 2 đòn xuyên bảo vệ
// vẫn không hạ Già làng (passive lần đầu); đêm 3 Già làng chết; ngày 3 làng
// vote thiết bị loại Sói Đầu Đàn.

test('Sói Đầu Đàn xuyên bảo vệ, Già làng sống lần cắn đầu — làng thắng', async ({
  browser,
}) => {
  test.setTimeout(420_000)
  const table = await createTable(browser, 7)

  try {
    await assignCustomComposition(table, [
      'ALPHA_WEREWOLF',
      'SEER',
      'WITCH',
      'PROTECTOR',
      'HUNTER',
      'ELDER',
      'VILLAGER',
    ])
    await startTable(table)

    const roles = await waitForRoleOwners(table.moderator.page, [
      'Sói Đầu Đàn',
      'Tiên tri',
      'Phù thủy',
      'Bảo vệ',
      'Thợ săn',
      'Già làng',
      'Dân làng',
    ])
    const alpha = playerByName(table, roles.get('Sói Đầu Đàn')?.[0] ?? '')
    const seer = playerByName(table, roles.get('Tiên tri')?.[0] ?? '')
    const witch = playerByName(table, roles.get('Phù thủy')?.[0] ?? '')
    const hunter = playerByName(table, roles.get('Thợ săn')?.[0] ?? '')
    const protector = playerByName(table, roles.get('Bảo vệ')?.[0] ?? '')
    const elder = playerByName(table, roles.get('Già làng')?.[0] ?? '')
    const [villagerName] = roles.get('Dân làng') ?? []
    if (!villagerName) throw new Error('Composition is missing the villager')
    const villager = playerByName(table, villagerName)

    // ===== Đêm 1: đòn thường bị Bảo vệ chặn =====
    await proxyNightStep(table.moderator.page, {
      submitLabel: 'Ghi nhận lựa chọn của Thợ săn',
      targetName: villager.name,
    })
    await proxyNightStep(table.moderator.page, {
      submitLabel: 'Ghi nhận lựa chọn của Bảo vệ',
      targetName: villager.name,
    })
    await proxyNightStep(table.moderator.page, {
      submitLabel: 'Ghi nhận lựa chọn của Tiên tri',
      targetName: alpha.name,
    })
    await expect(table.moderator.page.getByText(': SÓI')).toBeVisible()
    await proxyNightStep(table.moderator.page, {
      submitLabel: 'Ghi nhận lựa chọn của Ma sói',
      targetName: villager.name,
    })
    await skipUntilNightResolution(
      table.moderator.page,
      'Kịch bản e2e: Phù thủy chưa dùng bình',
    )
    await expectDawnDeaths(table.moderator.page, [])
    await announceDawn(table.moderator.page)
    // Ngày bế tắc — làng không chốt được ai, về đêm không có loại trừ.
    await startVote(table.moderator.page, 7)
    await manualTallyTied(table.moderator.page)

    // ===== Đêm 2: cắn xuyên bảo vệ — Già làng sống nhờ lần cắn đầu =====
    await proxyNightStep(table.moderator.page, {
      submitLabel: 'Ghi nhận lựa chọn của Thợ săn',
      targetName: villager.name,
    })
    await proxyNightStep(table.moderator.page, {
      submitLabel: 'Ghi nhận lựa chọn của Bảo vệ',
      targetName: elder.name,
    })
    await skipUntilStep(
      table.moderator.page,
      'Ma sói tấn công',
      'Kịch bản e2e: Tiên tri giữ thông tin',
    )
    await proxyAlphaEnhancedStep(table.moderator.page, elder.name)
    await skipUntilNightResolution(
      table.moderator.page,
      'Kịch bản e2e: Phù thủy chưa dùng bình',
    )
    await expectDawnDeaths(table.moderator.page, [])
    await announceDawn(table.moderator.page)
    // Ngày 2 vẫn bế tắc — về đêm tiếp.
    await startVote(table.moderator.page, 7)
    await manualTallyTied(table.moderator.page)

    // ===== Đêm 3: lần cắn thứ hai hạ Già làng =====
    await proxyNightStep(table.moderator.page, {
      submitLabel: 'Ghi nhận lựa chọn của Thợ săn',
      targetName: villager.name,
    })
    await proxyNightStep(table.moderator.page, {
      submitLabel: 'Ghi nhận lựa chọn của Bảo vệ',
      targetName: seer.name,
    })
    await proxyNightStep(table.moderator.page, {
      submitLabel: 'Ghi nhận lựa chọn của Tiên tri',
      targetName: villager.name,
    })
    await expect(table.moderator.page.getByText(': NGƯỜI')).toBeVisible()
    // Đòn tăng cường đã dùng: proxy thường, và form không còn checkbox.
    await expect(
      table.moderator.page.getByRole('checkbox', {
        name: 'Cắn xuyên bảo vệ (Sói Đầu Đàn)',
      }),
    ).toHaveCount(0)
    await proxyNightStep(table.moderator.page, {
      submitLabel: 'Ghi nhận lựa chọn của Ma sói',
      targetName: elder.name,
    })
    await skipUntilNightResolution(
      table.moderator.page,
      'Kịch bản e2e: Phù thủy chưa dùng bình',
    )
    await expectDawnDeaths(table.moderator.page, [elder.name])
    await announceDawn(table.moderator.page)

    // ===== Ngày 3: biểu quyết thiết bị loại Sói Đầu Đàn =====
    await startVote(table.moderator.page, 6)
    await deviceVoteAll(table.moderator.page, [
      { voter: villager, targetName: alpha.name },
      { voter: seer, targetName: alpha.name },
      { voter: hunter, targetName: alpha.name },
      { voter: protector, targetName: alpha.name },
      { voter: witch, targetName: alpha.name },
      { voter: alpha, targetName: seer.name },
    ])
    await confirmVoteResolution(table.moderator.page)
    await expectGameOverEventually(table.moderator.page, 'VILLAGE')
  } finally {
    await table.close()
  }
})
