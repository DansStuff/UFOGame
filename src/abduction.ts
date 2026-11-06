/**
 * The abductable is a cow on the planet surface. The server picks a direction
 * once, stores it on GameState with a spawn id, and keeps the angle from the
 * planet center up to date. Each client parents the cow to the planet along
 * that ray, so it spins with the surface. A new id replaces the cow. Local up
 * points away from the planet origin. A lift starts within the angle limit
 * while the abduction beam is on, and parents the cow to the ship. The beam
 * follows ship speed, which is derived from the synced planet spin. Above that
 * speed the cow is released and falls toward the planet where the ship carried it. Clients add
 * the y offset to the surface radius, or to the ship-local height captured at
 * the grab. While it is off the surface, each client tumbles it around a random
 * axis and eases it toward the ship center. Neither of those is synced.
 * RedArrow rides a horizontal ring around the ship and points along the
 * horizontal direction from the ship to the cow. AbductableArrow is a child
 * of the planet, placed above the cow along the cow's up. It shows while the synced angle stays
 * inside the outer limit and outside the inner one. Inside the inner limit
 * both arrows hide. RedArrow shows past the outer limit.
 */
import {
  Animator,
  ColliderLayer,
  engine,
  Entity,
  getWorldPosition,
  getWorldRotation,
  GltfContainer,
  InputAction,
  Name,
  PointerEvents,
  PointerEventType,
  Schemas,
  Transform,
  VisibilityComponent
} from '@dcl/sdk/ecs'
import { Quaternion, Vector3 } from '@dcl/sdk/math'
import { isServer } from '@dcl/sdk/network'
import { EntityNames } from '../assets/scene/entity-names'
import {
  ABDUCTABLE_ARROW_MAX_ANGLE_DEGREES,
  ABDUCTABLE_CENTER_METERS_PER_SECOND,
  ABDUCTABLE_FALL_GRAVITY_METERS_PER_SECOND_SQUARED,
  ABDUCTABLE_HOVER_TEXT,
  ABDUCTABLE_LIFT_ABOVE_SHIP_METERS,
  ABDUCTABLE_LIFT_MAX_ANGLE_DEGREES,
  ABDUCTABLE_LIFT_METERS_PER_SECOND,
  ABDUCTABLE_MODELS,
  ABDUCTABLE_POINTER_MAX_DISTANCE_METERS,
  ABDUCTABLE_SPIN_DEGREES_PER_SECOND,
  ARROW_HIDE_ANGLE_DEGREES,
  PLANET_SURFACE_RADIUS_METERS,
  RED_ARROW_RING_Y,
  SIMULATION_MAX_DELTA_SECONDS
} from './constants'
import {
  applyAbductableAngularOffset,
  applyAbductableDirection,
  applyAbductableOnShip,
  applyAbductablePlacement,
  applyAbductableYOffset,
  getGameState,
  type AbductableDirectionSnapshot,
  type GameStateSnapshot,
  type PlanetRotationSnapshot
} from './gamestate'
import { shipTiltQuaternion } from './shipMotion'
import { abductionBeamOn } from './shipSpeed'

/** The cow. `angularOffset` is degrees from the ship. `yOffset` is meters along local up past the surface. */
export const Abductable = engine.defineComponent('abductable:Target', {
  id: Schemas.Int,
  angularOffset: Schemas.Float,
  yOffset: Schemas.Float
})

/**
 * Client-only tumble while the cow is off the surface.
 * It is never passed to syncEntity. `axis` is a unit direction in planet space.
 */
export const Spinner = engine.defineComponent('abductable:Spinner', {
  axis: Schemas.Vector3
})

let planetEntity: Entity | null = null

/** The cow that carries Abductable, or null before it has been placed. */
export function findAbductable(): Entity | null {
  for (const [entity] of engine.getEntitiesWith(Abductable)) return entity
  return null
}

/** Uniform direction on the sphere. Stored in planet space. */
function randomSurfaceDirection(): AbductableDirectionSnapshot {
  const z = Math.random() * 2 - 1
  const angle = Math.random() * Math.PI * 2
  const ring = Math.sqrt(Math.max(0, 1 - z * z))
  return { x: ring * Math.cos(angle), y: ring * Math.sin(angle), z }
}

function hasPlacement(direction: AbductableDirectionSnapshot): boolean {
  return direction.x * direction.x + direction.y * direction.y + direction.z * direction.z >= 1e-8
}

