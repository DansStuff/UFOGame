/**
 * Players standing off the ship center set its speed and tilt. The server
 * reads them in normalizedShipSpeed, eases that into GameState, and spins the
 * planet as if the ship were flying that way over the surface. Clients apply
 * the tilt directly and ease the planet toward the synced spin.
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
/** Snap the 0..1 speed once it is this close. */
const SHIP_SPEED_SNAP = 0.001

let shipEntity: Entity | null = null
let planetEntity: Entity | null = null
/** Client-only display pose. Seeded from the first synced orientation, then eased. */
let displayedPlanetRotation: PlanetRotationSnapshot | null = null
/**
 * Lean, in degrees, from the same player sample as the last normalizedShipSpeed() call.
 * Positive pitch dips +Z. Negative roll dips +X.
 */
let sampledShipPitch = 0
let sampledShipRoll = 0

function smoothToward(current: number, target: number, dt: number, snap: number): number {
  const delta = target - current
  if (Math.abs(delta) <= snap) return target
  const blend = 1 - Math.exp(-dt / SHIP_TILT_SMOOTH_SECONDS)
  return current + delta * blend
}

/**
 * Signed share of one axis of an averaged player offset.
 * 0 inside the deadzone, ±1 once the offset reaches the influence radius.
 */
function axisInfluence(offset: number): number {
  const magnitude = Math.abs(offset)
  if (magnitude <= SHIP_TILT_DEADZONE) return 0
  const ranged = Math.min((magnitude - SHIP_TILT_DEADZONE) / SHIP_TILT_INFLUENCE_RADIUS, 1)
  return Math.sign(offset) * ranged
}

/**
 * Players currently in the scene, averaged, mapped to a ship speed.
 * People inside the safe radius are left out. If nobody is outside it, the speed is 0.
 * Each axis of the average runs through axisInfluence. The returned speed is the
 * length of that pair, clamped to 0..1. Edit that expression to retune the curve.
 * Top speed is applied by the caller.
 */
export function normalizedShipSpeed(): number {
  sampledShipPitch = 0
  sampledShipRoll = 0

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
  if (count === 0) return 0

  const influenceX = axisInfluence(sumX / count)
  const influenceZ = axisInfluence(sumZ / count)
  sampledShipPitch = influenceZ * SHIP_TILT_MAX_DEGREES
  sampledShipRoll = -influenceX * SHIP_TILT_MAX_DEGREES
  return Math.min(Math.hypot(influenceX, influenceZ), 1)
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

/** 0..1 speed already written into the synced spin, so the next step can ease from it. */
function syncedSpeedFraction(velocity: PlanetAngularVelocitySnapshot): number {
  if (PLANET_SPIN_MAX_DEGREES_PER_SECOND <= 0) return 0
  const speed = Math.hypot(velocity.x, velocity.y, velocity.z)
  return Math.min(Math.max(speed / PLANET_SPIN_MAX_DEGREES_PER_SECOND, 0), 1)
}

/**
 * World-space spin, in degrees per second.
 * Direction follows the tilt: a dip toward +X flies toward +X, and the surface scrolls toward -X.
 * `speedFraction` is 0..1 from normalizedShipSpeed. Top speed scales it here.
 */
function planetAngularVelocity(
  pitch: number,
  roll: number,
  speedFraction: number
): PlanetAngularVelocitySnapshot {
  const fraction = Math.min(Math.max(speedFraction, 0), 1)
  const travelX = -roll
  const travelZ = pitch
  const travel = Math.hypot(travelX, travelZ)
  if (fraction <= 0 || travel < 0.001) return { x: 0, y: 0, z: 0 }
  const speed = fraction * PLANET_SPIN_MAX_DEGREES_PER_SECOND
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
  const targetSpeed = normalizedShipSpeed()
  const pitch = smoothToward(state.shipPitch, sampledShipPitch, step, SHIP_TILT_SNAP_DEGREES)
  const roll = smoothToward(state.shipRoll, sampledShipRoll, step, SHIP_TILT_SNAP_DEGREES)
  const speed = smoothToward(syncedSpeedFraction(state.planetAngularVelocity), targetSpeed, step, SHIP_SPEED_SNAP)
  const angularVelocity = planetAngularVelocity(pitch, roll, speed)
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
  sampledShipPitch = 0
  sampledShipRoll = 0
  if (isServer()) {
    engine.addSystem(ShipMotionServerSystem)
    return
  }
  engine.addSystem(ShipMotionClientSystem)
}
