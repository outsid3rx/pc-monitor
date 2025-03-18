import type { InferOutput } from 'valibot'
import { ConfigSchema } from './scheme'

export type Config = InferOutput<typeof ConfigSchema>

export interface OhmDataNode {
  Text: string
  ImageURL: string
  Children: OhmDataNode[]
  Value?: string
}
