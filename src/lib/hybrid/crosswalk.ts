import crosswalkJson from '../../../config/pentagrama-nr01-crosswalk.v1.json'
import type { Dimensao } from '@/types/database'
import type { HybridCrosswalkConfig, HybridCrosswalkLink } from '@/types/hybrid'
import type { Nr01DimensionCode } from '@/types/nr01'

export const HYBRID_CROSSWALK_VERSION = '1.0.0'

const config = crosswalkJson as HybridCrosswalkConfig

export function getCrosswalk(): HybridCrosswalkConfig {
  return config
}

export function linksForNr01Dim(code: Nr01DimensionCode): HybridCrosswalkLink[] {
  return config.links.filter((l) => l.nr01 === code)
}

export function linksForPentagramaDim(dim: Dimensao): HybridCrosswalkLink[] {
  return config.links.filter((l) => l.pentagrama === dim)
}