function findPlanet(): Entity | null {
  if (planetEntity !== null) {
    if (Transform.getOrNull(planetEntity)) return planetEntity
    planetEntity = null
  }

  for (const [entity, name] of engine.getEntitiesWith(Name, Transform)) {
    if (name.value === EntityNames.Planet) {
      planetEntity = entity
      return entity
    }
  }
  return null
}

/** Local +Y points along `outward`. Twist around that axis does not matter for the pull. */
function rotationWithUp(outward: Vector3): Quaternion {
  const reference = Math.abs(outward.y) < 0.9 ? Vector3.Up() : Vector3.Right()
  const forward = Vector3.normalize(Vector3.cross(reference, outward))
  return Quaternion.lookRotation(forward, outward)
}

function outwardDirection(direction: AbductableDirectionSnapshot): Vector3 {
  return Vector3.normalize(Vector3.create(direction.x, direction.y, direction.z))
}

/** Unit quaternions invert by conjugation. */
function unrotate(rotation: Quaternion, vector: Vector3): Vector3 {
  const normalized = Quaternion.normalize(rotation)
  const inverse = Quaternion.create(-normalized.x, -normalized.y, -normalized.z, normalized.w)
  return Vector3.rotate(vector, inverse)
}

function cowPlanetLocal(direction: AbductableDirectionSnapshot, yOffset: number): Vector3 {
  return Vector3.scale(outwardDirection(direction), PLANET_SURFACE_RADIUS_METERS + yOffset)
}

function planetLocalToWorld(planet: Entity, planetRotation: PlanetRotationSnapshot, local: Vector3): Vector3 {
  return Vector3.add(getWorldPosition(engine, planet), Vector3.rotate(local, planetRotation))
}

function shipLocalOfWorld(ship: Entity, tilt: Quaternion, world: Vector3): Vector3 {
  return unrotate(tilt, Vector3.subtract(world, getWorldPosition(engine, ship)))
}

function worldOfShipLocal(ship: Entity, tilt: Quaternion, local: Vector3): Vector3 {
  return Vector3.add(getWorldPosition(engine, ship), Vector3.rotate(local, tilt))
}

function planetDirectionOfWorld(
  planet: Entity,
  planetRotation: PlanetRotationSnapshot,
  world: Vector3
): AbductableDirectionSnapshot | null {
  const local = unrotate(planetRotation, Vector3.subtract(world, getWorldPosition(engine, planet)))
  if (Vector3.lengthSquared(local) < 1e-8) return null
  const normal = Vector3.normalize(local)
  return { x: normal.x, y: normal.y, z: normal.z }
}

function sameDirection(a: AbductableDirectionSnapshot, b: AbductableDirectionSnapshot): boolean {
  return Math.abs(a.x - b.x) < 1e-5 && Math.abs(a.y - b.y) < 1e-5 && Math.abs(a.z - b.z) < 1e-5
}

function tiltOf(state: GameStateSnapshot): Quaternion {
  return shipTiltQuaternion(state.shipPitch, state.shipRoll)
}

/** Ship-local pose of the cow from the synced direction and y offset. */
function shipLocalFromState(planet: Entity, ship: Entity, state: GameStateSnapshot): Vector3 {
  const alongRay = cowPlanetLocal(state.abductableDirection, state.abductableYOffset)
  const world = planetLocalToWorld(planet, state.planetRotation, alongRay)
  return shipLocalOfWorld(ship, tiltOf(state), world)
}

function spawnAbductable(
  planet: Entity,
  direction: AbductableDirectionSnapshot,
  id: number,
  angularOffset: number,
  yOffset: number
): void {
  const model = ABDUCTABLE_MODELS[0]
  if (!model) return

  const outward = outwardDirection(direction)
  const entity = engine.addEntity()
  Abductable.create(entity, { id, angularOffset, yOffset })
  Transform.create(entity, {
    parent: planet,
    // Local to the planet entity, so the scene position is that entity's position plus this offset.
    position: Vector3.scale(outward, PLANET_SURFACE_RADIUS_METERS + yOffset),
    rotation: rotationWithUp(outward),
    scale: Vector3.create(model.scale, model.scale, model.scale)
  })
  GltfContainer.create(entity, {
    src: model.src,
    visibleMeshesCollisionMask: ColliderLayer.CL_POINTER
  })
  PointerEvents.create(entity, {
    pointerEvents: [
      {
        eventType: PointerEventType.PET_DOWN,
        eventInfo: {
          button: InputAction.IA_POINTER,
          hoverText: ABDUCTABLE_HOVER_TEXT,
          showFeedback: true,
          maxDistance: ABDUCTABLE_POINTER_MAX_DISTANCE_METERS
        }
      }
    ]
  })
  Animator.create(entity, {
    states: model.clips.map((clip) => {
      const idle = clip === model.idleClip
      return {
        clip,
        playing: idle,
        loop: idle,
        weight: idle ? 1 : 0,
        speed: idle ? 1 : 0
      }
    })
  })
}

