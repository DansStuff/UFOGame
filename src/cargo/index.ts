/**
 * Cargo: items abducted onto the ship deck. Each item weighs on steering like one
 * player standing at its spot (see `normalizedShipSpeed` in `ship/motion.ts`).
 *
 * Server: `addCargo` places an item at a random deck spot near the rim,
 * `removeCargo` takes it off when a nearby player asks. The list is synced in `CargoState`.
 * An item weighs on steering once its arrival has had time to play.
 * Client: mirrors the synced list as models parented to the ship. Items that arrive
 * after this client's first look ride the beam up and are spat onto the deck
 * (`arrival.ts`). Once an item rests on the deck a tutorial arrow points at it.
 * Pressing E near one asks the server to remove it.
 */
import {
  ColliderLayer,
  engine,
  Entity,
  GltfContainer,
  InputAction,
  PlayerIdentityData,
  pointerEventsSystem,
  Transform
} from '@dcl/sdk/ecs'
import { Quaternion, Vector3 } from '@dcl/sdk/math'
import { isServer } from '@dcl/sdk/network'
import { EntityNames } from '../../assets/scene/entity-names'
import { findNamed } from '../abduction/sceneLookup'
import { requestRemoveCargo } from '../networking/client'
import { SHIP_CENTER_X, SHIP_CENTER_Z } from '../ship/constants'
import { createTutorialArrow, removeTutorialArrow } from '../tutorialArrow'
import { CargoArrivalSystem, cancelArrival, isArriving, resetArrivals, startArrival } from './arrival'
import {
  CARGO_DECK_MAX_RADIUS,
  CARGO_DECK_MIN_RADIUS,
  CARGO_MIN_SPACING_METERS,
  CARGO_MODELS,
  CARGO_PLACEMENT_ATTEMPTS,
  CARGO_REMOVE_PROXIMITY_METERS,
  CARGO_REMOVE_REQUEST_COOLDOWN_SECONDS,
  CARGO_REMOVE_SERVER_MAX_DISTANCE_METERS,
  type CargoKind
} from './constants'
import { createCargoState, getCargoItems, hasCargoState, resetCargoState, writeCargoItems, type CargoItem } from './state'

export { getCargoItems, type CargoItem } from './state'

// MARK: Server

let nextCargoId = 1

/** Uniform over the deck ring by area, kept apart from the items already there when possible. */
function pickDeckSpot(existing: CargoItem[]): { x: number; z: number } {
  const inner = CARGO_DECK_MIN_RADIUS * CARGO_DECK_MIN_RADIUS
  const outer = CARGO_DECK_MAX_RADIUS * CARGO_DECK_MAX_RADIUS
  let spot = { x: CARGO_DECK_MIN_RADIUS, z: 0 }
  for (let attempt = 0; attempt < CARGO_PLACEMENT_ATTEMPTS; attempt++) {
    const radius = Math.sqrt(inner + Math.random() * (outer - inner))
    const angle = Math.random() * Math.PI * 2
    spot = { x: radius * Math.cos(angle), z: radius * Math.sin(angle) }
    const clear = existing.every((item) => Math.hypot(item.x - spot.x, item.z - spot.z) >= CARGO_MIN_SPACING_METERS)
    if (clear) return spot
  }
  return spot
}

/** Server-only. Puts a new item on the deck and returns it. */
export function addCargo(kind: CargoKind): CargoItem {
  const items = getCargoItems()
  const spot = pickDeckSpot(items)
  const item: CargoItem = {
    id: nextCargoId++,
    kind,
    x: spot.x,
    z: spot.z,
    yaw: Math.random() * 360,
    addedAt: Date.now()
  }
  writeCargoItems([...items, item])
  return item
}

/** Flat distance on the deck from a player to an item, or null when the player is not in the scene. */
function playerDistanceToItem(playerAddress: string, item: CargoItem): number | null {
  for (const [, identity, transform] of engine.getEntitiesWith(PlayerIdentityData, Transform)) {
    if (identity.address.toLowerCase() !== playerAddress.toLowerCase()) continue
    const dx = transform.position.x - (SHIP_CENTER_X + item.x)
    const dz = transform.position.z - (SHIP_CENTER_Z + item.z)
    return Math.hypot(dx, dz)
  }
  return null
}

