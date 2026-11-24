/**
 * Tunable numbers for the props scattered on the planet surface.
 * Sizes are meters in planet space: X and Z lie along the surface, Y points out.
 */
import { Color4 } from '@dcl/sdk/math'
import { TABLOID_BATCH_SECONDS } from '../tabloids/constants'

export type PlanetPropKind = 'cornField' | 'newsstand' | 'roswellSign' | 'area51Sign'

/**
 * A prop the server places once at a set spot instead of scattering.
 * `fromSpawnDegrees` is the angle from the point under the ship at load (90 is a quarter of
 * the way around the planet). `bearingDegrees` turns it around that point; 180 apart at 90
 * from spawn puts two props on opposite sides of the planet.
 */
export type PlanetPropFixedPlacement = {
  fromSpawnDegrees: number
  bearingDegrees: number
  /** Turn the model's front (+Z in the GLB, −Y in Blender) toward the spawn point along the surface. */
  faceSpawn?: boolean
}

export type PlanetPropConfig = {
  /** How many the server scatters on load. Ignored for `fixed` props, which are placed once. */
  count: number
  /** Placed once at a set spot instead of scattered. Placed before every scattered prop. */
  fixed?: PlanetPropFixedPlacement
  /** Scattered props never land within this many degrees of a `fixed` prop. */
  clearDegrees?: number
  /** The ship is over this prop within this many degrees, measured from the planet center. 1 degree is about 1.7 m on the surface. */
  zoneRadiusDegrees: number
  /** Seconds a prop stays unavailable after the ship uses it. */
  cooldownSeconds: number
  /** GLB with its origin at the base. Kinds without one show a placeholder cube. */
  model?: string
  /** GLB shown instead of `model` while the prop is cooling down. Same origin and scale. Without one, `model` stays as is. */
  depletedModel?: string
  /** Uniform scale applied to `model` and `depletedModel`. */
  modelScale?: number
  /** Placeholder cube size. */
  size: { x: number; y: number; z: number }
  color: Color4
  /** Placeholder color while the prop is cooling down. */
  depletedColor: Color4
}

/** Newsstand size multiplier. At 2 it is about 9 m wide and 6.6 m tall. */
export const NEWSSTAND_MODEL_SCALE = 2

/** Corn field size multiplier. At 2.5 it is about 7 m wide and 7.4 m tall. */
export const CORN_FIELD_MODEL_SCALE = 2.5

export const PLANET_PROPS: Record<PlanetPropKind, PlanetPropConfig> = {
  cornField: {
    count: 15,
    zoneRadiusDegrees: 4,
    // A field grows a new cob this long after giving one up.
    cooldownSeconds: 5,
    // Seven plants, about 2.7 m wide and 2.95 m tall in the file. The picked variant is the same plants without cobs.
    // Source: blender/mcp_models.blend, CornField collection (blender/scripts/corn_field.py).
    model: 'assets/scene/Models/PlanetProps/cornField.glb',
    depletedModel: 'assets/scene/Models/PlanetProps/cornField_picked.glb',
    modelScale: CORN_FIELD_MODEL_SCALE,
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
  },
  // Landmarks: no gameplay yet, the server only logs when the ship flies over them.
  roswellSign: {
    count: 1,
    fixed: { fromSpawnDegrees: 90, bearingDegrees: 0, faceSpawn: true },
    clearDegrees: 12,
    zoneRadiusDegrees: 15,
    cooldownSeconds: 0,
    // About 13.3 m wide, 14 m deep and 6.6 m tall. Source: blender/mcp_models.blend, RoswellSign collection.
    model: 'assets/scene/Models/PlanetProps/roswellSign.glb',
    size: { x: 13, y: 6.6, z: 14 },
    color: Color4.create(0.55, 0.38, 0.26, 1),
    depletedColor: Color4.create(0.55, 0.38, 0.26, 1)
  },
  area51Sign: {
    count: 1,
    // Opposite side of the planet from the Roswell sign.
    fixed: { fromSpawnDegrees: 90, bearingDegrees: 180, faceSpawn: true },
    clearDegrees: 12,
    zoneRadiusDegrees: 15,
    cooldownSeconds: 0,
    // About 15.2 m wide, 16 m deep and 5.5 m tall. Source: blender/mcp_models.blend, Area51Sign collection
    // (the A51_Hangar child collection is not part of it).
    model: 'assets/scene/Models/PlanetProps/area51Sign.glb',
    size: { x: 15, y: 5.5, z: 16 },
    color: Color4.create(0.62, 0.6, 0.56, 1),
    depletedColor: Color4.create(0.62, 0.6, 0.56, 1)
  }
}

/**
 * No prop is scattered within this many degrees of the point under the ship when the server loads,
 * so the area players first see stays clear. 1 degree is about 1.7 m on the surface; the saucer is about 40 m across.
 */
export const PLANET_PROP_SHIP_SPAWN_CLEAR_DEGREES = 20

/** Props are kept at least this many degrees apart when scattered. */
export const PLANET_PROP_MIN_SEPARATION_DEGREES = 10

/** Random picks per prop before the separation rule is dropped for it. */
export const PLANET_PROP_PLACEMENT_ATTEMPTS = 50
