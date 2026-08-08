export type ORPCContext = {
  request: Request
}

export function createORPCContext(request: Request): ORPCContext {
  return { request }
}
