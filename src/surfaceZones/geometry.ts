/**
 * Where the ship is over the planet. Reads entities, so it lives here rather than with the
 * pure sphere math in `sphere/geometry.ts`.
 */
import { engine, Entity, getWorldPosition } from '@dcl/sdk/ecs'
import { Quaternion, Vector3 } from '@dcl/sdk/math'
import { directionFromCenter, unrotate } from '../sphere/geometry'

/**
 * Unit direction from the planet center to the ship, in planet-local space.
 * Turning the ship into planet space once per tick lets every surface point stay
 * in its fixed planet-local direction. Pass the synced rotation on the server
 * and the planet's displayed Transform rotation on a client.
 */
export function shipPlanetDirection(planet: Entity, ship: Entity, planetRotation: Quaternion): Vector3 | null {
  const world = directionFromCenter(getWorldPosition(engine, planet), getWorldPosition(engine, ship))
  if (world === null) return null
  return unrotate(planetRotation, world)
}
