/**
 * The saucer stays in place and the planet spins under it. Wind planes are
 * parented to the planet, in meters from the planet center, so they swing
 * with the surface. While the ship is moving fast enough, planes spawn ahead of it,
 * around the travel axis, on the sides, top, and bottom. The cylinder along that
 * axis stays empty. Their normal faces away from the planet center,
 * and their forward axis keeps turning to match the ship's current travel.
 * Spawn rate follows the ship's current speed. Length follows that speed and
 * each plane's age. Width starts at full size and
 * shrinks to zero over the plane's life. Color stays as spawned.
 * Direction and speed are sampled once per frame onto WindFlight, which is not synced.
 */
import {
  engine,
  Entity,
  Material,
  MaterialTransparencyMode,
  MeshRenderer,
  Name,
  Schemas,
  Transform
} from '@dcl/sdk/ecs'
import { Color4, Quaternion, Vector3 } from '@dcl/sdk/math'
import { isServer } from '@dcl/sdk/network'
import { EntityNames } from '../../assets/scene/entity-names'
import {
  PLANET_SPIN_MAX_DEGREES_PER_SECOND,
  SIMULATION_MAX_DELTA_SECONDS,
  WIND_COLOR_ALPHA,
  WIND_COLOR_BLUE,
  WIND_COLOR_GREEN,
  WIND_COLOR_RED,
  WIND_MIN_SPEED_METERS_PER_SECOND,
  WIND_PLANE_LIFETIME_SECONDS,
  WIND_PLANE_MAX_LENGTH_METERS,
  WIND_PLANE_SIZE_METERS,
  WIND_SPAWN_AHEAD_METERS,
  WIND_SPAWN_ALONG_HALF_LENGTH_METERS,
  WIND_SPAWN_INNER_RADIUS_METERS,
  WIND_SPAWN_INTERVAL_SECONDS,
  WIND_SPAWN_OUTER_RADIUS_METERS
} from '../constants'

/** One wind plane. Age narrows it from full width to zero, then removes it. */
export const WindPlane = engine.defineComponent('wind:Plane', {
  age: Schemas.Float
})

/**
 * This client's flight sample for the wind. Written once per frame.
 * It is never passed to syncEntity, so it stays on this client.
 */
export const WindFlight = engine.defineComponent('wind:Flight', {
  hasBodies: Schemas.Boolean,
  /** Planet the planes are parented to. Meaningful when hasBodies is set. */
  planet: Schemas.Entity,
  /** False until two positions exist, so speed is meaningful. */
  hasSample: Schemas.Boolean,
  /** Apparent speed, meters per second. */
  speed: Schemas.Float,
  /** 0 when stopped, 1 at max spin speed. */
  speedFraction: Schemas.Float,
  /** Streak length from speed, before each plane's age scale. */
  length: Schemas.Float,
  /** This frame is fast enough, and moved far enough, to spawn. */
  moving: Schemas.Boolean,
  /** False until the ship has moved enough to read a direction. */
  hasDirection: Schemas.Boolean,
  /** Unit travel in planet space. Kept from the last real step when the ship is nearly still. */
  direction: Schemas.Vector3,
  /** Planet-space ship center this frame. */
  shipLocal: Schemas.Vector3,
  /** Planet-space ship center last frame. */
  previousShipLocal: Schemas.Vector3,
  spawnAccumulator: Schemas.Float
})

let flightEntity: Entity | null = null
let shipEntity: Entity | null = null
let planetEntity: Entity | null = null

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

/** Unit quaternions invert by conjugation. */
function unrotate(rotation: Quaternion, vector: Vector3): Vector3 {
  const normalized = Quaternion.normalize(rotation)
  const inverse = Quaternion.create(-normalized.x, -normalized.y, -normalized.z, normalized.w)
  return Vector3.rotate(vector, inverse)
}

/** Scene point in planet space. Wind planes are children of the planet, so samples are stored there. */
function planetLocalPoint(planetPosition: Vector3, planetRotation: Quaternion, worldPoint: Vector3): Vector3 {
  return unrotate(planetRotation, Vector3.subtract(worldPoint, planetPosition))
}

/**
 * A point on the planet surface, `arcMeters` ahead of the ship along travel.
 * Rotating about the planet center keeps the step tangent to the surface.
 */
function pointAheadOnSurface(shipLocal: Vector3, travelDirection: Vector3, arcMeters: number): Vector3 {
  const radius = Vector3.length(shipLocal)
  if (radius < 1e-6) return Vector3.create(shipLocal.x, shipLocal.y, shipLocal.z)
  const forward = tangentForward(shipLocal, travelDirection)
  const outward = Vector3.scale(shipLocal, 1 / radius)
  const axis = Vector3.cross(outward, forward)
  const degrees = (arcMeters / radius) * (180 / Math.PI)
  return Vector3.rotate(shipLocal, Quaternion.fromAngleAxis(degrees, axis))
}

