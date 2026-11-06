/**
 * The abductable is a cow on the planet surface. The server picks a direction
 * once, stores it on GameState with a spawn id, and keeps the angle from the
 * planet center up to date. Each client parents the cow to the planet along
 * that ray, so it spins with the surface. A new id replaces the cow. Local up
 * points away from the planet origin. While the synced angle is within the
 * lift limit, the server raises the y offset until the cow is above the ship.
 * Outside that limit the offset snaps back to the surface. Clients add the
 * offset to the surface radius. While it is off the surface, each client tumbles
 * it around a random axis. That spin is not synced.
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
  applyAbductablePlacement,
  applyAbductableYOffset,
  getGameState,
  type AbductableDirectionSnapshot,
  type PlanetRotationSnapshot
} from './gamestate'

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
  syncSpinner(entity, direction, yOffset)
}

/** Adds a tumble while the cow is off the surface, and stands it back up on the ground. */
function syncSpinner(entity: Entity, direction: AbductableDirectionSnapshot, yOffset: number): void {
  if (yOffset > 0) {
    if (Spinner.getOrNull(entity) !== null) return
    const axis = randomSurfaceDirection()
    Spinner.create(entity, { axis: Vector3.create(axis.x, axis.y, axis.z) })
    return
  }
  if (Spinner.getOrNull(entity) === null) return
  Spinner.deleteFrom(entity)
  Transform.getMutable(entity).rotation = rotationWithUp(outwardDirection(direction))
}

/** Moves an existing cow along local up without restarting its animator. */
function applyYOffset(entity: Entity, direction: AbductableDirectionSnapshot, yOffset: number): void {
  const position = Vector3.scale(outwardDirection(direction), PLANET_SURFACE_RADIUS_METERS + yOffset)
  const transform = Transform.getMutable(entity)
  transform.position.x = position.x
  transform.position.y = position.y
  transform.position.z = position.z
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
 * The cow's spin does not move the arrow.
 */
function placeAbductableArrow(arrow: Entity, abductable: Entity, planet: Entity): void {
  const cow = Transform.get(abductable)
  if (Vector3.lengthSquared(cow.position) < 1e-8) return
  const up = Vector3.normalize(cow.position)
  const height = arrowLocalY(abductable)
  const transform = Transform.getMutable(arrow)
  transform.parent = planet
  transform.position.x = cow.position.x + up.x * height
  transform.position.y = cow.position.y + up.y * height
  transform.position.z = cow.position.z + up.z * height
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

/**
 * The planet entity on the server keeps its authored rotation. This writes the
 * angle from the synced spin so every client shares one value. Within the lift
 * limit, it raises the cow toward the ship. Outside that limit, the cow snaps
 * back to the surface.
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
  if (angleDegrees > ABDUCTABLE_LIFT_MAX_ANGLE_DEGREES) {
    if (state.abductableYOffset !== 0) applyAbductableYOffset(0)
    return
  }

  const target = liftTargetMeters(planet, ship)
  if (state.abductableYOffset >= target) return
  const step = Math.min(Math.max(dt, 0), SIMULATION_MAX_DELTA_SECONDS)
  const next = Math.min(target, state.abductableYOffset + ABDUCTABLE_LIFT_METERS_PER_SECOND * step)
  if (next === state.abductableYOffset) return
  applyAbductableYOffset(next)
}

/**
 * Spawns the cow from GameState, replaces it when the id changes, and applies the lift.
 * Id 0 or a zero direction means nothing is placed.
 */
function AbductableSpawnSystem(): void {
  const state = getGameState()
  const placed = state.abductableId !== 0 && hasPlacement(state.abductableDirection)
  const existing = findAbductable()

  if (!placed) {
    if (existing !== null) removeAbductables()
    return
  }

  if (existing !== null && Abductable.get(existing).id === state.abductableId) {
    const component = Abductable.getMutable(existing)
    if (component.angularOffset !== state.abductableAngularOffset) {
      component.angularOffset = state.abductableAngularOffset
    }
    if (component.yOffset !== state.abductableYOffset) {
      component.yOffset = state.abductableYOffset
      applyYOffset(existing, state.abductableDirection, state.abductableYOffset)
      syncSpinner(existing, state.abductableDirection, state.abductableYOffset)
    }
    return
  }

  if (existing !== null) removeAbductables()
  const planet = findPlanet()
  if (planet === null) return
  spawnAbductable(
    planet,
    state.abductableDirection,
    state.abductableId,
    state.abductableAngularOffset,
    state.abductableYOffset
  )
}

export function setupAbduction(): void {
  planetEntity = null
  loggedArrowAngleDegrees = Number.NaN

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
