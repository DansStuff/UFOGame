/**
 * Tunable numbers for the props scattered on the planet surface.
 * Sizes are meters in planet space: X and Z lie along the surface, Y points out.
 */
import { Color4 } from '@dcl/sdk/math'
import { TABLOID_BATCH_SECONDS } from '../tabloids/constants'

export type PlanetPropKind = 'cornField' | 'newsstand'

export type PlanetPropConfig = {
  /** How many the server scatters on load. */
  count: number
  /** The ship is over this prop within this many degrees, measured from the planet center. 1 degree is about 1.7 m on the surface. */
  zoneRadiusDegrees: number
  /** Seconds a prop stays unavailable after the ship uses it. */
  cooldownSeconds: number
  /** GLB with its origin at the base. Kinds without one show a placeholder cube. */
  model?: string
  /** Uniform scale applied to `model`. */
  modelScale?: number
  /** Placeholder cube size. */
  size: { x: number; y: number; z: number }
  color: Color4
  /** Placeholder color while the prop is cooling down. */
  depletedColor: Color4
}

/** Newsstand size multiplier. At 2 it is about 9 m wide and 6.6 m tall. */
export const NEWSSTAND_MODEL_SCALE = 2

export const PLANET_PROPS: Record<PlanetPropKind, PlanetPropConfig> = {
  cornField: {
    count: 15,
    zoneRadiusDegrees: 4,
    // A field grows a new cob this long after giving one up.
    cooldownSeconds: 5,
    size: { x: 8, y: 1, z: 8 },
    color: Color4.create(0.95, 0.82, 0.15, 1),
    depletedColor: Color4.create(0.45, 0.33, 0.18, 1)
  },
  newsstand: {
    count: 15,
    zoneRadiusDegrees: 2.5,
    // Debounce: no new tabloids until the last batch has played out.
    cooldownSeconds: TABLOID_BATCH_SECONDS,
    // About 4.5 m wide, 3.3 m tall in the file. Source: blender/mcp_models.blend, Newsstand collection.
    model: 'assets/scene/Models/PlanetProps/newsstand.glb',
    modelScale: NEWSSTAND_MODEL_SCALE,
    size: { x: 1.5, y: 2.5, z: 1 },
    color: Color4.create(0.4, 0.38, 0.15, 1),
    depletedColor: Color4.create(0.25, 0.24, 0.12, 1)
  }
}

/** Props are kept at least this many degrees apart when scattered. */
export const PLANET_PROP_MIN_SEPARATION_DEGREES = 10

/** Random picks per prop before the separation rule is dropped for it. */
export const PLANET_PROP_PLACEMENT_ATTEMPTS = 50
