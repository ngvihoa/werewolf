import { createFileRoute, Navigate } from '@tanstack/react-router'
import { useLocalSession } from '#/components/werewolf/use-local-session'
import { RoomPage } from '#/components/werewolf/werewolf-app'

export const Route = createFileRoute('/game')({ component: GamePage })

function GamePage() {
  const { sessionToken, leaveSession } = useLocalSession()
  if (!sessionToken) return <Navigate to="/" replace />
  return (
    <RoomPage sessionToken={sessionToken} onLeave={leaveSession} page="GAME" />
  )
}
