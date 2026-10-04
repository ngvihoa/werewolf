import type { PlayerGameView } from '#/game/projections/model'

import { useQueryClient, useMutation } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { gameViewQueryKey } from '#/hooks/useGameView'
import { useLocalSession } from '#/hooks/useLocalSession'
import { orpcClient } from '#/orpc/client'

/**
 * R22 — countdown cho ngữ cảnh chờ ở mode SELF. Khi về 0, client đầu tiên
 * gọi `game.tick` (server dùng đồng hồ của mình để quyết định skip/abstain);
 * invalidation realtime khiến mọi client refetch và thấy kết quả.
 */
export function WaitingCountdown({
  gameId,
  waiting,
}: {
  gameId: string
  waiting: NonNullable<PlayerGameView['waiting']>
}) {
  const { sessionToken } = useLocalSession()
  const queryClient = useQueryClient()
  const [remainingMs, setRemainingMs] = useState(
    () => Date.parse(waiting.deadlineAt) - Date.now(),
  )
  const tickedKeyRef = useRef<string | null>(null)
  const tickMutation = useMutation({
    mutationFn: () =>
      orpcClient.lobby.tick({
        gameId,
        sessionToken: sessionToken ?? '',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: gameViewQueryKey(sessionToken ?? ''),
      })
    },
  })

  useEffect(() => {
    const deadline = Date.parse(waiting.deadlineAt)
    const update = () => {
      const remaining = deadline - Date.now()
      setRemainingMs(remaining)
      // Mỗi ngữ cảnh chỉ tick một lần; key mới (step/vote kế) tick lại.
      if (remaining <= 0 && tickedKeyRef.current !== waiting.key) {
        tickedKeyRef.current = waiting.key
        if (sessionToken) tickMutation.mutate()
      }
    }
    update()
    const timer = window.setInterval(update, 1000)
    return () => window.clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waiting.key, waiting.deadlineAt, sessionToken])

  // Hết giờ rồi nhưng tick chưa kịp phản hồi: ẩn số đếm thay vì hiện số âm.
  if (remainingMs <= 0) return null

  const totalSeconds = Math.ceil(remainingMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  const label =
    waiting.kind === 'STEP'
      ? 'Thời gian hành động'
      : waiting.kind === 'VOTE'
        ? 'Thời gian biểu quyết'
        : waiting.kind === 'DISCUSSION'
          ? 'Thảo luận tối thiểu'
          : 'Thời gian phát súng'

  return (
    <p className="text-center font-mono text-sm tabular-nums text-ink-subtle">
      {label} · {minutes}:{seconds}
    </p>
  )
}
