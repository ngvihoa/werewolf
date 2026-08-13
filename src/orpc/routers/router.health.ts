import { baseRouter } from './base'

export const healthRouter = baseRouter.health.router({
    health: baseRouter.health.health.handler(() => ({
        status: 'ok',
        timestamp: new Date().toISOString(),
    })),
})
