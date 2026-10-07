import { expect, test } from '@playwright/test'

import {
  confirmVoteResolution,
  reloadUntilVisible,
  expectDawnDeaths,
  expectPlayerDead,
  proxyWitchStep,
  deviceVoteAll,
  announceDawn,
  startVote,
} from '../../fixtures/scenario'
import {
  findRoleOwners,
  proxyNightStep,
  playerByName,
  createTable,
  startTable,
} from '../../fixtures/table'

// S01 — Ván kinh điển: làng thắng sau hai đêm (kịch bản đầy đủ:
// e2e/scenarios/s01-van-kinh-dien/scenario.md).
// Đêm 1: bảo vệ + phù thủy cứu nạn nhân → không ai chết; ngày 1: cả bàn vote
// thiết bị loại Sói 1; đêm 2: bảo vệ chặn cắn, phù thủy độc Sói 2 → làng
// thắng ngay bình minh.

test('Ván 8 người kinh điển: cứu, biểu quyết thiết bị, độc Sói — làng thắng', async ({
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
    const protector = playerByName(table, roles.get('Bảo vệ')?.[0] ?? '')
    const hunter = playerByName(table, roles.get('Thợ săn')?.[0] ?? '')
    const [villagerAName, villagerBName] = roles.get('Dân làng') ?? []
    if (!wolf1Name || !wolf2Name || !villagerAName || !villagerBName) {
      throw new Error('Composition is missing wolves or villagers')
    }
    const wolf1 = playerByName(table, wolf1Name)
    const wolf2 = playerByName(table, wolf2Name)
    const villagerA = playerByName(table, villagerAName)
    const villagerB = playerByName(table, villagerBName)

    // ===== Đêm 1: mark, bảo hộ, soi, cắn, cứu =====
    await proxyNightStep(table.moderator.page, {
      submitLabel: 'Ghi nhận lựa chọn của Thợ săn',
      targetName: villagerA.name,
    })
    await proxyNightStep(table.moderator.page, {
      submitLabel: 'Ghi nhận lựa chọn của Bảo vệ',
      targetName: villagerB.name,
    })
    await proxyNightStep(table.moderator.page, {
      submitLabel: 'Ghi nhận lựa chọn của Tiên tri',
      targetName: wolf1.name,
    })
    await expect(table.moderator.page.getByText(': SÓI')).toBeVisible()
    await proxyNightStep(table.moderator.page, {
      submitLabel: 'Ghi nhận lựa chọn của Ma sói',
      targetName: villagerB.name,
    })
    await proxyWitchStep(table.moderator.page, { heal: true })

    // Bình minh: hai lớp phòng ngự chặn được cắn — không ai bị loại.
    await expectDawnDeaths(table.moderator.page, [])
    await announceDawn(table.moderator.page)

    // ===== Ngày 1: biểu quyết qua thiết bị — 8/8 phiếu =====
    const villageVoters = [seer, witch, protector, hunter, villagerA, villagerB]
    await startVote(table.moderator.page, 8)
    await deviceVoteAll(table.moderator.page, [
      ...villageVoters.map((voter) => ({ voter, targetName: wolf1.name })),
      { voter: wolf1, targetName: seer.name },
      { voter: wolf2, targetName: seer.name },
    ])
    await confirmVoteResolution(table.moderator.page)
    await expectPlayerDead(table.moderator.page, wolf1.name)

    // ===== Đêm 2: bảo hộ lại, cắn hụt, độc Sói cuối =====
    await proxyNightStep(table.moderator.page, {
      submitLabel: 'Ghi nhận lựa chọn của Thợ săn',
      targetName: seer.name,
    })
    await proxyNightStep(table.moderator.page, {
      submitLabel: 'Ghi nhận lựa chọn của Bảo vệ',
      targetName: villagerA.name,
    })
    await proxyNightStep(table.moderator.page, {
      submitLabel: 'Ghi nhận lựa chọn của Tiên tri',
      targetName: wolf2.name,
    })
    await expect(table.moderator.page.getByText(': SÓI')).toBeVisible()
    await proxyNightStep(table.moderator.page, {
      submitLabel: 'Ghi nhận lựa chọn của Ma sói',
      targetName: villagerA.name,
    })
    await proxyWitchStep(table.moderator.page, {
      poisonTargetName: wolf2.name,
    })

    // Bình minh định đoạt: chỉ Sói 2 chết (Dân A được bảo hộ) → làng thắng.
    await expectDawnDeaths(table.moderator.page, [wolf2.name])
    await announceDawn(table.moderator.page, { gameOver: 'VILLAGE' })

    // Thiết bị người chơi: banner kết cục + thẻ vai của chính mình.
    await reloadUntilVisible(
      hunter.page,
      () => hunter.page.getByText('Phe Dân làng chiến thắng'),
      30_000,
    )
    await expect(hunter.page.getByText('Sự thật được lộ ra')).toBeVisible()
    await expect(hunter.page.getByText('Vai trò của bạn:')).toBeVisible()
  } finally {
    await table.close()
  }
})
