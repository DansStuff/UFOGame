/**
 * Shared camera placement. Every camera mode describes where it wants to be as a
 * `CameraPose` around the ship, and `placeCamera` turns that into a transform.
 */
import { engine, Entity, Transform } from '@dcl/sdk/ecs'
import { Quaternion, Vector3 } from '@dcl/sdk/math'
import { EntityNames } from '../../assets/scene/entity-names'

/** A spot on a sphere around the ship origin, looking back at it. */
export type CameraPose = {
  /** Radians. 0 sits behind the ship looking toward +Z. */
  heading: number
  /** Meters from the ship origin. */
  distance: number
  /** Radians above level. */
  angle: number
}

export const DEG_TO_RAD = Math.PI / 180

let shipEntity: Entity | null = null

export function findShip(): Entity | null {
  if (shipEntity !== null && Transform.getOrNull(shipEntity)) return shipEntity
  shipEntity = engine.getEntityOrNullByName(EntityNames.Ship)
  return shipEntity
}

export function resetShipLookup(): void {
  shipEntity = null
}

export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t
}

/** Smooth 0..1 ramp with zero speed at both ends. */
export function smoothstep(t: number): number {
  const x = Math.min(Math.max(t, 0), 1)
  return x * x * (3 - 2 * x)
}

/** Puts the camera behind `pose.heading`, `pose.distance` meters out and `pose.angle` above level, looking at the ship. */
export function placeCamera(camera: Entity, shipPosition: Vector3, pose: CameraPose): void {
  const horizontal = pose.distance * Math.cos(pose.angle)
  const vertical = pose.distance * Math.sin(pose.angle)
  const transform = Transform.getMutable(camera)
  transform.position.x = shipPosition.x - Math.sin(pose.heading) * horizontal
  transform.position.y = shipPosition.y + vertical
  transform.position.z = shipPosition.z - Math.cos(pose.heading) * horizontal

  const towardShip = Vector3.subtract(shipPosition, transform.position)
  if (Vector3.lengthSquared(towardShip) < 1e-8) return
  transform.rotation = Quaternion.lookRotation(Vector3.normalize(towardShip), Vector3.Up())
}
