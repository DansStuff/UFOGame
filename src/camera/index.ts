/**
 * Client-only view of the saucer. The camera looks at the ship origin from behind
 * the ship, opposite the current direction of travel. With the local player at
 * the center the view is closest and least tilted; at the rim it is farthest
 * and looks down more. A small tilt leaves the heading alone. A new heading
 * starts at rest and accelerates around the ring, then settles behind the ship.
 *
 * On load an intro drives the same virtual camera: it orbits the ship once from far
 * out, then moves in and lands exactly on the gameplay view. Its system removes
 * itself when done, and the ring system takes over with no cut.
 */
import { engine, Entity, getWorldPosition, MainCamera, Transform, VirtualCamera } from '@dcl/sdk/ecs'
import { Quaternion, Vector3 } from '@dcl/sdk/math'
import { isServer } from '@dcl/sdk/network'
import { EntityNames } from '../../assets/scene/entity-names'
import { SHIP_TILT_EDGE_RADIUS, SIMULATION_MAX_DELTA_SECONDS } from '../ship/constants'
import {
  CAMERA_FOV_DEGREES,
  CAMERA_HEADING_SMOOTH_SECONDS,
  CAMERA_INTRO_ANGLE_OFF_HORIZONTAL_DEGREES,
  CAMERA_INTRO_DISTANCE_METERS,
  CAMERA_INTRO_SECONDS,
  CAMERA_INTRO_ZOOM_START_FRACTION,
  CAMERA_MAX_ANGLE_OFF_HORIZONTAL_DEGREES,
  CAMERA_MAX_DISTANCE_METERS,
  CAMERA_MIN_ANGLE_OFF_HORIZONTAL_DEGREES,
  CAMERA_MIN_DISTANCE_METERS,
  CAMERA_TRAVEL_DEADZONE_DEGREES
} from './constants'
import { getGameState } from '../gamestate'
import { shipTravelDirection } from '../ship/motion'

let shipEntity: Entity | null = null
/** Radians. 0 flies toward +Z. The camera sits on the opposite side of the origin. */
let heading = 0
let targetHeading = 0
/** Radians per second. Starts at rest so a new heading eases in. */
let headingVelocity = 0
/** True while the intro system owns the camera transform. */
let introActive = false

function findShip(): Entity | null {
  if (shipEntity !== null && Transform.getOrNull(shipEntity)) return shipEntity
  shipEntity = engine.getEntityOrNullByName(EntityNames.Ship)
  return shipEntity
}

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

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t
}

/** Smooth 0..1 ramp with zero speed at both ends. */
function smoothstep(t: number): number {
  const x = Math.min(Math.max(t, 0), 1)
  return x * x * (3 - 2 * x)
}

const DEG_TO_RAD = Math.PI / 180

/** Gameplay distance (meters) and downward angle (radians) for where the local player stands. */
function gameplayOrbit(shipPosition: Vector3): { distance: number; angle: number } {
  const t = standFactor(shipPosition)
  return {
    distance: lerp(CAMERA_MIN_DISTANCE_METERS, CAMERA_MAX_DISTANCE_METERS, t),
    angle: lerp(CAMERA_MIN_ANGLE_OFF_HORIZONTAL_DEGREES, CAMERA_MAX_ANGLE_OFF_HORIZONTAL_DEGREES, t) * DEG_TO_RAD
  }
}

function placeCamera(camera: Entity, shipPosition: Vector3): void {
  const orbit = gameplayOrbit(shipPosition)
  placeCameraAt(camera, shipPosition, heading, orbit.distance, orbit.angle)
}

/** Puts the camera behind `cameraHeading`, `distance` meters out and `angle` radians above level, looking at the ship. */
function placeCameraAt(camera: Entity, shipPosition: Vector3, cameraHeading: number, distance: number, angle: number): void {
  const horizontal = distance * Math.cos(angle)
  const vertical = distance * Math.sin(angle)
  const travelX = Math.sin(cameraHeading)
  const travelZ = Math.cos(cameraHeading)
  const transform = Transform.getMutable(camera)
  transform.position.x = shipPosition.x - travelX * horizontal
  transform.position.y = shipPosition.y + vertical
  transform.position.z = shipPosition.z - travelZ * horizontal

  const towardShip = Vector3.subtract(shipPosition, transform.position)
  if (Vector3.lengthSquared(towardShip) < 1e-8) return
  transform.rotation = Quaternion.lookRotation(Vector3.normalize(towardShip), Vector3.Up())
}

/**
 * One full orbit at the intro distance, then a move in to the gameplay view. The orbit
 * is measured from the live gameplay heading, so the last frame equals what
 * `placeCamera` would draw and the hand-off has no jump.
 */
function startIntro(camera: Entity): void {
  if (CAMERA_INTRO_SECONDS <= 0) return
  introActive = true
  let elapsed = 0

  function CameraIntroSystem(dt: number) {
    const ship = findShip()
    if (ship === null) return // Hold the clock until the ship exists.
    elapsed += Math.min(Math.max(dt, 0), SIMULATION_MAX_DELTA_SECONDS)
    const progress = Math.min(elapsed / CAMERA_INTRO_SECONDS, 1)
    const shipPosition = getWorldPosition(engine, ship)

    if (progress >= 1) {
      introActive = false
      engine.removeSystem(CameraIntroSystem)
      placeCamera(camera, shipPosition)
      return
    }

    const orbitTurns = 1 - smoothstep(progress)
    const zoomSpan = Math.max(1 - CAMERA_INTRO_ZOOM_START_FRACTION, 1e-6)
    const zoom = smoothstep((progress - CAMERA_INTRO_ZOOM_START_FRACTION) / zoomSpan)
    const gameplay = gameplayOrbit(shipPosition)
    placeCameraAt(
      camera,
      shipPosition,
      heading + orbitTurns * Math.PI * 2,
      lerp(CAMERA_INTRO_DISTANCE_METERS, gameplay.distance, zoom),
      lerp(CAMERA_INTRO_ANGLE_OFF_HORIZONTAL_DEGREES * DEG_TO_RAD, gameplay.angle, zoom)
    )
  }

  CameraIntroSystem(0) // Start on the orbit pose, not the entity origin.
  engine.addSystem(CameraIntroSystem)
}

export function setupCamera(): void {
  if (isServer()) return
  shipEntity = null
  heading = 0
  targetHeading = 0
  headingVelocity = 0
  sampleTravelTarget()
  heading = targetHeading
  introActive = false

  const camera = engine.addEntity()
  Transform.create(camera)
  VirtualCamera.create(camera, {
    fov: CAMERA_FOV_DEGREES,
    defaultTransition: {
      transitionMode: VirtualCamera.Transition.Time(0.5)
    }
  })

  startIntro(camera)
  const ship = findShip()
  if (ship !== null && !introActive) placeCamera(camera, getWorldPosition(engine, ship))

  MainCamera.createOrReplace(engine.CameraEntity, { virtualCameraEntity: camera })

  engine.addSystem(function CameraRingSystem(dt: number) {
    const currentShip = findShip()
    if (currentShip === null) return
    sampleTravelTarget()
    easeHeading(dt)
    if (introActive) return
    placeCamera(camera, getWorldPosition(engine, currentShip))
  })
}