/** Adds a tumble while the cow is off the surface. Standing it back up is the planet placement's job. */
function syncSpinner(entity: Entity, yOffset: number): void {
  if (yOffset > 0) {
    if (Spinner.getOrNull(entity) !== null) return
    const axis = randomSurfaceDirection()
    Spinner.create(entity, { axis: Vector3.create(axis.x, axis.y, axis.z) })
    return
  }
  if (Spinner.getOrNull(entity) === null) return
  Spinner.deleteFrom(entity)
}

function findNamed(value: string): Entity | null {
  for (const [entity, name] of engine.getEntitiesWith(Name, Transform)) {
    if (name.value === value) return entity
  }
  return null
}

function removeAbductables(): void {
  const entities: Entity[] = []
  for (const [entity] of engine.getEntitiesWith(Abductable)) entities.push(entity)
  for (const entity of entities) engine.removeEntity(entity)
}

/**
 * Horizontal direction the ship must fly. Y is ignored.
 * Returns null when the two entities share an XZ position.
 */
function flightDirection(ship: Entity, abductable: Entity): Vector3 | null {
  const shipPosition = getWorldPosition(engine, ship)
  const targetPosition = getWorldPosition(engine, abductable)
  const dx = targetPosition.x - shipPosition.x
  const dz = targetPosition.z - shipPosition.z
  const length = Math.hypot(dx, dz)
  if (length < 1e-4) return null
  return Vector3.create(dx / length, 0, dz / length)
}

/**
 * Slides RedArrow around its ring and turns it to face the abductable.
 * The ring radius is the arrow's current horizontal distance from the ship,
 * so the distance authored on the scene object is the ring size.
 */
function RedArrowSystem(): void {
  const ship = findNamed(EntityNames.Ship)
  const abductable = findAbductable()
  if (ship === null || abductable === null) return

  const direction = flightDirection(ship, abductable)
  if (direction === null) return

  const shipPosition = getWorldPosition(engine, ship)
  for (const [entity, name] of engine.getEntitiesWith(Name, Transform)) {
    if (name.value !== EntityNames.RedArrow) continue
    const arrow = Transform.get(entity)
    const radius = Math.hypot(arrow.position.x - shipPosition.x, arrow.position.z - shipPosition.z)
    if (radius < 1e-4) continue

    const transform = Transform.getMutable(entity)
    transform.position.x = shipPosition.x + direction.x * radius
    transform.position.y = RED_ARROW_RING_Y
    transform.position.z = shipPosition.z + direction.z * radius
    transform.rotation = Quaternion.lookRotation(direction, Vector3.Up())
  }
}

function setVisible(entity: Entity, visible: boolean): void {
  const current = VisibilityComponent.getOrNull(entity)
  if (current !== null && current.visible === visible) return
  VisibilityComponent.createOrReplace(entity, { visible })
}

/** Last angle written to the console, so the log moves only when the degree changes. */
let loggedArrowAngleDegrees = Number.NaN

/**
 * Angle in degrees between the ship and the abductable, measured from the planet center.
 * Both directions are normalized. 0 is directly under the ship. 180 is the far side.
 * The abductable direction is planet-local. `planetRotation` is the spin on GameState,
 * because the planet entity on the server stays at its authored rotation.
 */
function angleFromPlanetCenter(
  planet: Entity,
  ship: Entity,
  direction: AbductableDirectionSnapshot,
  planetRotation: PlanetRotationSnapshot
): number | null {
  const toShip = Vector3.subtract(getWorldPosition(engine, ship), getWorldPosition(engine, planet))
  if (Vector3.lengthSquared(toShip) < 1e-8) return null

  const toAbductable = Vector3.rotate(Vector3.create(direction.x, direction.y, direction.z), planetRotation)
  if (Vector3.lengthSquared(toAbductable) < 1e-8) return null

  const dot = Vector3.dot(Vector3.normalize(toShip), Vector3.normalize(toAbductable))
  const clamped = Math.min(1, Math.max(-1, dot))
  return Math.acos(clamped) * (180 / Math.PI)
}

