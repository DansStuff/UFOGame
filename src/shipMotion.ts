/**
 * Players standing off the ship center tilt it. The server averages their
 * positions, eases that tilt into GameState, and spins the planet as if the
 * ship were flying that way over the surface. Clients apply the tilt directly
 * and ease the planet toward the synced spin.
 */
import { engine, Entity, Name, PlayerIdentityData, Transform } from '@dcl/sdk/ecs'
import { Quaternion, Vector3 } from '@dcl/sdk/math'
import { isServer } from '@dcl/sdk/network'
import { EntityNames } from '../assets/scene/entity-names'
import {
  PLANET_ROTATION_BLEND_SECONDS,
  PLANET_SPIN_MAX_DEGREES_PER_SECOND,
  SHIP_CENTER_X,
  SHIP_CENTER_Z,
  SHIP_TILT_DEADZONE,
  SHIP_TILT_SAFE_RADIUS,
  SHIP_TILT_INFLUENCE_RADIUS,
  SHIP_TILT_MAX_DEGREES,
  SHIP_TILT_SMOOTH_SECONDS,
  SIMULATION_MAX_DELTA_SECONDS
} from './constants'
import {
  applyShipMotion,
  getGameState,
  hasBoundGameState,
  type PlanetAngularVelocitySnapshot,
  type PlanetRotationSnapshot
} from './gamestate'

/** Snap the tilt once it is this close, so easing reaches the target instead of crawling. */
const SHIP_TILT_SNAP_DEGREES = 0.01

let shipEntity: Entity | null = null
let planetEntity: Entity | null = null
/** Client-only display pose. Seeded from the first synced orientation, then eased. */
let displayedPlanetRotation: PlanetRotationSnapshot | null = null

function tiltDegrees(offset: number): number {
  const magnitude = Math.abs(offset)
  if (magnitude <= SHIP_TILT_DEADZONE) return 0
  const ranged = Math.min((magnitude - SHIP_TILT_DEADZONE) / SHIP_TILT_INFLUENCE_RADIUS, 1)
  return Math.sign(offset) * ranged * SHIP_TILT_MAX_DEGREES
}

function smoothAngle(current: number, target: number, dt: number): number {
  const delta = target - current
  if (Math.abs(delta) <= SHIP_TILT_SNAP_DEGREES) return target
  const blend = 1 - Math.exp(-dt / SHIP_TILT_SMOOTH_SECONDS)
  return current + delta * blend
}

/**
 * Average XZ of players outside the safe radius, relative to the ship.
 * Null when nobody is outside it, which holds the ship level.
 */
function averagePlayerOffset(): { x: number; z: number } | null {
  let sumX = 0
  let sumZ = 0
  let count = 0
  for (const [, , transform] of engine.getEntitiesWith(PlayerIdentityData, Transform)) {
    const x = transform.position.x - SHIP_CENTER_X
    const z = transform.position.z - SHIP_CENTER_Z
    if (Math.hypot(x, z) <= SHIP_TILT_SAFE_RADIUS) continue
    sumX += x
    sumZ += z
    count++
  }
  if (count === 0) return null
  return {
    x: sumX / count,
    z: sumZ / count
  }
}

/**
 * Pitch dips +Z when positive. Roll dips +X when negative.
 * Composed so a player standing on +X / +Z lowers that side of the saucer.
 */
export function shipTiltQuaternion(pitch: number, roll: number): Quaternion {
  return Quaternion.multiply(
    Quaternion.fromAngleAxis(pitch, Vector3.Right()),
    Quaternion.fromAngleAxis(roll, Vector3.Forward())
  )
}

/**
 * World-space spin, in degrees per second, from the current tilt.
 * A dip toward +X flies the ship toward +X, and the surface scrolls toward -X.
 */
function planetAngularVelocity(pitch: number, roll: number): PlanetAngularVelocitySnapshot {
  const travelX = -roll / SHIP_TILT_MAX_DEGREES
  const travelZ = pitch / SHIP_TILT_MAX_DEGREES
  const travel = Math.hypot(travelX, travelZ)
  if (travel < 0.001) return { x: 0, y: 0, z: 0 }
  const speed = Math.min(travel, 1) * PLANET_SPIN_MAX_DEGREES_PER_SECOND
  return {
    x: (-travelZ / travel) * speed,
    y: 0,
    z: (travelX / travel) * speed
  }
}

