/**
 * In-game camera. It looks at the ship origin from behind the ship, opposite the
 * current direction of travel. With the local player at the center the view is
 * closest and least tilted; at the rim it is farthest and looks down more. A small
 * tilt leaves the heading alone. A new heading starts at rest and accelerates
 * around the ring, then settles behind the ship.
 */
import { engine, Transform } from '@dcl/sdk/ecs'
import { Vector3 } from '@dcl/sdk/math'
import { SHIP_TILT_EDGE_RADIUS, SIMULATION_MAX_DELTA_SECONDS } from '../ship/constants'
import {
  CAMERA_HEADING_SMOOTH_SECONDS,
  CAMERA_MAX_ANGLE_OFF_HORIZONTAL_DEGREES,
  CAMERA_MAX_DISTANCE_METERS,
  CAMERA_MIN_ANGLE_OFF_HORIZONTAL_DEGREES,
  CAMERA_MIN_DISTANCE_METERS,
  CAMERA_TRAVEL_DEADZONE_DEGREES
} from './constants'
import { getGameState } from '../gamestate'
import { shipTravelDirection } from '../ship/motion'
import { CameraPose, DEG_TO_RAD, lerp } from './rig'

/** Radians. 0 flies toward +Z. The camera sits on the opposite side of the origin. */
let heading = 0
let targetHeading = 0
/** Radians per second. Starts at rest so a new heading eases in. */
let headingVelocity = 0

/** Shortest signed step from `from` to `to`, in radians. */
function wrapPi(radians: number): number {
  const tau = Math.PI * 2
  return ((radians + Math.PI) % tau + tau) % tau - Math.PI
}

/** Updates the target heading only when the ship is tilted past the deadzone. */
function sampleTravelTarget(): void {
  const state = getGameState()
  const travel = Math.hypot(-state.shipRoll, state.shipPitch)
  if (travel < CAMERA_TRAVEL_DEADZONE_DEGREES) return
  const direction = shipTravelDirection(state.shipPitch, state.shipRoll)
  if (direction === null) return
  targetHeading = Math.atan2(direction.x, direction.z)
}

function easeHeading(dt: number): void {
  const step = Math.min(Math.max(dt, 0), SIMULATION_MAX_DELTA_SECONDS)
  if (CAMERA_HEADING_SMOOTH_SECONDS <= 0) {
    heading = targetHeading
    headingVelocity = 0
    return
  }
  // Critically damped: speed starts at zero and peaks halfway through the smooth time.
  const omega = 2 / CAMERA_HEADING_SMOOTH_SECONDS
  const error = wrapPi(targetHeading - heading)
  headingVelocity += (error * omega * omega - 2 * omega * headingVelocity) * step
  heading += headingVelocity * step
}

/** 0 at the ship center, 1 at the saucer rim. Farther out stays at 1. */
function standFactor(shipPosition: Vector3): number {
  let fromCenter = 0
  if (Transform.has(engine.PlayerEntity)) {
    const player = Transform.get(engine.PlayerEntity).position
    fromCenter = Math.hypot(player.x - shipPosition.x, player.z - shipPosition.z)
  }
  if (SHIP_TILT_EDGE_RADIUS <= 0) return 1
  return Math.min(Math.max(fromCenter / SHIP_TILT_EDGE_RADIUS, 0), 1)
}

/** Snaps the heading behind the current direction of travel, at rest. */
export function resetGameplayCamera(): void {
  heading = 0
  targetHeading = 0
  headingVelocity = 0
  sampleTravelTarget()
  heading = targetHeading
}

/** Follows ship travel. Runs every frame, including during the intro, so the hand-off lands on a live heading. */
export function updateGameplayCamera(dt: number): void {
  sampleTravelTarget()
  easeHeading(dt)
}

/** Where the in-game camera wants to be for the current heading and where the local player stands. */
export function gameplayPose(shipPosition: Vector3): CameraPose {
  const t = standFactor(shipPosition)
  return {
    heading,
    distance: lerp(CAMERA_MIN_DISTANCE_METERS, CAMERA_MAX_DISTANCE_METERS, t),
    angle: lerp(CAMERA_MIN_ANGLE_OFF_HORIZONTAL_DEGREES, CAMERA_MAX_ANGLE_OFF_HORIZONTAL_DEGREES, t) * DEG_TO_RAD
  }
}
