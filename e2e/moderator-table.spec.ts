import { expect, test } from '@playwright/test'

import {
  undoLastNightStep,
  overrideMarkDead,
  proxyNightStep,
  findRoleOwners,
  castTableVote,
  playerByName,
  createTable,
  startTable,
} from './fixtures/table'

// Kịch bản e2e RIÊNG của revamp MODERATED (M1–M13): flow mới, UI mới —
// không đụng multiplayer.spec.ts (hồi quy lối vào) lẫn self-game.spec.ts.
// Đạo diễn một ván 8 người qua UI thật: proxy đêm từng vai (bot auto-confirm
// M3), hoàn tác bước (M9), gate bình minh (M3), sổ tay riêng trên /table
// (M4), override chết tay (M10), biểu quyết qua thiết bị với counts live
// (M6), nhập đếm tay dự phòng, quay lại Đêm 02.

test('đạo diễn ván MODERATED trọn: proxy đêm, undo, override, vote thiết bị, fallback tay', async ({
  browser,
}) => {
  test.setTimeout(420_000)
  const table = await createTable(browser, 8)

  try {
    await startTable(table)

    // Đọc vai 1 lần từ roster god-view — nhanh và chống lệch với UI thật.
    // Map role → danh sách tên: composition 8 người có 2 Ma sói nên vai nhóm
    // trả nhiều tên; Dân làng đúng 2 người — dùng làm nạn nhân mark/override
    // để chắc chắn phe làng (override trúng Sói sẽ đảo điều kiện thắng).
    const roles = await findRoleOwners(table.moderator.page)
    const hunter = playerByName(table, roles.get('Thợ săn')?.[0] ?? '')
    const seer = playerByName(table, roles.get('Tiên tri')?.[0] ?? '')
    const werewolf = playerByName(table, roles.get('Ma sói')?.[0] ?? '')
    const [markedName, overrideName] = roles.get('Dân làng') ?? []
    if (!markedName || !overrideName) {
      throw new Error('Not enough villagers for the scenario')
    }
    const markedPlayer = playerByName(table, markedName)
    const overrideVictim = playerByName(table, overrideName)
    // ===== Đêm 1: proxy từng vai (M2/M3) =====
    await expect(table.moderator.page.getByText('Đêm 01')).toBeVisible()
    // M13: /table là màn tĩnh — không "đang chờ ai", không hàng đợi đêm.
    await expect(hunter.page.getByText('Cả bàn nhắm mắt')).toBeVisible()
    await expect(hunter.page.getByText('Đang chờ')).toHaveCount(0)

    await proxyNightStep(table.moderator.page, {
      submitLabel: 'Ghi nhận lựa chọn của Thợ săn',
      targetName: markedPlayer.name,
    })

    // ===== M9: hoàn tác bước cuối và chọn lại =====
    await undoLastNightStep(table.moderator.page)
    await expect(
      table.moderator.page.getByRole('button', {
        name: 'Ghi nhận lựa chọn của Thợ săn',
      }),
    ).toBeVisible()
    await proxyNightStep(table.moderator.page, {
      submitLabel: 'Ghi nhận lựa chọn của Thợ săn',
      targetName: markedPlayer.name,
    })

    await proxyNightStep(table.moderator.page, {
      submitLabel: 'Ghi nhận lựa chọn của Bảo vệ',
      targetName: werewolf.name,
    })
    await proxyNightStep(table.moderator.page, {
      submitLabel: 'Ghi nhận lựa chọn của Tiên tri',
      targetName: werewolf.name,
    })
    // M4: card báo Tiên tri hiện sau khi soi được ghi nhận.
    await expect(table.moderator.page.getByText('Báo Tiên tri')).toBeVisible()
    await proxyNightStep(table.moderator.page, {
      submitLabel: 'Ghi nhận lựa chọn của Ma sói',
      targetName: hunter.name,
    })
    await proxyNightStep(table.moderator.page, {
      submitLabel: 'Ghi nhận lựa chọn của Phù thủy',
    })

    // ===== Gate bình minh (M3): chưa công bố thì người bị cắn vẫn "sống" =====
    await expect(
      table.moderator.page.getByText('Kết quả dự kiến'),
    ).toBeVisible()
    await expect(
      table.moderator.page
        .getByText('Kết quả dự kiến')
        .locator('..')
        .getByText(hunter.name),
    ).toBeVisible()
    await expect(hunter.page.getByText('Bạn đã bị loại')).toHaveCount(0)

    await table.moderator.page
      .getByRole('button', { name: 'Công bố kết quả và mở ngày' })
      .click()
    await expect(
      table.moderator.page.getByRole('heading', {
        name: 'Mở thảo luận ban ngày',
      }),
    ).toBeVisible()
    await expect(hunter.page.getByText('Bạn đã bị loại')).toBeVisible()

    // ===== M4: sổ tay riêng trên /table — soi của Seer về đúng chủ =====
    await seer.page.reload()
    await seer.page.getByRole('button', { name: /Sổ tay của vai bạn/ }).click()
    // SecretRow giữ kín giá trị tới khi chạm (chống nhìn trộm) — chạm dòng
    // soi để mở khóa rồi mới expect.
    await seer.page.getByRole('button', { name: /Soi · / }).click()
    await expect(seer.page.getByText('MA SÓI')).toBeVisible()

    // ===== M6/M7: biểu quyết qua thiết bị — counts live =====
    await table.moderator.page
      .getByRole('button', { name: 'Bắt đầu biểu quyết' })
      .click()
    await castTableVote(werewolf, seer.name)
    await castTableVote(seer, werewolf.name)
    // Monitor quản trò: tổng + counts theo ứng viên, KHÔNG lộ ai bỏ ai.
    await expect(table.moderator.page.getByText('2/6 phiếu')).toBeVisible()
    await expect(
      table.moderator.page
        .getByRole('listitem')
        .filter({ hasText: seer.name })
        .first(),
    ).toBeVisible()
    // Người đã chết không còn phiếu trên /table.
    await markedPlayer.page.reload()
    await expect(
      markedPlayer.page.getByRole('button', { name: 'Ghi phiếu' }),
    ).toHaveCount(0)

    // ===== M10: override chết tay giữa biểu quyết =====
    await overrideMarkDead(table.moderator.page, overrideVictim.name)
    await expect(
      table.moderator.page
        .getByRole('listitem')
        .filter({ hasText: overrideVictim.name })
        .first(),
    ).toContainText('Đã chết')

    // ===== Fallback đếm tay (M6) cho phần còn lại của bàn =====
    // Đếm tay loại MỘT SÓI (không phải phe làng): đêm 1 đã chết 3 phe làng
    // (Thợ săn bị cắn + marked + override) — nếu đếm tay trúng phe làng thì
    // còn 2 Sói vs 2 làng, cân số → Sói thắng ngay, không còn Đêm 02 để test.
    await table.moderator.page
      .getByText('Nhập kết quả đếm tay (dự phòng)')
      .click()
    await table.moderator.page
      .getByRole('button', { name: werewolf.name, exact: true })
      .click()
    await table.moderator.page
      .getByRole('button', { name: 'Ghi nhận kết quả biểu quyết' })
      .click()
    await table.moderator.page
      .getByRole('button', { name: 'Xác nhận kết quả' })
      .click()

    // ===== Quay lại Đêm 02 — step của người chết tự skip =====
    await expect(table.moderator.page.getByText('Đêm 02')).toBeVisible()
    await expect(
      table.moderator.page.getByRole('button', {
        name: 'Ghi nhận lựa chọn của Bảo vệ',
      }),
    ).toBeVisible()
  } finally {
    await table.close()
  }
})

test('chỉ quản trò điều khiển được đêm — player không có nút hành động nào', async ({
  browser,
}) => {
  const table = await createTable(browser, 5)

  try {
    await startTable(table)
    // M2: đêm thuộc quản trò — thiết bị người chơi chỉ giữ vai + trạng thái
    // public, không form hành động đêm nào hết.
    for (const player of [table.players[0], table.players[1]]) {
      await expect(
        player.page.getByRole('button', { name: /Gửi hành động/ }),
      ).toHaveCount(0)
      await expect(
        player.page.getByRole('button', { name: /Ghi nhận lựa chọn/ }),
      ).toHaveCount(0)
    }
  } finally {
    await table.close()
  }
})