function integrateRotation(
  rotation: PlanetRotationSnapshot,
  angularVelocity: PlanetAngularVelocitySnapshot,
  dt: number
): PlanetRotationSnapshot {
  const speed = Math.hypot(angularVelocity.x, angularVelocity.y, angularVelocity.z)
  const degrees = speed * dt
  if (degrees <= 0) return rotation
  const axis = Vector3.scale(angularVelocity, 1 / speed)
  const spun = Quaternion.normalize(Quaternion.multiply(Quaternion.fromAngleAxis(degrees, axis), rotation))
  return { x: spun.x, y: spun.y, z: spun.z, w: spun.w }
}

function ShipMotionServerSystem(dt: number): void {
  const step = Math.min(Math.max(dt, 0), SIMULATION_MAX_DELTA_SECONDS)
  const state = getGameState()
  const offset = averagePlayerOffset()
  const targetPitch = offset ? tiltDegrees(offset.z) : 0
  const targetRoll = offset ? -tiltDegrees(offset.x) : 0
  const pitch = smoothAngle(state.shipPitch, targetPitch, step)
  const roll = smoothAngle(state.shipRoll, targetRoll, step)
  const angularVelocity = planetAngularVelocity(pitch, roll)
  const planetRotation = integrateRotation(state.planetRotation, angularVelocity, step)
  const velocityUnchanged =
    angularVelocity.x === state.planetAngularVelocity.x &&
    angularVelocity.y === state.planetAngularVelocity.y &&
    angularVelocity.z === state.planetAngularVelocity.z

  // Same object means the planet did not spin. Skip the sync when the tilt and velocity are unchanged too.
  if (
    pitch === state.shipPitch &&
    roll === state.shipRoll &&
    planetRotation === state.planetRotation &&
    velocityUnchanged
  ) {
    return
  }

  applyShipMotion(pitch, roll, planetRotation, angularVelocity)
}

function findSceneBodies(): boolean {
  if (shipEntity !== null && planetEntity !== null) {
    if (Transform.getOrNull(shipEntity) && Transform.getOrNull(planetEntity)) return true
    shipEntity = null
    planetEntity = null
  }

  for (const [entity, name] of engine.getEntitiesWith(Name, Transform)) {
    if (name.value === EntityNames.Ship) shipEntity = entity
    else if (name.value === EntityNames.Planet) planetEntity = entity
  }
  return shipEntity !== null && planetEntity !== null
}

function applyRotation(entity: Entity, rotation: PlanetRotationSnapshot): void {
  const current = Transform.getOrNull(entity)
  if (!current) return
  const currentRotation = current.rotation
  if (
    currentRotation.x === rotation.x &&
    currentRotation.y === rotation.y &&
    currentRotation.z === rotation.z &&
    currentRotation.w === rotation.w
  ) {
    return
  }
  Transform.getMutable(entity).rotation = rotation
}

/**
 * Spin ahead with the synced angular velocity, then ease toward the synced orientation
 * so a late update does not step the planet.
 */
function smoothPlanetRotation(
  target: PlanetRotationSnapshot,
  angularVelocity: PlanetAngularVelocitySnapshot,
  dt: number
): PlanetRotationSnapshot {
  if (!displayedPlanetRotation) {
    displayedPlanetRotation = { x: target.x, y: target.y, z: target.z, w: target.w }
    return displayedPlanetRotation
  }

  const step = Math.min(Math.max(dt, 0), SIMULATION_MAX_DELTA_SECONDS)
  const predicted = integrateRotation(displayedPlanetRotation, angularVelocity, step)
  const blend = 1 - Math.exp(-step / PLANET_ROTATION_BLEND_SECONDS)
  const smoothed = Quaternion.normalize(Quaternion.slerp(predicted, target, blend))
  displayedPlanetRotation = { x: smoothed.x, y: smoothed.y, z: smoothed.z, w: smoothed.w }
  return displayedPlanetRotation
}

function ShipMotionClientSystem(dt: number): void {
  if (!findSceneBodies() || shipEntity === null || planetEntity === null) return
  if (!hasBoundGameState()) {
    displayedPlanetRotation = null
    return
  }

  const state = getGameState()
  applyRotation(shipEntity, shipTiltQuaternion(state.shipPitch, state.shipRoll))
  applyRotation(planetEntity, smoothPlanetRotation(state.planetRotation, state.planetAngularVelocity, dt))
}

export function setupShipMotion(): void {
  shipEntity = null
  planetEntity = null
  displayedPlanetRotation = null
  if (isServer()) {
    engine.addSystem(ShipMotionServerSystem)
    return
  }
  engine.addSystem(ShipMotionClientSystem)
}
