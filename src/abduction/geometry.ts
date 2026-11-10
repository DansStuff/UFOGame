/** Pure math for directions on the planet sphere. No entities, no engine state. */
import { Quaternion, Vector3 } from '@dcl/sdk/math'
import { PLANET_SURFACE_RADIUS_METERS, SIMULATION_MAX_DELTA_SECONDS } from '../constants'
import type { AbductableDirectionSnapshot } from '../gamestate'

/** Frame delta clamped so a long hitch does not jump the simulation. */
export function simulationStep(dt: number): number {
  return Math.min(Math.max(dt, 0), SIMULATION_MAX_DELTA_SECONDS)
}

/** Uniform direction on the sphere. Stored in planet space. */
export function randomSurfaceDirection(): AbductableDirectionSnapshot {
  const z = Math.random() * 2 - 1
  const angle = Math.random() * Math.PI * 2
  const ring = Math.sqrt(Math.max(0, 1 - z * z))
  return { x: ring * Math.cos(angle), y: ring * Math.sin(angle), z }
}

/** A zero direction means the server has not placed a cow yet. */
export function hasPlacement(direction: AbductableDirectionSnapshot): boolean {
  return direction.x * direction.x + direction.y * direction.y + direction.z * direction.z >= 1e-8
}

export function sameDirection(a: AbductableDirectionSnapshot, b: AbductableDirectionSnapshot): boolean {
  return Math.abs(a.x - b.x) < 1e-5 && Math.abs(a.y - b.y) < 1e-5 && Math.abs(a.z - b.z) < 1e-5
}

export function outwardDirection(direction: AbductableDirectionSnapshot): Vector3 {
  return Vector3.normalize(Vector3.create(direction.x, direction.y, direction.z))
}

/** Planet-local position of the cow along its ray, `yOffset` meters past the surface. */
export function cowPlanetLocal(direction: AbductableDirectionSnapshot, yOffset: number): Vector3 {
  return Vector3.scale(outwardDirection(direction), PLANET_SURFACE_RADIUS_METERS + yOffset)
}

/** Local +Y points along `outward`. Twist around that axis does not matter for the pull. */
export function rotationWithUp(outward: Vector3): Quaternion {
  const reference = Math.abs(outward.y) < 0.9 ? Vector3.Up() : Vector3.Right()
  const forward = Vector3.normalize(Vector3.cross(reference, outward))
  return Quaternion.lookRotation(forward, outward)
}

/** Unit quaternions invert by conjugation. */
export function invertQuaternion(rotation: Quaternion): Quaternion {
  const normalized = Quaternion.normalize(rotation)
  return Quaternion.create(-normalized.x, -normalized.y, -normalized.z, normalized.w)
}

export function unrotate(rotation: Quaternion, vector: Vector3): Vector3 {
  return Vector3.rotate(vector, invertQuaternion(rotation))
}

export function moveToward(current: number, target: number, maxStep: number): number {
  const delta = target - current
  if (Math.abs(delta) <= maxStep) return target
  return current + Math.sign(delta) * maxStep
}
