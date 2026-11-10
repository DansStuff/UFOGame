/**
 * Conversions between the planet, ship, and world frames.
 * The planet rotation comes from GameState, because the planet entity on the
 * server stays at its authored rotation. The ship tilt comes from the synced pitch and roll.
 */
import { engine, Entity, getWorldPosition } from '@dcl/sdk/ecs'
import { Quaternion, Vector3 } from '@dcl/sdk/math'
import type { AbductableDirectionSnapshot, GameStateSnapshot, PlanetRotationSnapshot } from '../gamestate'
import { shipTiltQuaternion } from '../ship/motion'
import { cowPlanetLocal, unrotate } from './geometry'

/** Ship-local XZ captured at the grab, and the Y that corresponds to a y offset of 0. Not synced. */
export type ShipCarry = {
  localX: number
  localZ: number
  baseY: number
}

export function tiltOf(state: GameStateSnapshot): Quaternion {
  return shipTiltQuaternion(state.shipPitch, state.shipRoll)
}

export function planetLocalToWorld(planet: Entity, planetRotation: PlanetRotationSnapshot, local: Vector3): Vector3 {
  return Vector3.add(getWorldPosition(engine, planet), Vector3.rotate(local, planetRotation))
}

export function shipLocalOfWorld(ship: Entity, tilt: Quaternion, world: Vector3): Vector3 {
  return unrotate(tilt, Vector3.subtract(world, getWorldPosition(engine, ship)))
}

export function worldOfShipLocal(ship: Entity, tilt: Quaternion, local: Vector3): Vector3 {
  return Vector3.add(getWorldPosition(engine, ship), Vector3.rotate(local, tilt))
}

export function planetDirectionOfWorld(
  planet: Entity,
  planetRotation: PlanetRotationSnapshot,
  world: Vector3
): AbductableDirectionSnapshot | null {
  const local = unrotate(planetRotation, Vector3.subtract(world, getWorldPosition(engine, planet)))
  if (Vector3.lengthSquared(local) < 1e-8) return null
  const normal = Vector3.normalize(local)
  return { x: normal.x, y: normal.y, z: normal.z }
}

/** Ship-local pose of the cow from the synced direction and y offset. */
export function shipLocalFromState(planet: Entity, ship: Entity, state: GameStateSnapshot): Vector3 {
  const alongRay = cowPlanetLocal(state.abductableDirection, state.abductableYOffset)
  const world = planetLocalToWorld(planet, state.planetRotation, alongRay)
  return shipLocalOfWorld(ship, tiltOf(state), world)
}

/** Where the cow sits in ship space right now, with the y offset factored out. */
export function captureShipCarry(planet: Entity, ship: Entity, state: GameStateSnapshot): ShipCarry {
  const local = shipLocalFromState(planet, ship, state)
  return { localX: local.x, localZ: local.z, baseY: local.y - state.abductableYOffset }
}

/**
 * Angle in degrees between the ship and the abductable, measured from the planet center.
 * Both directions are normalized. 0 is directly under the ship. 180 is the far side.
 * The abductable direction is planet-local and is turned by the synced `planetRotation`.
 */
export function angleFromPlanetCenter(
  planet: Entity,
  ship: Entity,
  direction: AbductableDirectionSnapshot,
  planetRotation: PlanetRotationSnapshot
): number | null {
  const toShip = Vector3.subtract(getWorldPosition(engine, ship), getWorldPosition(engine, planet))
  if (Vector3.lengthSquared(toShip) < 1e-8) return null

  const toAbductable = Vector3.rotate(Vector3.create(direction.x, direction.y, direction.z), planetRotation)
  if (Vector3.lengthSquared(toAbductable) < 1e-8) return null

  const dot = Vector3.dot(Vector3.normalize(toShip), Vector3.normalize(toAbductable))
  const clamped = Math.min(1, Math.max(-1, dot))
  return Math.acos(clamped) * (180 / Math.PI)
}
