/**
 * Corn fields and newsstands scattered on the planet surface.
 *
 * Server: scatters every prop once on load and registers each as a surface zone.
 * Flying over a corn field abducts a cob onto the deck (see `cargo/`); flying over a
 * newsstand tells every client to throw tabloids at the screen (`tabloids/`). Either way
 * the prop is then unavailable in the synced `PlanetPropState` for its kind's
 * `cooldownSeconds`, after which it can be used again.
 * Each client asks for the layout when it loads (`requestInitialState`) and gets it
 * back in `notifyPlanetProps`.
 * Client: parents each prop to the planet, so it spins with the surface (a model when the
 * kind has one, otherwise a placeholder cube),
 * and polls the synced state to switch each prop between its available and depleted look:
 * the depleted model when the kind has one, a cube recolor for placeholders.
 */
import { engine, Entity, GltfContainer, Material, MeshRenderer, Transform } from '@dcl/sdk/ecs'
import { Quaternion, Vector3 } from '@dcl/sdk/math'
import { isServer } from '@dcl/sdk/network'
import { PLANET_SURFACE_RADIUS_METERS } from '../abduction/constants'
import { addCargo } from '../cargo'
import { findPlanet, setVisible } from '../abduction/sceneLookup'
import { notifyPlanetProps, notifyTabloids } from '../gamestate/serverRoom'
import { setOnPlanetProps, type PlanetPropMessage } from '../networking/client'
import {
  clearArea,
  cosOfDegrees,
  isWithinCos,
  pickClearDirection,
  rotationWithUp,
  rotationWithUpFacing,
  type ClearArea
} from '../sphere/geometry'
import { addSurfaceZone, onSurfaceZoneEnter } from '../surfaceZones'
import {
  PLANET_PROP_MIN_SEPARATION_DEGREES,
  PLANET_PROP_PLACEMENT_ATTEMPTS,
  PLANET_PROP_SHIP_SPAWN_CLEAR_DEGREES,
  PLANET_PROPS,
  type PlanetPropKind
} from './constants'
import { landmarks, shipSpawnDirection } from './landmarks'
import {
  createPlanetPropState,
  isPlanetPropAvailable,
  PlanetPropCooldownSystem,
  resetPlanetPropState,
  takePlanetProp
} from './state'

export type PlanetProp = {
  id: number
  kind: PlanetPropKind
  /** Unit direction from the planet center, in planet-local space. */
  direction: Vector3
  /** Planet-local direction along the surface the model's front (+Z) points. Null for no set facing. */
  facing: Vector3 | null
}

const KINDS = Object.keys(PLANET_PROPS) as PlanetPropKind[]

function isKind(value: string): value is PlanetPropKind {
  return (KINDS as string[]).includes(value)
}

// MARK: Server

let serverProps: PlanetProp[] = []

/** Takes the prop for its kind's cooldown. False when it is still cooling down. */
function takeProp(id: number, kind: PlanetPropKind): boolean {
  return takePlanetProp(id, PLANET_PROPS[kind].cooldownSeconds)
}

/**
 * Fixed props first, then every scattered prop: never in the ship spawn area or a fixed prop's
 * `clearDegrees` (hard), and at least the minimum separation from placed props when a pick allows (soft).
 */
function scatterProps(): PlanetProp[] {
  const cosSeparation = cosOfDegrees(PLANET_PROP_MIN_SEPARATION_DEGREES)
  const spawn = shipSpawnDirection()
  const clear: ClearArea[] = [clearArea(spawn, PLANET_PROP_SHIP_SPAWN_CLEAR_DEGREES)]
  const props: PlanetProp[] = []
  let nextId = 1
  for (const { kind, direction, facing } of landmarks()) {
    props.push({ id: nextId++, kind, direction, facing })
    const clearDegrees = PLANET_PROPS[kind].clearDegrees
    if (clearDegrees) clear.push(clearArea(direction, clearDegrees))
  }
  const isSpacedOut = (candidate: Vector3): boolean =>
    !props.some((prop) => isWithinCos(prop.direction, candidate, cosSeparation))
  for (const kind of KINDS) {
    const config = PLANET_PROPS[kind]
    if (config.fixed) continue
    for (let i = 0; i < config.count; i++) {
      const direction = pickClearDirection({
        clear,
        attempts: PLANET_PROP_PLACEMENT_ATTEMPTS,
        prefer: isSpacedOut,
        // Opposite the spawn point: outside the spawn area, and the signs sit 90 degrees from spawn.
        fallback: Vector3.scale(spawn, -1)
      })
      props.push({ id: nextId++, kind, direction, facing: null })
    }
  }
  return props
}

/** Server-only. Sends the prop layout to one client. */
export function publishPlanetProps(to: string): void {
  notifyPlanetProps(
    serverProps.map((prop) => ({
      id: prop.id,
      kind: prop.kind,
      x: prop.direction.x,
      y: prop.direction.y,
      z: prop.direction.z,
      fx: prop.facing?.x ?? 0,
      fy: prop.facing?.y ?? 0,
      fz: prop.facing?.z ?? 0
    })),
    to
  )
}

