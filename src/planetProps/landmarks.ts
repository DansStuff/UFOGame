/**
 * Where the `fixed` planet props (the landmark signs) sit, and the areas kept clear around them.
 * Server-side. Everything is measured from the point under the ship when the server loads, which is
 * cached on first use so a later caller (a cow respawn after the planet has spun) gets the same spots.
 * Lives apart from `index.ts` so `abduction/` can read it without importing the whole props module.
 */
import { Quaternion, Vector3 } from '@dcl/sdk/math'
import { EntityNames } from '../../assets/scene/entity-names'
import { findNamed, findPlanet } from '../abduction/sceneLookup'
import { getGameState } from '../gamestate'
import { cosOfDegrees, isWithinCos, shipPlanetDirection } from '../surfaceZones/geometry'
import { PLANET_PROPS, type PlanetPropFixedPlacement, type PlanetPropKind } from './constants'

const DEGREES_TO_RADIANS = Math.PI / 180

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

/**
 * Direction of a `fixed` prop. Bearing 0 is the planet-local direction perpendicular to the
 * spawn point and to +X (−Z when the ship spawns over +Y); bearings turn around the spawn point.
 */
function fixedDirection(spawn: Vector3, placement: PlanetPropFixedPlacement): Vector3 {
  let reference = Vector3.cross(spawn, Vector3.create(1, 0, 0))
  if (Vector3.lengthSquared(reference) < 1e-6) reference = Vector3.cross(spawn, Vector3.create(0, 0, 1))
  reference = Vector3.normalize(reference)
  const sideways = Vector3.rotate(reference, Quaternion.fromAngleAxis(placement.bearingDegrees, spawn))
  const angle = placement.fromSpawnDegrees * DEGREES_TO_RADIANS
  return Vector3.normalize(Vector3.add(Vector3.scale(spawn, Math.cos(angle)), Vector3.scale(sideways, Math.sin(angle))))
}

export type Landmark = { kind: PlanetPropKind; direction: Vector3 }

/** Every `fixed` prop with its planet-local direction, in `PLANET_PROPS` order. */
export function landmarks(): Landmark[] {
  const spawn = shipSpawnDirection()
  const out: Landmark[] = []
  for (const kind of FIXED_KINDS) {
    const placement = PLANET_PROPS[kind].fixed
    if (placement) out.push({ kind, direction: fixedDirection(spawn, placement) })
  }
  return out
}

/** True when `direction` is inside any landmark's zone radius. The cow never spawns there. */
export function isInLandmarkZone(direction: Vector3): boolean {
  return landmarks().some((landmark) =>
    isWithinCos(landmark.direction, direction, cosOfDegrees(PLANET_PROPS[landmark.kind].zoneRadiusDegrees))
  )
}
