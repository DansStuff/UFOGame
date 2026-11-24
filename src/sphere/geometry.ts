/**
 * Pure math for directions on the planet sphere. No entities, no engine state, no game rules.
 * A direction is a unit vector from the planet center, in planet-local space unless a caller says otherwise.
 * Comparing two directions is a dot product against the cosine of the allowed angle, so no acos runs per check.
 * Domain code (surface zones, props, the cow) builds on these helpers; entity-reading helpers live with their domain.
 */
import { Quaternion, Vector3 } from '@dcl/sdk/math'

export const DEGREES_TO_RADIANS = Math.PI / 180

// MARK: Angles

/** Cosine of an angle in degrees. Precompute this once per radius, not per check. */
export function cosOfDegrees(degrees: number): number {
  return Math.cos(degrees * DEGREES_TO_RADIANS)
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

// MARK: Directions

/** Unit direction from `center` to `point`, or null when they coincide. */
export function directionFromCenter(center: Vector3, point: Vector3): Vector3 | null {
  const delta = Vector3.subtract(point, center)
  if (Vector3.lengthSquared(delta) < 1e-8) return null
  return Vector3.normalize(delta)
}

/** Uniform random direction on the sphere. */
export function randomSurfaceDirection(): Vector3 {
  const z = Math.random() * 2 - 1
  const angle = Math.random() * Math.PI * 2
  const ring = Math.sqrt(Math.max(0, 1 - z * z))
  return Vector3.create(ring * Math.cos(angle), ring * Math.sin(angle), z)
}

/**
 * The direction `angleDegrees` away from `from`, turned `bearingDegrees` around it.
 * Bearing 0 is the direction perpendicular to `from` and to +X (−Z when `from` is +Y);
 * +Z is used instead when `from` is along X. 90 degrees at bearings 0 and 180 are opposite points.
 */
export function directionAtAngleAndBearing(from: Vector3, angleDegrees: number, bearingDegrees: number): Vector3 {
  let reference = Vector3.cross(from, Vector3.create(1, 0, 0))
  if (Vector3.lengthSquared(reference) < 1e-6) reference = Vector3.cross(from, Vector3.create(0, 0, 1))
  reference = Vector3.normalize(reference)
  const sideways = Vector3.rotate(reference, Quaternion.fromAngleAxis(bearingDegrees, from))
  const angle = angleDegrees * DEGREES_TO_RADIANS
  return Vector3.normalize(Vector3.add(Vector3.scale(from, Math.cos(angle)), Vector3.scale(sideways, Math.sin(angle))))
}

// MARK: Rotations

/** Local +Y points along `outward`. Twist around that axis is arbitrary. */
export function rotationWithUp(outward: Vector3): Quaternion {
  const reference = Math.abs(outward.y) < 0.9 ? Vector3.Up() : Vector3.Right()
  const forward = Vector3.normalize(Vector3.cross(reference, outward))
  return Quaternion.lookRotation(forward, outward)
}

/**
 * Local +Y along `outward` and local +Z (a model's front) pointing along the surface toward
 * `toward`. Falls back to `rotationWithUp` when `toward` is straight up or down from there.
 */
export function rotationWithUpFacing(outward: Vector3, toward: Vector3): Quaternion {
  const forward = tangentToward(outward, toward)
  if (forward === null) return rotationWithUp(outward)
  return Quaternion.lookRotation(forward, outward)
}

/**
 * Unit direction along the surface at `from` that heads toward `to`: `to` with its
 * component along `from` removed. Null when `to` is straight up or down from `from`.
 */
export function tangentToward(from: Vector3, to: Vector3): Vector3 | null {
  const along = Vector3.subtract(to, Vector3.scale(from, Vector3.dot(to, from)))
  if (Vector3.lengthSquared(along) < 1e-8) return null
  return Vector3.normalize(along)
}

/** Unit quaternions invert by conjugation. */
export function invertQuaternion(rotation: Quaternion): Quaternion {
  const normalized = Quaternion.normalize(rotation)
  return Quaternion.create(-normalized.x, -normalized.y, -normalized.z, normalized.w)
}

/** `vector` with `rotation` undone, for example a world direction turned into planet space. */
export function unrotate(rotation: Quaternion, vector: Vector3): Vector3 {
  return Vector3.rotate(vector, invertQuaternion(rotation))
}

// MARK: Clear areas

/** A cap on the sphere that random picks must avoid: a direction and the cosine of its radius. */
export type ClearArea = { direction: Vector3; cosRadius: number }

export function clearArea(direction: Vector3, radiusDegrees: number): ClearArea {
  return { direction, cosRadius: cosOfDegrees(radiusDegrees) }
}

/** True when `direction` is inside any of `areas`. */
export function isInClearArea(direction: Vector3, areas: ClearArea[]): boolean {
  return areas.some((area) => isWithinCos(area.direction, direction, area.cosRadius))
}

export type PickClearDirectionOptions = {
  /** Picks inside any of these are always rejected. */
  clear: ClearArea[]
  /** Random picks before giving up. Bounded, so a crowded sphere can never hang the caller. */
  attempts: number
  /** Used when every pick lands in a clear area. Should be known to be outside them. */
  fallback: Vector3
  /** Soft rule, for example spacing from other props. Without one, the first clear pick wins. */
  prefer?: (direction: Vector3) => boolean
}

/**
 * A random direction outside every clear area. With `prefer`, the first clear pick that also
 * passes it wins; if none does, the first clear pick is used, so the soft rule bends before a
 * clear area does. `fallback` only when every pick landed in a clear area.
 */
export function pickClearDirection(options: PickClearDirectionOptions): Vector3 {
  let firstClear: Vector3 | null = null
  for (let attempt = 0; attempt < options.attempts; attempt++) {
    const candidate = randomSurfaceDirection()
    if (isInClearArea(candidate, options.clear)) continue
    if (options.prefer === undefined || options.prefer(candidate)) return candidate
    if (firstClear === null) firstClear = candidate
  }
  return firstClear ?? options.fallback
}