/**
 * Uniform point in the cylindrical shell around the travel tangent, in planet space.
 * The shell is centered ahead of the ship on the planet surface. Distance from
 * that tangent stays between the inner and outer radii, and the sample slides
 * forward or back along the surface within the along range.
 */
function randomPointAroundTravel(shipLocal: Vector3, travelDirection: Vector3): Vector3 {
  const halfLength = Math.max(WIND_SPAWN_ALONG_HALF_LENGTH_METERS, 0)
  const along = (Math.random() * 2 - 1) * halfLength
  const ahead = pointAheadOnSurface(shipLocal, travelDirection, WIND_SPAWN_AHEAD_METERS + along)
  const outward = outwardDirection(ahead)
  const forward = tangentForward(ahead, travelDirection)
  const side = Vector3.normalize(Vector3.cross(outward, forward))

  const inner = Math.max(WIND_SPAWN_INNER_RADIUS_METERS, 0)
  const outer = Math.max(WIND_SPAWN_OUTER_RADIUS_METERS, inner)
  const radius = Math.sqrt(inner * inner + Math.random() * (outer * outer - inner * inner))
  const angle = Math.random() * Math.PI * 2

  const offset = Vector3.add(
    Vector3.scale(side, Math.cos(angle) * radius),
    Vector3.scale(outward, Math.sin(angle) * radius)
  )
  return Vector3.add(ahead, offset)
}

/** Unit radial at a planet-space point. The plane normal points this way. */
function outwardDirection(position: Vector3): Vector3 {
  return Vector3.lengthSquared(position) < 1e-8 ? Vector3.Up() : Vector3.normalize(position)
}

/**
 * Ship travel laid on the tangent plane.
 * The primitive plane's local +Y is this axis.
 */
function tangentForward(position: Vector3, travel: Vector3): Vector3 {
  const outward = outwardDirection(position)
  const radial = Vector3.dot(travel, outward)
  let forward = Vector3.subtract(travel, Vector3.scale(outward, radial))
  if (Vector3.lengthSquared(forward) < 1e-8) {
    const axis = Math.abs(outward.y) < 0.9 ? Vector3.Up() : Vector3.Forward()
    forward = Vector3.cross(outward, axis)
  }
  return Vector3.normalize(forward)
}

/** 0 when stopped, 1 at max spin speed. */
function speedFraction(speed: number, shipRadius: number): number {
  const maxSpeed = shipRadius * PLANET_SPIN_MAX_DEGREES_PER_SECOND * (Math.PI / 180)
  if (maxSpeed <= 0) return 0
  return Math.min(Math.max(speed / maxSpeed, 0), 1)
}

/** 0 at spawn, 1 at the end of the life. Length and width both use this. */
function lifetimeFraction(age: number): number {
  if (WIND_PLANE_LIFETIME_SECONDS <= 0) return 1
  return Math.min(Math.max(age / WIND_PLANE_LIFETIME_SECONDS, 0), 1)
}

function spawnWindPlane(planet: Entity, position: Vector3, travel: Vector3): void {
  const entity = engine.addEntity()
  const forward = tangentForward(position, travel)
  WindPlane.create(entity, { age: 0 })
  Transform.create(entity, {
    parent: planet,
    position: Vector3.create(position.x, position.y, position.z),
    rotation: Quaternion.lookRotation(outwardDirection(position), forward),
    scale: Vector3.create(WIND_PLANE_SIZE_METERS, 0, 1)
  })
  MeshRenderer.setPlane(entity)
  Material.setPbrMaterial(entity, {
    albedoColor: Color4.create(WIND_COLOR_RED, WIND_COLOR_GREEN, WIND_COLOR_BLUE, WIND_COLOR_ALPHA),
    metallic: 0,
    roughness: 1,
    specularIntensity: 0,
    transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND,
    castShadows: false
  })
}

function copyVector(target: { x: number; y: number; z: number }, source: { x: number; y: number; z: number }): void {
  target.x = source.x
  target.y = source.y
  target.z = source.z
}

/** Points the plane's long axis along travel, tangent to the planet at its position. */
function alignPlaneToTravel(transform: { position: Vector3; rotation: Quaternion }, travel: Vector3): void {
  const forward = tangentForward(transform.position, travel)
  transform.rotation = Quaternion.lookRotation(outwardDirection(transform.position), forward)
}

