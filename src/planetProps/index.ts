/**
 * Corn fields and newsstands scattered on the planet surface.
 *
 * Server: scatters every prop once on load and registers each as a surface zone.
 * Flying over a corn field abducts its one cob onto the deck (see `cargo/`) and marks
 * the field depleted in the synced `PlanetPropState`. Flying over a newsstand tells every
 * client to throw tabloids at the screen (`tabloids/`); a newsstand is then unavailable
 * until its tabloids have played out, then works again.
 * Each client asks for the layout when it loads (`requestInitialState`) and gets it
 * back in `notifyPlanetProps`.
 * Client: parents each prop to the planet, so it spins with the surface (a model when the
 * kind has one, otherwise a placeholder cube),
 * and polls the synced state to switch each prop between its available and depleted look.
 */
import { engine, Entity, GltfContainer, Material, MeshRenderer, Transform } from '@dcl/sdk/ecs'
import { Vector3 } from '@dcl/sdk/math'
import { isServer } from '@dcl/sdk/network'
import { PLANET_SURFACE_RADIUS_METERS } from '../abduction/constants'
import { addCargo } from '../cargo'
import { randomSurfaceDirection, rotationWithUp } from '../abduction/geometry'
import { findPlanet } from '../abduction/sceneLookup'
import { notifyPlanetProps, notifyTabloids } from '../gamestate/serverRoom'
import { setOnPlanetProps, type PlanetPropMessage } from '../networking/client'
import { TABLOID_BATCH_SECONDS } from '../tabloids/constants'
import { addSurfaceZone, onSurfaceZoneEnter } from '../surfaceZones'
import { cosOfDegrees, isWithinCos } from '../surfaceZones/geometry'
import {
  PLANET_PROP_MIN_SEPARATION_DEGREES,
  PLANET_PROP_PLACEMENT_ATTEMPTS,
  PLANET_PROPS,
  type PlanetPropKind
} from './constants'
import {
  createPlanetPropState,
  depletePlanetProp,
  isPlanetPropAvailable,
  resetPlanetPropState
} from './state'

export type PlanetProp = {
  id: number
  kind: PlanetPropKind
  /** Unit direction from the planet center, in planet-local space. */
  direction: Vector3
}

const KINDS = Object.keys(PLANET_PROPS) as PlanetPropKind[]

function isKind(value: string): value is PlanetPropKind {
  return (KINDS as string[]).includes(value)
}

// MARK: Server

let serverProps: PlanetProp[] = []
/** Server clock, ms, when each newsstand can throw tabloids again. Missing means available. */
const newsstandAvailableAt = new Map<number, number>()

/** Debounce: a newsstand is unavailable until its last batch of tabloids has played out. */
function takeNewsstand(id: number): boolean {
  const now = Date.now()
  if (now < (newsstandAvailableAt.get(id) ?? 0)) return false
  newsstandAvailableAt.set(id, now + TABLOID_BATCH_SECONDS * 1000)
  return true
}

/** A random direction at least the minimum separation from every placed prop, if one turns up. */
function pickDirection(placed: PlanetProp[], cosSeparation: number): Vector3 {
  let candidate = Vector3.create(0, 1, 0)
  for (let attempt = 0; attempt < PLANET_PROP_PLACEMENT_ATTEMPTS; attempt++) {
    const random = randomSurfaceDirection()
    candidate = Vector3.create(random.x, random.y, random.z)
    if (!placed.some((prop) => isWithinCos(prop.direction, candidate, cosSeparation))) return candidate
  }
  return candidate
}

function scatterProps(): PlanetProp[] {
  const cosSeparation = cosOfDegrees(PLANET_PROP_MIN_SEPARATION_DEGREES)
  const props: PlanetProp[] = []
  let nextId = 1
  for (const kind of KINDS) {
    for (let i = 0; i < PLANET_PROPS[kind].count; i++) {
      props.push({ id: nextId++, kind, direction: pickDirection(props, cosSeparation) })
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
      z: prop.direction.z
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
    if (!depletePlanetProp(zone.id)) return
    const cob = addCargo('cornCob')
    console.log(`[SERVER] Corn field ${zone.id} gave up cob ${cob.id}`)
  })
  onSurfaceZoneEnter('newsstand', (zone) => {
    if (!takeNewsstand(zone.id)) return
    console.log(`[SERVER] Ship flew over newsstand ${zone.id}`)
    notifyTabloids(zone.id)
  })
  console.log(`[SERVER] Scattered ${serverProps.length} planet props`)
}

// MARK: Client

type ShownProp = {
  entity: Entity
  prop: PlanetProp
  /** Look currently applied. Null until the first poll. */
  available: boolean | null
}

/** Layout from the server, waiting for the planet entity. Null once spawned. */
let pendingProps: PlanetProp[] | null = null
const spawned: ShownProp[] = []

function removeSpawned(): void {
  for (const shown of spawned) engine.removeEntity(shown.entity)
  spawned.length = 0
}

/**
 * Switches a prop between its available and depleted look.
 * Placeholder: recolors the cube. Real models swap or hide nodes here.
 */
function applyAvailability(shown: ShownProp, available: boolean): void {
  const config = PLANET_PROPS[shown.prop.kind]
  if (config.model) return
  Material.setPbrMaterial(shown.entity, { albedoColor: available ? config.color : config.depletedColor })
}

function spawnProp(planet: Entity, prop: PlanetProp): Entity {
  const config = PLANET_PROPS[prop.kind]
  const entity = engine.addEntity()
  if (config.model) {
    Transform.create(entity, {
      parent: planet,
      // The model's origin is at its base.
      position: Vector3.scale(prop.direction, PLANET_SURFACE_RADIUS_METERS),
      rotation: rotationWithUp(prop.direction),
      scale: Vector3.create(config.modelScale ?? 1, config.modelScale ?? 1, config.modelScale ?? 1)
    })
    GltfContainer.create(entity, { src: config.model, visibleMeshesCollisionMask: 0, invisibleMeshesCollisionMask: 0 })
    return entity
  }
  Transform.create(entity, {
    parent: planet,
    // Half the height past the surface, so the cube sits on it.
    position: Vector3.scale(prop.direction, PLANET_SURFACE_RADIUS_METERS + config.size.y / 2),
    rotation: rotationWithUp(prop.direction),
    scale: Vector3.create(config.size.x, config.size.y, config.size.z)
  })
  MeshRenderer.setBox(entity)
  return entity
}

function PlanetPropSpawnSystem(): void {
  if (pendingProps === null) return
  const planet = findPlanet()
  if (planet === null) return
  removeSpawned()
  for (const prop of pendingProps) spawned.push({ entity: spawnProp(planet, prop), prop, available: null })
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
    props.push({ id: message.id, kind: message.kind, direction: Vector3.normalize(direction) })
  }
  pendingProps = props
}

export function setupPlanetProps(): void {
  serverProps = []
  newsstandAvailableAt.clear()
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