/**
 * Server-only. Removes the item when it is still on the deck and the player is near it.
 * Returns true when it was removed.
 */
export function removeCargo(playerAddress: string, cargoId: number): boolean {
  const items = getCargoItems()
  const item = items.find((candidate) => candidate.id === cargoId)
  if (!item) return false
  const distance = playerDistanceToItem(playerAddress, item)
  if (distance === null || distance > CARGO_REMOVE_SERVER_MAX_DISTANCE_METERS) return false
  writeCargoItems(items.filter((candidate) => candidate.id !== cargoId))
  return true
}

// MARK: Client

const shown = new Map<number, Entity>()
/** Tutorial arrows over items resting on the deck, by item id. */
const arrows = new Map<number, Entity>()
/** False until the first synced list has been mirrored, so items already aboard do not replay their arrival. */
let seededFromSnapshot = false
let lastRemoveRequestAt = 0

function sendRemoveRequest(cargoId: number): void {
  const now = Date.now()
  if (now - lastRemoveRequestAt < CARGO_REMOVE_REQUEST_COOLDOWN_SECONDS * 1000) return
  lastRemoveRequestAt = now
  requestRemoveCargo(cargoId)
}

function showItem(ship: Entity, item: CargoItem, arriving: boolean): Entity {
  const model = CARGO_MODELS[item.kind]
  const entity = engine.addEntity()
  Transform.create(entity, {
    parent: ship,
    position: Vector3.create(item.x, model.restY, item.z),
    rotation: Quaternion.fromEulerDegrees(0, item.yaw, 0),
    scale: Vector3.create(model.scale, model.scale, model.scale)
  })
  GltfContainer.create(entity, {
    src: model.src,
    visibleMeshesCollisionMask: ColliderLayer.CL_POINTER,
    invisibleMeshesCollisionMask: 0
  })
  if (arriving) startArrival(entity, ship, item)
  pointerEventsSystem.onProximityDown(
    {
      entity,
      opts: {
        button: InputAction.IA_PRIMARY,
        hoverText: model.removeHoverText,
        maxDistance: CARGO_REMOVE_PROXIMITY_METERS
      }
    },
    () => sendRemoveRequest(item.id)
  )
  return entity
}

/** Points a tutorial arrow down at the item. Arrows are children of the ship, so the cob's scale and yaw do not touch them. */
function showArrow(ship: Entity, item: CargoItem): Entity {
  const model = CARGO_MODELS[item.kind]
  return createTutorialArrow({
    parent: ship,
    position: Vector3.create(item.x, model.arrowY, item.z),
    scale: model.arrowScale
  })
}

function hideItem(id: number, entity: Entity): void {
  const arrow = arrows.get(id)
  if (arrow !== undefined) removeTutorialArrow(arrow)
  arrows.delete(id)
  pointerEventsSystem.removeOnProximityDown(entity)
  cancelArrival(entity)
  engine.removeEntity(entity)
  shown.delete(id)
}

/** Mirrors the synced list onto the ship. */
function CargoMirrorSystem(): void {
  const ship = findNamed(EntityNames.Ship)
  if (ship === null || !hasCargoState()) return
  const items = getCargoItems()

  const present = new Set(items.map((item) => item.id))
  for (const [id, entity] of Array.from(shown)) {
    if (!present.has(id)) hideItem(id, entity)
  }
  for (const item of items) {
    let entity = shown.get(item.id)
    if (entity === undefined) {
      entity = showItem(ship, item, seededFromSnapshot)
      shown.set(item.id, entity)
    }
    if (!arrows.has(item.id) && !isArriving(entity)) arrows.set(item.id, showArrow(ship, item))
  }
  seededFromSnapshot = true
}

export function setupCargo(): void {
  nextCargoId = 1
  shown.clear()
  arrows.clear()
  seededFromSnapshot = false
  lastRemoveRequestAt = 0
  resetCargoState()
  resetArrivals()
  if (isServer()) {
    createCargoState()
    return
  }
  engine.addSystem(CargoMirrorSystem)
  engine.addSystem(CargoArrivalSystem)
}