/** Samples direction, speed, and streak length once and writes them onto WindFlight. */
function WindFlightSystem(dt: number): void {
  if (flightEntity === null) return
  const flight = WindFlight.getMutable(flightEntity)
  if (!findSceneBodies() || shipEntity === null || planetEntity === null) {
    flight.hasBodies = false
    flight.hasSample = false
    flight.hasDirection = false
    flight.moving = false
    flight.speed = 0
    flight.speedFraction = 0
    flight.length = 0.001
    flight.spawnAccumulator = 0
    return
  }

  flight.hasBodies = true
  flight.planet = planetEntity
  const planet = Transform.get(planetEntity)
  const ship = Transform.get(shipEntity)
  const shipLocal = planetLocalPoint(planet.position, planet.rotation, ship.position)
  copyVector(flight.shipLocal, shipLocal)
  if (!flight.hasSample || dt <= 0) {
    copyVector(flight.previousShipLocal, shipLocal)
    flight.hasSample = true
    flight.moving = false
    return
  }

  const dx = shipLocal.x - flight.previousShipLocal.x
  const dy = shipLocal.y - flight.previousShipLocal.y
  const dz = shipLocal.z - flight.previousShipLocal.z
  copyVector(flight.previousShipLocal, shipLocal)
  const distance = Math.hypot(dx, dy, dz)
  const speed = distance / dt
  const fraction = speedFraction(speed, Math.hypot(shipLocal.x, shipLocal.y, shipLocal.z))
  flight.speed = speed
  flight.speedFraction = fraction
  flight.length = Math.max(WIND_PLANE_MAX_LENGTH_METERS * fraction, 0.001)
  flight.moving = distance >= 1e-4 && speed >= WIND_MIN_SPEED_METERS_PER_SECOND
  if (distance >= 1e-4) {
    flight.direction.x = dx / distance
    flight.direction.y = dy / distance
    flight.direction.z = dz / distance
    flight.hasDirection = true
  }
}

/** Spawns one plane from this frame's flight sample when the ship is moving fast enough. */
function WindSpawnSystem(dt: number): void {
  if (flightEntity === null) return
  const flight = WindFlight.getMutable(flightEntity)
  if (!flight.hasBodies || !flight.moving || !flight.hasDirection) {
    flight.spawnAccumulator = 0
    return
  }

  const step = Math.min(dt, SIMULATION_MAX_DELTA_SECONDS)
  flight.spawnAccumulator += step * flight.speedFraction
  if (flight.spawnAccumulator < WIND_SPAWN_INTERVAL_SECONDS) return
  flight.spawnAccumulator -= WIND_SPAWN_INTERVAL_SECONDS

  const position = randomPointAroundTravel(flight.shipLocal, flight.direction)
  spawnWindPlane(flight.planet, position, flight.direction)
}

/** Narrows and aligns every wind plane, then removes the ones past their lifetime. */
function WindPlaneSystem(dt: number): void {
  const step = Math.min(Math.max(dt, 0), SIMULATION_MAX_DELTA_SECONDS)
  const flight = flightEntity === null ? null : WindFlight.getOrNull(flightEntity)
  const length = flight ? flight.length : 0.001
  const travel = flight && flight.hasDirection ? flight.direction : null
  const expired: Entity[] = []

  for (const [entity] of engine.getEntitiesWith(WindPlane, Transform)) {
    const plane = WindPlane.getMutable(entity)
    plane.age += step
    if (plane.age >= WIND_PLANE_LIFETIME_SECONDS) {
      expired.push(entity)
      continue
    }

    const lived = lifetimeFraction(plane.age)
    const transform = Transform.getMutable(entity)
    transform.scale.x = WIND_PLANE_SIZE_METERS * (1 - lived)
    transform.scale.y = length * lived
    if (travel) alignPlaneToTravel(transform, travel)
  }

  for (const entity of expired) engine.removeEntity(entity)
}

export function setupShipWind(): void {
  if (isServer()) return
  flightEntity = engine.addEntity()
  WindFlight.create(flightEntity, {
    hasBodies: false,
    planet: 0 as Entity,
    hasSample: false,
    speed: 0,
    speedFraction: 0,
    length: 0.001,
    moving: false,
    hasDirection: false,
    direction: Vector3.create(0, 0, 0),
    shipLocal: Vector3.create(0, 0, 0),
    previousShipLocal: Vector3.create(0, 0, 0),
    spawnAccumulator: 0
  })
  engine.addSystem(WindFlightSystem)
  engine.addSystem(WindSpawnSystem)
  engine.addSystem(WindPlaneSystem)
}
