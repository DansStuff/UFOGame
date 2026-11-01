/**
 * The saucer stays in place and the planet spins under it, so a trail cannot
 * follow a moving ship. Planes are parented to the planet, in meters from the
 * planet center, and swing away as it turns. One queue starts at the ship center.
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
import { Color3, Color4, Quaternion, Vector3 } from '@dcl/sdk/math'
import { isServer } from '@dcl/sdk/network'
import { EntityNames } from '../assets/scene/entity-names'
import {
  SIMULATION_MAX_DELTA_SECONDS,
  TRAIL_COLOR_BLUE,
  TRAIL_COLOR_GREEN,
  TRAIL_COLOR_RED,
  TRAIL_EMISSIVE_INTENSITY,
  TRAIL_SEGMENT_LENGTH_METERS,
  TRAIL_SEGMENT_LIFETIME_SECONDS,
  TRAIL_SEGMENT_MIN_LENGTH_METERS,
  TRAIL_WIDTH_METERS
} from './constants'

/**
 * One plane in the trail queue. Endpoints are meters from the planet center,
 * in planet space, so the plane stays on the surface as the planet spins.
 */
export const TrailSegment = engine.defineComponent('trail:Segment', {
  age: Schemas.Float,
  start: Schemas.Vector3,
  end: Schemas.Vector3
})

/** Oldest first. The last entry is the open plane that still reaches the ship. */
const segmentQueue: Entity[] = []
let trailRoot: Entity | null = null
let shipEntity: Entity | null = null
let planetEntity: Entity | null = null
let openStart: Vector3 | null = null
let openSegment: Entity | null = null

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

/**
 * The planet mesh is scaled up. This child cancels that scale so trail
 * positions and plane sizes stay in meters.
 */
function ensureTrailRoot(planet: Entity): Entity {
  if (trailRoot !== null && Transform.getOrNull(trailRoot)) return trailRoot
  const scale = Transform.get(planet).scale
  trailRoot = engine.addEntity()
  Transform.create(trailRoot, {
    parent: planet,
    position: Vector3.Zero(),
    rotation: Quaternion.Identity(),
    scale: Vector3.create(
      scale.x !== 0 ? 1 / scale.x : 1,
      scale.y !== 0 ? 1 / scale.y : 1,
      scale.z !== 0 ? 1 / scale.z : 1
    )
  })
  return trailRoot
}

/** Unit quaternions invert by conjugation. Planet rotations are stored normalized. */
function rotationInverse(rotation: Quaternion): Quaternion {
  const normalized = Quaternion.normalize(rotation)
  return Quaternion.create(-normalized.x, -normalized.y, -normalized.z, normalized.w)
}

/** Meters from the planet entity's position, expressed in the planet's axes. */
function planetLocalMeters(planetPosition: Vector3, planetRotation: Quaternion, worldPoint: Vector3): Vector3 {
  return Vector3.rotate(Vector3.subtract(worldPoint, planetPosition), rotationInverse(planetRotation))
}

function copyVector(target: { x: number; y: number; z: number }, value: Vector3): void {
  target.x = value.x
  target.y = value.y
  target.z = value.z
}

/**
 * The plane is assumed to lie on local XZ, so local +Y is its normal.
 * That normal is the radial up: opposite the direction toward the planet center.
 * Length runs along local +Z. If a test shows the quads edge-on, those axes are swapped.
 */
function applySegmentPose(entity: Entity): void {
  const segment = TrailSegment.get(entity)
  const chord = Vector3.subtract(segment.end, segment.start)
  const length = Vector3.length(chord)
  if (length < 1e-4) return

  const along = Vector3.scale(chord, 1 / length)
  const midpoint = Vector3.scale(Vector3.add(segment.start, segment.end), 0.5)
  let up = Vector3.lengthSquared(midpoint) < 1e-8 ? Vector3.Up() : Vector3.normalize(midpoint)
  if (Vector3.lengthSquared(Vector3.cross(up, along)) < 1e-8) {
    up = Math.abs(along.y) < 0.9 ? Vector3.Up() : Vector3.Forward()
  }

  const transform = Transform.getMutable(entity)
  transform.position = midpoint
  transform.rotation = Quaternion.lookRotation(along, up)
  transform.scale = Vector3.create(TRAIL_WIDTH_METERS, 1, length)
}

