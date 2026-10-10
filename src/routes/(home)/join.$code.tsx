import { createFileRoute } from '@tanstack/react-router'
import { NOINDEX_ROBOTS } from '#/lib/site'

import { EntryGate } from './-components/EntryGate'

export const Route = createFileRoute('/(home)/join/$code')({
  component: JoinByCodePage,
  head: () => ({ meta: NOINDEX_ROBOTS }),
})

function JoinByCodePage() {
  const { code } = Route.useParams()
  return <EntryGate joinCode={code} />
}
