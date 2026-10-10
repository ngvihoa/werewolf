import { createFileRoute } from '@tanstack/react-router'
import { NOINDEX_ROBOTS } from '#/lib/site'

import { EntryGate } from './-components/EntryGate'

export const Route = createFileRoute('/(home)/play')({
  component: () => <EntryGate />,
  head: () => ({ meta: NOINDEX_ROBOTS }),
})
