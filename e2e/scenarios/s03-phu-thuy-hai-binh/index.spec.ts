import { expect, test } from '@playwright/test'

import {
  findRoleOwners,
  proxyNightStep,
  playerByName,
  createTable,
  startTable,
} from '../../fixtures/table'
import {
  reloadUntilVisible,
  expectDawnDeaths,
  proxyWitchStep,
  announceDawn,
} from '../../fixtures/scenario'

// S03 — Phù thủy dùng cả hai bình trong một đêm (kịch bản đầy đủ:
// e2e/scenarios/s03-phu-thuy-hai-binh/scenario.md).
// Ván 6 người composition mặc định: đêm 1 Sói cắn B, Phù thủy cứu B và độc
// Sói → làng thắng ngay tại bình minh, không cần biểu quyết.

test('Phù thủy cứu nạn nhân Sói và đầu độc Sói — làng thắng ngay bình minh', async ({
  browser,
}) => {
  test.setTimeout(180_000)
  const table = await createTable(browser, 6)

  try {
    await startTable(table)

    // Đọc dàn vai từ god-view roster — chủ vai được rút ngẫu nhiên.
    const roles = await findRoleOwners(table.moderator.page)
    const werewolf = playerByName(table, roles.get('Ma sói')?.[0] ?? '')
    const seer = playerByName(table, roles.get('Tiên tri')?.[0] ?? '')
    const [victimName] = roles.get('Dân làng') ?? []
    if (!victimName) throw new Error('Not enough villagers for the scenario')
    const victim = playerByName(table, victimName)

    // Đêm 1: Tiên tri soi Dân làng B — card "Báo Tiên tri" chốt kết quả NGƯỜI.
    await proxyNightStep(table.moderator.page, {
      submitLabel: 'Ghi nhận lựa chọn của Tiên tri',
      targetName: victim.name,
    })
    await expect(table.moderator.page.getByText('Báo Tiên tri')).toBeVisible()
    await expect(table.moderator.page.getByText(': NGƯỜI')).toBeVisible()

    // Ma sói cắn B — card "Báo Phù thủy" chỉ hiện khi tới lượt Phù thủy.
    await proxyNightStep(table.moderator.page, {
      submitLabel: 'Ghi nhận lựa chọn của Ma sói',
      targetName: victim.name,
    })
    const witchCard = table.moderator.page
      .getByText('Báo Phù thủy')
      .locator('..')
    await expect(witchCard).toBeVisible()
    await expect(witchCard.getByText(victim.name)).toBeVisible()

    // Phù thủy dùng bình cứu (hủy đòn cắn) và bình độc (giết Sói).
    await proxyWitchStep(table.moderator.page, {
      heal: true,
      poisonTargetName: werewolf.name,
    })

    // Bình minh: danh sách chết chỉ có Sói — B được cứu.
    await expectDawnDeaths(table.moderator.page, [werewolf.name])
    await expect(
      table.moderator.page
        .getByText('Kết quả dự kiến')
        .locator('..')
        .getByText(victim.name),
    ).toHaveCount(0)

    // Công bố → điểm thắng kiểm ngay: Sói đã chết hết, làng thắng.
    await announceDawn(table.moderator.page, { gameOver: 'VILLAGE' })

    // Thiết bị người chơi (đại diện Tiên tri): cùng banner kết cục.
    await reloadUntilVisible(
      seer.page,
      () => seer.page.getByText('Phe Dân làng chiến thắng'),
      30_000,
    )
    await expect(seer.page.getByText('Sự thật được lộ ra')).toBeVisible()
  } finally {
    await table.close()
  }
})
