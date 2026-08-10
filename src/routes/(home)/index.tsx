import { createFileRoute, Navigate, useNavigate } from '@tanstack/react-router'
import { useLocalSession } from '#/components/werewolf/use-local-session'

import { LobbyEntry } from './-components/lobby-entry'

export const Route = createFileRoute('/(home)/')({ component: EntryPage })

function EntryPage() {
  const navigate = useNavigate()
  const { sessionToken, saveSession } = useLocalSession()

  if (sessionToken) return <Navigate to="/lobby" replace />

  return (
    <LobbyEntry
      onSessionCreated={(token) => {
        saveSession(token)
        void navigate({ to: '/lobby' })
      }}
    />
  )
}
