/**
 * Client-only guidance arrows. RedArrow rides a horizontal ring around the ship and
 * points along the horizontal direction from the ship to the cow. CompassArrow is a
 * child of the ship and yaws around its local up so it stays flat on the deck while
 * its forward points at the cow. AbductableArrow is a child of the planet,
 * placed above the cow along the cow's up. It shows while the synced angle stays
 * inside the outer limit and outside the inner one. Inside the inner limit every
 * arrow hides. CompassArrow shows past that limit. RedArrow shows past the outer one.
 */
import { engine, Entity, getWorldPosition, getWorldRotation, Transform } from '@dcl/sdk/ecs'
import { Quaternion, Vector3 } from '@dcl/sdk/math'
import { EntityNames } from '../../assets/scene/entity-names'
import {
  ABDUCTABLE_ARROW_MAX_ANGLE_DEGREES,
  ABDUCTABLE_MODELS,
  ARROW_HIDE_ANGLE_DEGREES,
  RED_ARROW_RING_Y
} from '../constants'
import { sceneEntities } from '../scene/entities'
import { Abductable, findAbductable, findAbductableModel } from './components'
import { rotationWithUp, unrotate } from './geometry'
import { findNamed, findPlanet, setVisible } from './sceneLookup'

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
export function RedArrowSystem(): void {
  const ship = findNamed(EntityNames.Ship)
  const abductable = findAbductable()
  const entity = sceneEntities.redArrow
  if (ship === null || abductable === null || entity === null) return
  if (Transform.getOrNull(entity) === null) return

  const direction = flightDirection(ship, abductable)
  if (direction === null) return

  const shipPosition = getWorldPosition(engine, ship)
  const arrow = Transform.get(entity)
  const radius = Math.hypot(arrow.position.x - shipPosition.x, arrow.position.z - shipPosition.z)
  if (radius < 1e-4) return

  const transform = Transform.getMutable(entity)
  transform.position.x = shipPosition.x + direction.x * radius
  transform.position.y = RED_ARROW_RING_Y
  transform.position.z = shipPosition.z + direction.z * radius
  transform.rotation = Quaternion.lookRotation(direction, Vector3.Up())
}

/**
 * Direction to the target in the arrow's parent space, flattened onto the deck.
 * The result has no Y, so a look rotation around it is a yaw about local up.
 * Returns null when the target sits on the deck normal.
 */
function deckDirection(arrow: Entity, target: Entity): Vector3 | null {
  const delta = Vector3.subtract(getWorldPosition(engine, target), getWorldPosition(engine, arrow))
  const parent = Transform.get(arrow).parent
  const local = parent === undefined ? delta : unrotate(getWorldRotation(engine, parent), delta)
  const length = Math.hypot(local.x, local.z)
  if (length < 1e-4) return null
  return Vector3.create(local.x / length, 0, local.z / length)
}

/**
 * Yaws CompassArrow around local up so its forward points at the abductable
 * across the deck. Pitch and roll stay at zero, so the arrow stays flat on the ship.
 * It hides inside the inner angle.
 */
export function CompassArrowSystem(): void {
  const entity = sceneEntities.compassArrow
  if (entity === null || Transform.getOrNull(entity) === null) return

  const abductable = findAbductable()
  if (abductable === null) {
    setVisible(entity, false)
    return
  }

  setVisible(entity, Abductable.get(abductable).angularOffset > ARROW_HIDE_ANGLE_DEGREES)

  const direction = deckDirection(entity, abductable)
  if (direction === null) return
  Transform.getMutable(entity).rotation = Quaternion.lookRotation(direction, Vector3.Up())
}

/** Arrow height for the model on this cow. Falls back to the first model. */
function arrowLocalY(abductable: Entity): number {
  const model = findAbductableModel(abductable) ?? ABDUCTABLE_MODELS[0]
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

/**
 * Hides both arrows inside the inner angle. Between that and the outer limit,
 * AbductableArrow shows. Past the outer limit, RedArrow shows.
 */
export function AbductableArrowSystem(): void {
  const arrow = sceneEntities.abductableArrow
  const redArrow = sceneEntities.redArrow
  const abductable = findAbductable()
  if (abductable === null) {
    if (arrow !== null) setVisible(arrow, false)
    if (redArrow !== null) setVisible(redArrow, false)
    return
  }

  const planet = findPlanet()
  if (arrow !== null && planet !== null) placeAbductableArrow(arrow, abductable, planet)
  const angleDegrees = Abductable.get(abductable).angularOffset
  const hideBoth = angleDegrees <= ARROW_HIDE_ANGLE_DEGREES
  const showAbductableArrow = !hideBoth && angleDegrees <= ABDUCTABLE_ARROW_MAX_ANGLE_DEGREES
  if (arrow !== null) setVisible(arrow, showAbductableArrow)
  if (redArrow !== null) setVisible(redArrow, !hideBoth && !showAbductableArrow)
}