function logArrowAngle(angleDegrees: number): void {
  const rounded = Math.round(angleDegrees)
  if (rounded === loggedArrowAngleDegrees) return
  loggedArrowAngleDegrees = rounded
  console.log(`[ABDUCT] Angle from planet center: ${rounded}°`)
}

/** Arrow height for the model on this cow. Falls back to the first model. */
function arrowLocalY(abductable: Entity): number {
  const src = GltfContainer.getOrNull(abductable)?.src
  const model = ABDUCTABLE_MODELS.find((entry) => entry.src === src) ?? ABDUCTABLE_MODELS[0]
  return model?.arrowLocalY ?? 0
}

/**
 * Parents the arrow to the planet, above the cow along the ray from the planet center.
 * World position is used so a cow parented to the ship still places the arrow.
 */
function placeAbductableArrow(arrow: Entity, abductable: Entity, planet: Entity): void {
  const cowWorld = getWorldPosition(engine, abductable)
  const planetWorld = getWorldPosition(engine, planet)
  const fromPlanet = Vector3.subtract(cowWorld, planetWorld)
  if (Vector3.lengthSquared(fromPlanet) < 1e-8) return
  const local = unrotate(Transform.get(planet).rotation, fromPlanet)
  if (Vector3.lengthSquared(local) < 1e-8) return
  const up = Vector3.normalize(local)
  const height = arrowLocalY(abductable)
  const transform = Transform.getMutable(arrow)
  transform.parent = planet
  transform.position.x = local.x + up.x * height
  transform.position.y = local.y + up.y * height
  transform.position.z = local.z + up.z * height
  transform.rotation = rotationWithUp(up)
}

/** Revolves each spinning cow around the axis chosen when its Spinner was added. */
function SpinnerSystem(dt: number): void {
  const step = Math.min(Math.max(dt, 0), SIMULATION_MAX_DELTA_SECONDS)
  const degrees = ABDUCTABLE_SPIN_DEGREES_PER_SECOND * step
  if (degrees === 0) return
  for (const [entity, spinner] of engine.getEntitiesWith(Spinner, Transform)) {
    const transform = Transform.getMutable(entity)
    const spun = Quaternion.multiply(Quaternion.fromAngleAxis(degrees, spinner.axis), transform.rotation)
    transform.rotation = Quaternion.normalize(spun)
  }
}

/**
 * Hides both arrows inside the inner angle. Between that and the outer limit,
 * AbductableArrow shows. Past the outer limit, RedArrow shows.
 */
function AbductableArrowSystem(): void {
  const arrow = findNamed(EntityNames.AbductableArrow)
  const redArrow = findNamed(EntityNames.RedArrow)
  const abductable = findAbductable()
  if (abductable === null) {
    if (arrow !== null) setVisible(arrow, false)
    if (redArrow !== null) setVisible(redArrow, false)
    return
  }

  const planet = findPlanet()
  if (arrow !== null && planet !== null) placeAbductableArrow(arrow, abductable, planet)
  const angleDegrees = Abductable.get(abductable).angularOffset
  logArrowAngle(angleDegrees)
  const hideBoth = angleDegrees <= ARROW_HIDE_ANGLE_DEGREES
  const showAbductableArrow = !hideBoth && angleDegrees <= ABDUCTABLE_ARROW_MAX_ANGLE_DEGREES
  if (arrow !== null) setVisible(arrow, showAbductableArrow)
  if (redArrow !== null) setVisible(redArrow, !hideBoth && !showAbductableArrow)
}

/** Meters from the surface to just above the ship, along a ray from the planet center. */
function liftTargetMeters(planet: Entity, ship: Entity): number {
  const gap = Vector3.length(Vector3.subtract(getWorldPosition(engine, ship), getWorldPosition(engine, planet)))
  return Math.max(0, gap + ABDUCTABLE_LIFT_ABOVE_SHIP_METERS - PLANET_SURFACE_RADIUS_METERS)
}

/** Ship-local XZ captured at the grab, and the Y that corresponds to a y offset of 0. Not synced. */
type ShipCarry = {
  localX: number
  localZ: number
  baseY: number
}

