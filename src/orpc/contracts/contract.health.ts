import z from 'zod'

import { oc } from './base'

export const healthContract = {
    health: oc.input(z.object({})).output(
        z.object({
            status: z.literal('ok'),
            timestamp: z.string(),
        }),
    ),
}
