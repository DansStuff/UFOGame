/**
 * Server-only. Checks whether the ship is over the cow with the shared surface-zone math.
 * A lift starts within the angle limit while the abduction beam is on, and the cow
 * then rides the ship. The beam follows ship speed, so flying too fast turns it off,
 * which releases the cow to fall onto the planet where the ship carried it.
 */
import { engine, Entity, getWorldPosition } from '@dcl/sdk/ecs'
import { Vector3 } from '@dcl/sdk/math'
import { EntityNames } from '../../assets/scene/entity-names'
import {
  ABDUCTABLE_FALL_GRAVITY_METERS_PER_SECOND_SQUARED,
  ABDUCTABLE_LIFT_ABOVE_SHIP_METERS,
  ABDUCTABLE_LIFT_MAX_ANGLE_DEGREES,
  ABDUCTABLE_LIFT_METERS_PER_SECOND,
  ABDUCTABLE_MODELS,
  ABDUCTABLE_PLACEMENT_ATTEMPTS,
  PLANET_SURFACE_RADIUS_METERS
} from './constants'
import {
  applyAbductableDirection,
  applyAbductableOnShip,
  applyAbductablePlacement,
  applyAbductableYOffset,
  getGameState,
  type AbductableDirectionSnapshot,
  type GameStateSnapshot
} from '../gamestate'
import { abductionBeamOn } from '../ship/speed'
import {
  captureShipCarry,
  planetDirectionOfWorld,
  tiltOf,
  worldOfShipLocal,
  type ShipCarry
} from './frames'
import { hasPlacement, outwardDirection, randomSurfaceDirection, sameDirection, simulationStep } from './geometry'
import { findNamed, findPlanet } from './sceneLookup'
import { isInLandmarkZone, shipSpawnDirection } from '../planetProps/landmarks'
import { cosOfDegrees, isWithinCos, shipPlanetDirection } from '../surfaceZones/geometry'

const LIFT_MAX_COS = cosOfDegrees(ABDUCTABLE_LIFT_MAX_ANGLE_DEGREES)

let serverCarry: ShipCarry | null = null

/** Downward speed while falling. Server-only, so clients follow the synced height. */
let fallSpeedMetersPerSecond = 0

export function resetLift(): void {
  serverCarry = null
  fallSpeedMetersPerSecond = 0
}

/**
 * A random surface direction outside every landmark sign's zone. If every pick lands in one,
 * the point opposite the ship spawn is used: the signs sit 90 degrees from spawn, so it is clear of them.
 */
function pickAbductableDirection(): AbductableDirectionSnapshot {
  for (let attempt = 0; attempt < ABDUCTABLE_PLACEMENT_ATTEMPTS; attempt++) {
    const random = randomSurfaceDirection()
    if (!isInLandmarkZone(Vector3.create(random.x, random.y, random.z))) return random
  }
  const opposite = Vector3.scale(shipSpawnDirection(), -1)
  return { x: opposite.x, y: opposite.y, z: opposite.z }
}

/** Drops the current cow and places a new one on the surface, never inside a landmark sign's zone. */
export function replaceAbductable(): void {
  resetLift()
  applyAbductablePlacement(pickAbductableDirection(), ABDUCTABLE_MODELS[0]?.samples ?? 0)
}

/** Meters from the surface to just above the ship, along a ray from the planet center. */
function liftTargetMeters(planet: Entity, ship: Entity): number {
  const gap = Vector3.length(Vector3.subtract(getWorldPosition(engine, ship), getWorldPosition(engine, planet)))
  return Math.max(0, gap + ABDUCTABLE_LIFT_ABOVE_SHIP_METERS - PLANET_SURFACE_RADIUS_METERS)
}

/** Writes the planet direction under the carried point, so the cow lands where the ship took it. */
function writeCarriedDirection(planet: Entity, ship: Entity, state: GameStateSnapshot, yOffset: number): void {
  if (serverCarry === null) return
  const world = worldOfShipLocal(
    ship,
    tiltOf(state),
    Vector3.create(serverCarry.localX, serverCarry.baseY + yOffset, serverCarry.localZ)
  )
  const direction = planetDirectionOfWorld(planet, state.planetRotation, world)
  if (direction === null || sameDirection(direction, state.abductableDirection)) return
  applyAbductableDirection(direction)
}

function raiseCarry(dt: number, planet: Entity, ship: Entity): void {
  const state = getGameState()
  const target = liftTargetMeters(planet, ship)
  let yOffset = state.abductableYOffset
  if (yOffset < target) {
    const next = Math.min(target, yOffset + ABDUCTABLE_LIFT_METERS_PER_SECOND * simulationStep(dt))
    if (next !== yOffset) {
      applyAbductableYOffset(next)
      yOffset = next
    }
  }
  writeCarriedDirection(planet, ship, state, yOffset)
}

/** Lets go of the ship. The current y offset is the height the fall starts from. */
function releaseCarry(planet: Entity, ship: Entity): void {
  const state = getGameState()
  if (serverCarry === null) serverCarry = captureShipCarry(planet, ship, state)
  writeCarriedDirection(planet, ship, state, state.abductableYOffset)
  resetLift()
  if (state.abductableOnShip) applyAbductableOnShip(false)
}

/** Speeds y offset toward the surface while the cow is not being abducted. */
function fallTowardSurface(dt: number): void {
  const state = getGameState()
  if (state.abductableYOffset <= 0) {
    fallSpeedMetersPerSecond = 0
    return
  }
  const step = simulationStep(dt)
  fallSpeedMetersPerSecond += ABDUCTABLE_FALL_GRAVITY_METERS_PER_SECOND_SQUARED * step
  const next = Math.max(0, state.abductableYOffset - fallSpeedMetersPerSecond * step)
  if (next !== state.abductableYOffset) applyAbductableYOffset(next)
  if (next === 0) fallSpeedMetersPerSecond = 0
}

export function AbductableAngleSystem(dt: number): void {
  const state = getGameState()
  if (state.abductableId === 0 || !hasPlacement(state.abductableDirection)) return

  const ship = findNamed(EntityNames.Ship)
  const planet = findPlanet()
  if (ship === null || planet === null) return

  const shipDirection = shipPlanetDirection(planet, ship, state.planetRotation)
  if (shipDirection === null) return

  if (state.abductableOnShip) {
    if (serverCarry === null) serverCarry = captureShipCarry(planet, ship, state)
    if (!abductionBeamOn()) {
      releaseCarry(planet, ship)
      fallTowardSurface(dt)
      return
    }
    raiseCarry(dt, planet, ship)
    return
  }

  if (state.abductableYOffset > 0) {
    fallTowardSurface(dt)
    return
  }

  const overCow = isWithinCos(shipDirection, outwardDirection(state.abductableDirection), LIFT_MAX_COS)
  if (!overCow || !abductionBeamOn()) return
  fallSpeedMetersPerSecond = 0
  serverCarry = captureShipCarry(planet, ship, state)
  applyAbductableOnShip(true)
  raiseCarry(dt, planet, ship)
}
