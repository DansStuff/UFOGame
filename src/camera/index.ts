/**
 * Client-only view of the saucer. The camera looks at the ship origin from behind
 * the ship, opposite the current direction of travel. With the local player at
 * the center the view is closest and least tilted; at the rim it is farthest
 * and looks down more. A small tilt leaves the heading alone. A new heading
 * starts at rest and accelerates around the ring, then settles behind the ship.
 */
import { engine, Entity, getWorldPosition, MainCamera, Transform, VirtualCamera } from '@dcl/sdk/ecs'
import { Quaternion, Vector3 } from '@dcl/sdk/math'
import { isServer } from '@dcl/sdk/network'
import { EntityNames } from '../../assets/scene/entity-names'
import {
  CAMERA_FOV_DEGREES,
  CAMERA_HEADING_SMOOTH_SECONDS,
  CAMERA_MAX_ANGLE_OFF_HORIZONTAL_DEGREES,
  CAMERA_MAX_DISTANCE_METERS,
  CAMERA_MIN_ANGLE_OFF_HORIZONTAL_DEGREES,
  CAMERA_MIN_DISTANCE_METERS,
  CAMERA_TRAVEL_DEADZONE_DEGREES,
  SHIP_TILT_EDGE_RADIUS,
  SIMULATION_MAX_DELTA_SECONDS
} from '../constants'
import { getGameState } from '../gamestate'
import { shipTravelDirection } from '../ship/motion'

let shipEntity: Entity | null = null
/** Radians. 0 flies toward +Z. The camera sits on the opposite side of the origin. */
let heading = 0
let targetHeading = 0
/** Radians per second. Starts at rest so a new heading eases in. */
let headingVelocity = 0

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

function placeCamera(camera: Entity, shipPosition: Vector3): void {
  const t = standFactor(shipPosition)
  const angle = (lerp(CAMERA_MIN_ANGLE_OFF_HORIZONTAL_DEGREES, CAMERA_MAX_ANGLE_OFF_HORIZONTAL_DEGREES, t) * Math.PI) / 180
  const distance = lerp(CAMERA_MIN_DISTANCE_METERS, CAMERA_MAX_DISTANCE_METERS, t)
  const horizontal = distance * Math.cos(angle)
  const vertical = distance * Math.sin(angle)
  const travelX = Math.sin(heading)
  const travelZ = Math.cos(heading)
  const transform = Transform.getMutable(camera)
  transform.position.x = shipPosition.x - travelX * horizontal
  transform.position.y = shipPosition.y + vertical
  transform.position.z = shipPosition.z - travelZ * horizontal

  const towardShip = Vector3.subtract(shipPosition, transform.position)
  if (Vector3.lengthSquared(towardShip) < 1e-8) return
  transform.rotation = Quaternion.lookRotation(Vector3.normalize(towardShip), Vector3.Up())
}

export function setupCamera(): void {
  if (isServer()) return
  // Temporary: skip the virtual camera so the player keeps normal camera controls.
  /*
  shipEntity = null
  heading = 0
  targetHeading = 0
  headingVelocity = 0
  sampleTravelTarget()
  heading = targetHeading

  const camera = engine.addEntity()
  Transform.create(camera)
  VirtualCamera.create(camera, {
    fov: CAMERA_FOV_DEGREES,
    defaultTransition: {
      transitionMode: VirtualCamera.Transition.Time(0.5)
    }
  })

  const ship = findShip()
  if (ship !== null) placeCamera(camera, getWorldPosition(engine, ship))

  MainCamera.createOrReplace(engine.CameraEntity, { virtualCameraEntity: camera })

  engine.addSystem(function CameraRingSystem(dt: number) {
    const currentShip = findShip()
    if (currentShip === null) return
    sampleTravelTarget()
    easeHeading(dt)
    placeCamera(camera, getWorldPosition(engine, currentShip))
  })
    */
}
