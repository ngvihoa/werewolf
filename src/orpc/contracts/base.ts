import { oc as _oc } from '@orpc/contract'
import z from 'zod'

export const oc = _oc.errors({
    INPUT_VALIDATION_FAILED: {
        status: 400,
        data: z.object({
            formErrors: z.array(z.string()),
            fieldErrors: z.record(z.string(), z.array(z.string()).optional()),
        }),
    },
    OUTPUT_VALIDATION_FAILED: {
        status: 500,
        data: z.object({
            formErrors: z.array(z.string()),
            fieldErrors: z.record(z.string(), z.array(z.string()).optional()),
        }),
    },
})
