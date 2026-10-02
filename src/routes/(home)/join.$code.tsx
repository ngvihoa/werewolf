import { createFileRoute } from '@tanstack/react-router'

import { EntryGate } from './-components/EntryGate'

export const Route = createFileRoute('/(home)/join/$code')({
  component: JoinByCodePage,
})

function JoinByCodePage() {
  const { code } = Route.useParams()
  return <EntryGate joinCode={code} />
}