let serverCarry: ShipCarry | null = null

function captureServerCarry(planet: Entity, ship: Entity, state: GameStateSnapshot): void {
  const local = shipLocalFromState(planet, ship, state)
  serverCarry = { localX: local.x, localZ: local.z, baseY: local.y - state.abductableYOffset }
}

function carriedWorld(ship: Entity, state: GameStateSnapshot, yOffset: number): Vector3 | null {
  if (serverCarry === null) return null
  return worldOfShipLocal(
    ship,
    tiltOf(state),
    Vector3.create(serverCarry.localX, serverCarry.baseY + yOffset, serverCarry.localZ)
  )
}

function writeCarriedDirection(planet: Entity, ship: Entity, state: GameStateSnapshot, yOffset: number): void {
  const world = carriedWorld(ship, state, yOffset)
  if (world === null) return
  const direction = planetDirectionOfWorld(planet, state.planetRotation, world)
  if (direction === null || sameDirection(direction, state.abductableDirection)) return
  applyAbductableDirection(direction)
}

function raiseCarry(dt: number, planet: Entity, ship: Entity): void {
  const state = getGameState()
  const target = liftTargetMeters(planet, ship)
  let yOffset = state.abductableYOffset
  if (yOffset < target) {
    const step = Math.min(Math.max(dt, 0), SIMULATION_MAX_DELTA_SECONDS)
    const next = Math.min(target, yOffset + ABDUCTABLE_LIFT_METERS_PER_SECOND * step)
    if (next !== yOffset) {
      applyAbductableYOffset(next)
      yOffset = next
    }
  }
  writeCarriedDirection(planet, ship, state, yOffset)
}

/** Downward speed while falling. Server-only, so clients follow the synced height. */
let fallSpeedMetersPerSecond = 0

/** Lets go of the ship. The current y offset is the height the fall starts from. */
function releaseCarry(planet: Entity, ship: Entity): void {
  const state = getGameState()
  if (serverCarry === null) captureServerCarry(planet, ship, state)
  writeCarriedDirection(planet, ship, state, state.abductableYOffset)
  serverCarry = null
  fallSpeedMetersPerSecond = 0
  if (state.abductableOnShip) applyAbductableOnShip(false)
}

/** Speeds y offset toward the surface while the cow is not being abducted. */
function fallTowardSurface(dt: number): void {
  const state = getGameState()
  if (state.abductableYOffset <= 0) {
    fallSpeedMetersPerSecond = 0
    return
  }
  const step = Math.min(Math.max(dt, 0), SIMULATION_MAX_DELTA_SECONDS)
  fallSpeedMetersPerSecond += ABDUCTABLE_FALL_GRAVITY_METERS_PER_SECOND_SQUARED * step
  const next = Math.max(0, state.abductableYOffset - fallSpeedMetersPerSecond * step)
  if (next !== state.abductableYOffset) applyAbductableYOffset(next)
  if (next === 0) fallSpeedMetersPerSecond = 0
}

/**
 * Publishes the angle from the synced spin. A lift starts within the angle limit
 * while the beam is on, and the cow then rides the ship. The beam turning off
 * releases it, and it falls onto the planet at the carried point.
 */
