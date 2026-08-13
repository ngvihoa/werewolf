import { createORPCContext } from '#/orpc/context'
import { createFileRoute } from '@tanstack/react-router'
import { RPCHandler } from '@orpc/server/fetch'
import { appRouter } from '#/orpc/routers'

const handler = new RPCHandler(appRouter)

async function handle({ request }: { request: Request }) {
  const { response } = await handler.handle(request, {
    prefix: '/api/rpc',
    context: createORPCContext(request),
  })

  return response ?? new Response('Not found', { status: 404 })
}

export const Route = createFileRoute('/api/rpc/$')({
  server: {
    handlers: {
      GET: handle,
      POST: handle,
    },
  },
})
