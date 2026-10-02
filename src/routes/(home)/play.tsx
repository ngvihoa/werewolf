import { createFileRoute } from '@tanstack/react-router'

import { EntryGate } from './-components/EntryGate'

export const Route = createFileRoute('/(home)/play')({
  component: () => <EntryGate />,
})