function spawnSegment(parent: Entity, start: Vector3, end: Vector3): Entity {
  const entity = engine.addEntity()
  TrailSegment.create(entity, {
    age: 0,
    start: Vector3.create(start.x, start.y, start.z),
    end: Vector3.create(end.x, end.y, end.z)
  })
  Transform.create(entity, { parent })
  MeshRenderer.setPlane(entity)
  Material.setPbrMaterial(entity, {
    albedoColor: Color4.create(TRAIL_COLOR_RED, TRAIL_COLOR_GREEN, TRAIL_COLOR_BLUE, 1),
    emissiveColor: Color3.create(TRAIL_COLOR_RED, TRAIL_COLOR_GREEN, TRAIL_COLOR_BLUE),
    emissiveIntensity: TRAIL_EMISSIVE_INTENSITY,
    metallic: 0,
    roughness: 1,
    specularIntensity: 0,
    transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND,
    castShadows: false
  })
  applySegmentPose(entity)
  return entity
}

function commitOpenSegment(parent: Entity, end: Vector3): void {
  if (openSegment) {
    copyVector(TrailSegment.getMutable(openSegment).end, end)
    applySegmentPose(openSegment)
    openSegment = null
  } else {
    segmentQueue.push(spawnSegment(parent, openStart ?? end, end))
  }
  openStart = Vector3.create(end.x, end.y, end.z)
}

/** Grow the open plane to the ship, committing full-length planes into the queue. */
function extendTrail(parent: Entity, current: Vector3): void {
  if (!openStart) {
    openStart = Vector3.create(current.x, current.y, current.z)
    return
  }

  let distance = Vector3.distance(openStart, current)
  while (distance >= TRAIL_SEGMENT_LENGTH_METERS) {
    const direction = Vector3.scale(Vector3.subtract(current, openStart), 1 / distance)
    const end = Vector3.add(openStart, Vector3.scale(direction, TRAIL_SEGMENT_LENGTH_METERS))
    commitOpenSegment(parent, end)
    distance = Vector3.distance(openStart, current)
  }

  if (distance < TRAIL_SEGMENT_MIN_LENGTH_METERS) return

  if (!openSegment) {
    openSegment = spawnSegment(parent, openStart, current)
    segmentQueue.push(openSegment)
    return
  }

  copyVector(TrailSegment.getMutable(openSegment).end, current)
  applySegmentPose(openSegment)
}

function ShipTrailExtendSystem(): void {
  if (!findSceneBodies() || shipEntity === null || planetEntity === null) return
  const planet = Transform.get(planetEntity)
  const ship = Transform.get(shipEntity)
  extendTrail(ensureTrailRoot(planetEntity), planetLocalMeters(planet.position, planet.rotation, ship.position))
}

/** Ages every queued plane and drops the ones that have reached their lifetime. */
function TrailSegmentLifetimeSystem(dt: number): void {
  if (segmentQueue.length === 0) return
  const step = Math.min(Math.max(dt, 0), SIMULATION_MAX_DELTA_SECONDS)

  for (const entity of segmentQueue) {
    const segment = TrailSegment.getMutable(entity)
    segment.age += step
    const alpha = Math.max(0, 1 - segment.age / TRAIL_SEGMENT_LIFETIME_SECONDS)
    const material = Material.getFlatMutable(entity)
    material.albedoColor = Color4.create(TRAIL_COLOR_RED, TRAIL_COLOR_GREEN, TRAIL_COLOR_BLUE, alpha)
    material.emissiveIntensity = TRAIL_EMISSIVE_INTENSITY * alpha
  }

  while (segmentQueue.length > 0 && TrailSegment.get(segmentQueue[0]).age >= TRAIL_SEGMENT_LIFETIME_SECONDS) {
    const entity = segmentQueue.shift()
    if (!entity) break
    if (entity === openSegment) {
      openSegment = null
      openStart = null
    }
    engine.removeEntity(entity)
  }
}

export function setupShipTrail(): void {
  if (isServer()) return
  engine.addSystem(ShipTrailExtendSystem)
  engine.addSystem(TrailSegmentLifetimeSystem)
}
