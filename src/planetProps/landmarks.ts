/**
 * Where the `fixed` planet props (the landmark signs) sit, and the zones kept clear around them.
 * Server-side. Everything is measured from the point under the ship when the server loads, which is
 * cached on first use so a later caller (a cow respawn after the planet has spun) gets the same spots.
 * Lives apart from `index.ts` so `abduction/` can read it without importing the whole props module.
 */
import { Vector3 } from '@dcl/sdk/math'
import { EntityNames } from '../../assets/scene/entity-names'
import { findNamed, findPlanet } from '../abduction/sceneLookup'
import { getGameState } from '../gamestate'
import { clearArea, directionAtAngleAndBearing, tangentToward, type ClearArea } from '../sphere/geometry'
import { shipPlanetDirection } from '../surfaceZones/geometry'
import { PLANET_PROPS, type PlanetPropKind } from './constants'

const FIXED_KINDS = (Object.keys(PLANET_PROPS) as PlanetPropKind[]).filter((kind) => PLANET_PROPS[kind].fixed)

/** Cached on first use. The server loads once, so it is never cleared. */
let spawnDirection: Vector3 | null = null

/**
 * Planet-local direction under the ship when the server loads. Straight up when the
 * ship or planet is missing, which is where the composite puts the ship.
 */
export function shipSpawnDirection(): Vector3 {
  if (spawnDirection !== null) return spawnDirection
  const planet = findPlanet()
  const ship = findNamed(EntityNames.Ship)
  const direction = planet !== null && ship !== null ? shipPlanetDirection(planet, ship, getGameState().planetRotation) : null
  spawnDirection = direction ?? Vector3.create(0, 1, 0)
  return spawnDirection
}

export type Landmark = {
  kind: PlanetPropKind
  direction: Vector3
  /** Planet-local direction along the surface the model's front points. Null for no set facing. */
  facing: Vector3 | null
}

/** Every `fixed` prop with its planet-local direction and facing, in `PLANET_PROPS` order. */
export function landmarks(): Landmark[] {
  const spawn = shipSpawnDirection()
  const out: Landmark[] = []
  for (const kind of FIXED_KINDS) {
    const placement = PLANET_PROPS[kind].fixed
    if (!placement) continue
    const direction = directionAtAngleAndBearing(spawn, placement.fromSpawnDegrees, placement.bearingDegrees)
    const facing = placement.faceSpawn ? tangentToward(direction, spawn) : null
    out.push({ kind, direction, facing })
  }
  return out
}

/** Each landmark's whole zone (`zoneRadiusDegrees`). A new cow never spawns in one. */
export function landmarkZones(): ClearArea[] {
  return landmarks().map(({ kind, direction }) => clearArea(direction, PLANET_PROPS[kind].zoneRadiusDegrees))
}
