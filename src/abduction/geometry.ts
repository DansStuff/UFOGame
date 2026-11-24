/**
 * Cow-specific math: its synced direction, its position along that ray, and simulation steps.
 * General sphere math (random directions, angles, rotations) lives in `sphere/geometry.ts`.
 * No entities, no engine state.
 */
import { Vector3 } from '@dcl/sdk/math'
import { SIMULATION_MAX_DELTA_SECONDS } from '../ship/constants'
import { PLANET_SURFACE_RADIUS_METERS } from './constants'
import type { AbductableDirectionSnapshot } from '../gamestate'

/** Frame delta clamped so a long hitch does not jump the simulation. */
export function simulationStep(dt: number): number {
  return Math.min(Math.max(dt, 0), SIMULATION_MAX_DELTA_SECONDS)
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

export function moveToward(current: number, target: number, maxStep: number): number {
  const delta = target - current
  if (Math.abs(delta) <= maxStep) return target
  return current + Math.sign(delta) * maxStep
}
