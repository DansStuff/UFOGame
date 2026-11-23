/**
 * Tunable numbers for the props scattered on the planet surface.
 * Sizes are meters in planet space: X and Z lie along the surface, Y points out.
 */
import { Color4 } from '@dcl/sdk/math'

export type PlanetPropKind = 'cornField' | 'newsstand'

export type PlanetPropConfig = {
  /** How many the server scatters on load. */
  count: number
  /** The ship is over this prop within this many degrees, measured from the planet center. 1 degree is about 1.7 m on the surface. */
  zoneRadiusDegrees: number
  /** Placeholder cube size. */
  size: { x: number; y: number; z: number }
  color: Color4
}

export const PLANET_PROPS: Record<PlanetPropKind, PlanetPropConfig> = {
  cornField: {
    count: 15,
    zoneRadiusDegrees: 4,
    size: { x: 8, y: 1, z: 8 },
    color: Color4.create(0.95, 0.82, 0.15, 1)
  },
  newsstand: {
    count: 15,
    zoneRadiusDegrees: 2.5,
    size: { x: 1.5, y: 2.5, z: 1 },
    color: Color4.create(0.4, 0.38, 0.15, 1)
  }
}

/** Props are kept at least this many degrees apart when scattered. */
export const PLANET_PROP_MIN_SEPARATION_DEGREES = 10

/** Random picks per prop before the separation rule is dropped for it. */
export const PLANET_PROP_PLACEMENT_ATTEMPTS = 50
