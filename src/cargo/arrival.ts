/**
 * Client-only arrival for cargo abducted while this client watches. The item rides the
 * abduction beam straight up from the surface under the ship, tumbling, until it clears
 * the deck above the central hub. It is then spat out in an arc and lands on its deck
 * spot at its synced yaw. Positions are ship-local, so the beam and the arc follow the
 * ship's tilt. Items already aboard when this client first sees the list skip all this.
 */
import { engine, Entity, getWorldPosition, Transform } from '@dcl/sdk/ecs'
import { Quaternion, Vector3 } from '@dcl/sdk/math'
import { PLANET_SURFACE_RADIUS_METERS } from '../abduction/constants'
import { findPlanet } from '../abduction/sceneLookup'
import {
  CARGO_MODELS,
  CARGO_BEAM_RISE_SECONDS,
  CARGO_BEAM_SPIN_DEGREES_PER_SECOND,
  CARGO_BEAM_TOP_Y,
  CARGO_SPIT_ARC_METERS,
  CARGO_SPIT_SECONDS
} from './constants'
import type { CargoItem } from './state'

type Arrival = {
  elapsed: number
  /** Ship-local Y of the planet surface under the ship when the arrival started. */
  startY: number
  deckSpot: Vector3
  landed: Quaternion
  /** Tumble axis while riding the beam. */
  spinAxis: Vector3
  /** The model's middle relative to its origin, in ship-local meters, before rotation. */
  centerOffset: Vector3
}

const arrivals = new Map<Entity, Arrival>()

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t)
}

/** Meters from the ship origin down to the planet surface. Falls back to the authored gap. */
function surfaceDepthBelow(ship: Entity): number {
  const planet = findPlanet()
  if (planet === null) return 15
  const gap = Vector3.length(Vector3.subtract(getWorldPosition(engine, ship), getWorldPosition(engine, planet)))
  return Math.max(0, gap - PLANET_SURFACE_RADIUS_METERS)
}

function randomAxis(): Vector3 {
  const axis = Vector3.create(Math.random() - 0.5, Math.random() * 0.3, Math.random() - 0.5)
  if (Vector3.lengthSquared(axis) < 1e-6) return Vector3.Right()
  return Vector3.normalize(axis)
}

type Pose = { center: Vector3; rotation: Quaternion }

/** The origin that puts the model's middle at `pose.center`, so rotation turns it about its middle. */
function originFor(arrival: Arrival, pose: Pose): Vector3 {
  return Vector3.subtract(pose.center, Vector3.rotate(arrival.centerOffset, pose.rotation))
}

/** Ship-local pose of the model's middle while riding the beam. */
function beamPose(arrival: Arrival, elapsed: number): Pose {
  const t = Math.min(elapsed / CARGO_BEAM_RISE_SECONDS, 1)
  const bottomY = arrival.startY + (CARGO_BEAM_TOP_Y - arrival.startY) * smoothstep(t)
  const spin = Quaternion.fromAngleAxis(elapsed * CARGO_BEAM_SPIN_DEGREES_PER_SECOND, arrival.spinAxis)
  return {
    center: Vector3.create(0, bottomY + arrival.centerOffset.y, 0),
    rotation: Quaternion.multiply(spin, arrival.landed)
  }
}

function applyPose(entity: Entity, arrival: Arrival, pose: Pose): void {
  const transform = Transform.getMutable(entity)
  transform.position = originFor(arrival, pose)
  transform.rotation = pose.rotation
}

/** Starts the arrival for an item just added to the ship. The entity must be parented to the ship. */
export function startArrival(entity: Entity, ship: Entity, item: CargoItem): void {
  const model = CARGO_MODELS[item.kind]
  const arrival: Arrival = {
    elapsed: 0,
    startY: -surfaceDepthBelow(ship),
    deckSpot: Vector3.create(item.x, 0, item.z),
    landed: Quaternion.fromEulerDegrees(0, item.yaw, 0),
    spinAxis: randomAxis(),
    centerOffset: Vector3.create(0, model.centerY * model.scale, 0)
  }
  arrivals.set(entity, arrival)
  applyPose(entity, arrival, beamPose(arrival, 0))
}

export function cancelArrival(entity: Entity): void {
  arrivals.delete(entity)
}

export function resetArrivals(): void {
  arrivals.clear()
}

export function CargoArrivalSystem(dt: number): void {
  for (const [entity, arrival] of Array.from(arrivals)) {
    if (Transform.getOrNull(entity) === null) {
      arrivals.delete(entity)
      continue
    }
    arrival.elapsed += dt

    if (arrival.elapsed < CARGO_BEAM_RISE_SECONDS) {
      applyPose(entity, arrival, beamPose(arrival, arrival.elapsed))
      continue
    }

    const spitElapsed = arrival.elapsed - CARGO_BEAM_RISE_SECONDS
    if (spitElapsed < CARGO_SPIT_SECONDS) {
      const t = spitElapsed / CARGO_SPIT_SECONDS
      const top = beamPose(arrival, CARGO_BEAM_RISE_SECONDS)
      // Resting on the deck, the middle sits straight above the origin.
      const landedCenter = Vector3.add(arrival.deckSpot, arrival.centerOffset)
      const center = Vector3.lerp(top.center, landedCenter, t)
      center.y += CARGO_SPIT_ARC_METERS * 4 * t * (1 - t)
      applyPose(entity, arrival, { center, rotation: Quaternion.slerp(top.rotation, arrival.landed, smoothstep(t)) })
      continue
    }

    const transform = Transform.getMutable(entity)
    transform.position = Vector3.clone(arrival.deckSpot)
    transform.rotation = arrival.landed
    arrivals.delete(entity)
  }
}
