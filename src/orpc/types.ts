import type {
    InferContractRouterInputs,
    InferContractRouterOutputs,
} from '@orpc/contract'
import type { appContract } from './contracts'

export type AppContract = typeof appContract

export type RouterInputs = InferContractRouterInputs<AppContract>
export type RouterOutputs = InferContractRouterOutputs<AppContract>
