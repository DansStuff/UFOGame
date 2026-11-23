/**
 * Sphere math for "is the ship over this point on the planet".
 * Directions are unit vectors from the planet center. Comparing two of them is a
 * dot product against the cosine of the allowed angle, so no acos runs per check.
 */
import { engine, Entity, getWorldPosition } from '@dcl/sdk/ecs'
import { Quaternion, Vector3 } from '@dcl/sdk/math'
import { unrotate } from '../abduction/geometry'

const DEGREES_TO_RADIANS = Math.PI / 180

/** Cosine of an angle in degrees. Precompute this once per radius, not per check. */
export function cosOfDegrees(degrees: number): number {
  return Math.cos(degrees * DEGREES_TO_RADIANS)
}

/** Unit direction from `center` to `point`, or null when they coincide. */
export function directionFromCenter(center: Vector3, point: Vector3): Vector3 | null {
  const delta = Vector3.subtract(point, center)
  if (Vector3.lengthSquared(delta) < 1e-8) return null
  return Vector3.normalize(delta)
}

/** True when two unit directions are within the angle whose cosine is `cosLimit`. */
export function isWithinCos(a: Vector3, b: Vector3, cosLimit: number): boolean {
  return Vector3.dot(a, b) >= cosLimit
}

/** Angle in degrees between two unit directions. 0 is the same direction, 180 is opposite. */
export function angleBetweenDegrees(a: Vector3, b: Vector3): number {
  const dot = Math.min(1, Math.max(-1, Vector3.dot(a, b)))
  return Math.acos(dot) / DEGREES_TO_RADIANS
}

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