function AbductableAngleSystem(dt: number): void {
  const state = getGameState()
  if (state.abductableId === 0 || !hasPlacement(state.abductableDirection)) return

  const ship = findNamed(EntityNames.Ship)
  const planet = findPlanet()
  if (ship === null || planet === null) return

  const angleDegrees = angleFromPlanetCenter(planet, ship, state.abductableDirection, state.planetRotation)
  if (angleDegrees === null) return
  if (angleDegrees !== state.abductableAngularOffset) applyAbductableAngularOffset(angleDegrees)

  if (state.abductableOnShip) {
    if (serverCarry === null) captureServerCarry(planet, ship, state)
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

  if (angleDegrees > ABDUCTABLE_LIFT_MAX_ANGLE_DEGREES || !abductionBeamOn()) return
  fallSpeedMetersPerSecond = 0
  captureServerCarry(planet, ship, state)
  applyAbductableOnShip(true)
  raiseCarry(dt, planet, ship)
}

type ClientCarry = ShipCarry & { id: number }

let clientCarry: ClientCarry | null = null

function invertQuaternion(rotation: Quaternion): Quaternion {
  const normalized = Quaternion.normalize(rotation)
  return Quaternion.create(-normalized.x, -normalized.y, -normalized.z, normalized.w)
}

function moveToward(current: number, target: number, maxStep: number): number {
  const delta = target - current
  if (Math.abs(delta) <= maxStep) return target
  return current + Math.sign(delta) * maxStep
}

/** Parents the cow to the planet and stands it up when it is back on the surface. */
function placeOnPlanet(entity: Entity, planet: Entity, state: GameStateSnapshot): void {
  clientCarry = null
  const outward = outwardDirection(state.abductableDirection)
  const position = Vector3.scale(outward, PLANET_SURFACE_RADIUS_METERS + state.abductableYOffset)
  const transform = Transform.getMutable(entity)
  transform.parent = planet
  transform.position.x = position.x
  transform.position.y = position.y
  transform.position.z = position.z
  if (state.abductableYOffset === 0) transform.rotation = rotationWithUp(outward)
  syncSpinner(entity, state.abductableYOffset)
}

/**
 * Parents the cow to the ship. Local Y follows the synced y offset from the grab.
 * Local XZ eases toward the ship center and is not written back.
 */
function placeOnShip(entity: Entity, planet: Entity, ship: Entity, state: GameStateSnapshot, dt: number): void {
  const transform = Transform.getMutable(entity)
  const attaching = clientCarry === null || clientCarry.id !== state.abductableId
  if (attaching) {
    const worldRotation = getWorldRotation(engine, entity)
    const shipWorldRotation = getWorldRotation(engine, ship)
    const local = shipLocalFromState(planet, ship, state)
    clientCarry = {
      id: state.abductableId,
      localX: local.x,
      localZ: local.z,
      baseY: local.y - state.abductableYOffset
    }
    transform.parent = ship
    transform.rotation = Quaternion.multiply(invertQuaternion(shipWorldRotation), worldRotation)
  }
  if (clientCarry === null) return

  const step = Math.min(Math.max(dt, 0), SIMULATION_MAX_DELTA_SECONDS)
  const maxStep = ABDUCTABLE_CENTER_METERS_PER_SECOND * step
  clientCarry.localX = moveToward(clientCarry.localX, 0, maxStep)
  clientCarry.localZ = moveToward(clientCarry.localZ, 0, maxStep)
  transform.parent = ship
  transform.position.x = clientCarry.localX
  transform.position.y = clientCarry.baseY + state.abductableYOffset
  transform.position.z = clientCarry.localZ
  syncSpinner(entity, state.abductableYOffset)
}

/**
 * Spawns the cow from GameState and parents it to the ship or the planet.
 * Id 0 or a zero direction means nothing is placed.
 */
function AbductableSpawnSystem(dt: number): void {
  const state = getGameState()
  const placed = state.abductableId !== 0 && hasPlacement(state.abductableDirection)
  let existing = findAbductable()

  if (!placed) {
    clientCarry = null
    if (existing !== null) removeAbductables()
    return
  }

  if (existing === null || Abductable.get(existing).id !== state.abductableId) {
    if (existing !== null) removeAbductables()
    clientCarry = null
    const planet = findPlanet()
    if (planet === null) return
    spawnAbductable(
      planet,
      state.abductableDirection,
      state.abductableId,
      state.abductableAngularOffset,
      state.abductableYOffset
    )
    existing = findAbductable()
  }
  if (existing === null) return

  const component = Abductable.getMutable(existing)
  component.id = state.abductableId
  component.angularOffset = state.abductableAngularOffset
  component.yOffset = state.abductableYOffset

  const planet = findPlanet()
  if (planet === null) return
  if (state.abductableOnShip) {
    const ship = findNamed(EntityNames.Ship)
    if (ship === null) return
    placeOnShip(existing, planet, ship, state, dt)
    return
  }
  placeOnPlanet(existing, planet, state)
}

export function setupAbduction(): void {
  planetEntity = null
  loggedArrowAngleDegrees = Number.NaN
  serverCarry = null
  clientCarry = null
  fallSpeedMetersPerSecond = 0

  if (isServer()) {
    applyAbductablePlacement(randomSurfaceDirection())
    engine.addSystem(AbductableAngleSystem)
    return
  }

  engine.addSystem(AbductableSpawnSystem)
  engine.addSystem(SpinnerSystem)
  engine.addSystem(RedArrowSystem)
  engine.addSystem(AbductableArrowSystem)
}
