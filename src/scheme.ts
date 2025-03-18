import { ipv4, number, object, optional, pipe, string } from 'valibot'

export const ConfigSchema = object({
  gpuModel: optional(string()),
  ohmUrl: pipe(string(), ipv4()),
  ohmPort: number(),
})