function setupServer(): void {
  createPlanetPropState()
  serverProps = scatterProps()
  for (const prop of serverProps) {
    addSurfaceZone({
      id: prop.id,
      kind: prop.kind,
      direction: prop.direction,
      radiusDegrees: PLANET_PROPS[prop.kind].zoneRadiusDegrees
    })
  }
  onSurfaceZoneEnter('cornField', (zone) => {
    if (!takeProp(zone.id, 'cornField')) return
    const cob = addCargo('cornCob')
    console.log(`[SERVER] Corn field ${zone.id} gave up cob ${cob.id}`)
  })
  onSurfaceZoneEnter('newsstand', (zone) => {
    if (!takeProp(zone.id, 'newsstand')) return
    console.log(`[SERVER] Ship flew over newsstand ${zone.id}`)
    notifyTabloids(zone.id)
  })
  // Landmarks do nothing yet. They are never taken, so there is no cooldown.
  onSurfaceZoneEnter('roswellSign', (zone) => {
    console.log(`[SERVER] Ship flew over the Roswell sign (prop ${zone.id})`)
  })
  onSurfaceZoneEnter('area51Sign', (zone) => {
    console.log(`[SERVER] Ship flew over the Area 51 sign (prop ${zone.id})`)
  })
  engine.addSystem(PlanetPropCooldownSystem)
  console.log(`[SERVER] Scattered ${serverProps.length} planet props`)
}

// MARK: Client

type ShownProp = {
  entity: Entity
  prop: PlanetProp
  /**
   * Set when the kind has a `depletedModel`: both models are children of `entity`,
   * loaded up front, and availability toggles which one is visible.
   */
  models: { available: Entity; depleted: Entity } | null
  /** Look currently applied. Null until the first poll. */
  available: boolean | null
}

/** Layout from the server, waiting for the planet entity. Null once spawned. */
let pendingProps: PlanetProp[] | null = null
const spawned: ShownProp[] = []

function removeSpawned(): void {
  for (const shown of spawned) {
    if (shown.models !== null) {
      engine.removeEntity(shown.models.available)
      engine.removeEntity(shown.models.depleted)
    }
    engine.removeEntity(shown.entity)
  }
  spawned.length = 0
}

/**
 * Switches a prop between its available and depleted look.
 * Kinds with a `depletedModel` show it instead of `model`; placeholders recolor the cube.
 * A model without a depleted variant keeps its look.
 */
function applyAvailability(shown: ShownProp, available: boolean): void {
  const config = PLANET_PROPS[shown.prop.kind]
  if (shown.models !== null) {
    setVisible(shown.models.available, available)
    setVisible(shown.models.depleted, !available)
    return
  }
  if (config.model) return
  Material.setPbrMaterial(shown.entity, { albedoColor: available ? config.color : config.depletedColor })
}

function addModel(parent: Entity, src: string): Entity {
  const entity = engine.addEntity()
  Transform.create(entity, { parent })
  GltfContainer.create(entity, { src, visibleMeshesCollisionMask: 0, invisibleMeshesCollisionMask: 0 })
  return entity
}

/** Stands the prop up on the surface, turned to its facing when it has one. */
function propRotation(prop: PlanetProp): Quaternion {
  if (prop.facing === null) return rotationWithUp(prop.direction)
  return rotationWithUpFacing(prop.direction, Vector3.add(prop.direction, prop.facing))
}

function spawnProp(planet: Entity, prop: PlanetProp): ShownProp {
  const config = PLANET_PROPS[prop.kind]
  const entity = engine.addEntity()
  if (config.model) {
    Transform.create(entity, {
      parent: planet,
      // The model's origin is at its base.
      position: Vector3.scale(prop.direction, PLANET_SURFACE_RADIUS_METERS),
      rotation: propRotation(prop),
      scale: Vector3.create(config.modelScale ?? 1, config.modelScale ?? 1, config.modelScale ?? 1)
    })
    if (config.depletedModel) {
      const available = addModel(entity, config.model)
      const depleted = addModel(entity, config.depletedModel)
      setVisible(depleted, false)
      return { entity, prop, models: { available, depleted }, available: null }
    }
    GltfContainer.create(entity, { src: config.model, visibleMeshesCollisionMask: 0, invisibleMeshesCollisionMask: 0 })
    return { entity, prop, models: null, available: null }
  }
  Transform.create(entity, {
    parent: planet,
    // Half the height past the surface, so the cube sits on it.
    position: Vector3.scale(prop.direction, PLANET_SURFACE_RADIUS_METERS + config.size.y / 2),
    rotation: propRotation(prop),
    scale: Vector3.create(config.size.x, config.size.y, config.size.z)
  })
  MeshRenderer.setBox(entity)
  return { entity, prop, models: null, available: null }
}

function PlanetPropSpawnSystem(): void {
  if (pendingProps === null) return
  const planet = findPlanet()
  if (planet === null) return
  removeSpawned()
  for (const prop of pendingProps) spawned.push(spawnProp(planet, prop))
  pendingProps = null
}

/** Polls the synced state and applies a prop's look when its availability changes. */
function PlanetPropAvailabilitySystem(): void {
  for (const shown of spawned) {
    const available = isPlanetPropAvailable(shown.prop.id)
    if (available === shown.available) continue
    shown.available = available
    applyAvailability(shown, available)
  }
}

/** Replaces any props already shown. A repeat of the same layout respawns the same cubes. */
function receiveProps(messages: PlanetPropMessage[]): void {
  const props: PlanetProp[] = []
  for (const message of messages) {
    if (!isKind(message.kind)) continue
    const direction = Vector3.create(message.x, message.y, message.z)
    if (Vector3.lengthSquared(direction) < 1e-8) continue
    const facing = Vector3.create(message.fx, message.fy, message.fz)
    props.push({
      id: message.id,
      kind: message.kind,
      direction: Vector3.normalize(direction),
      facing: Vector3.lengthSquared(facing) < 1e-8 ? null : Vector3.normalize(facing)
    })
  }
  pendingProps = props
}

export function setupPlanetProps(): void {
  serverProps = []
  pendingProps = null
  spawned.length = 0
  resetPlanetPropState()
  if (isServer()) {
    setupServer()
    return
  }
  setOnPlanetProps(receiveProps)
  engine.addSystem(PlanetPropSpawnSystem)
  engine.addSystem(PlanetPropAvailabilitySystem)
}
