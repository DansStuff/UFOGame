/**
 * Corn fields and newsstands scattered on the planet surface.
 *
 * Server: scatters every prop once on load, registers each as a surface zone, and
 * logs when the ship flies over one. Each client asks for the layout when it loads
 * (`requestInitialState`) and gets it back in `notifyPlanetProps`.
 * Client: parents a placeholder cube per prop to the planet, so it spins with the surface.
 */
import { engine, Entity, Material, MeshRenderer, Transform } from '@dcl/sdk/ecs'
import { Vector3 } from '@dcl/sdk/math'
import { isServer } from '@dcl/sdk/network'
import { PLANET_SURFACE_RADIUS_METERS } from '../abduction/constants'
import { randomSurfaceDirection, rotationWithUp } from '../abduction/geometry'
import { findPlanet } from '../abduction/sceneLookup'
import { notifyPlanetProps } from '../gamestate/serverRoom'
import { setOnPlanetProps, type PlanetPropMessage } from '../networking/client'
import { addSurfaceZone, onSurfaceZoneEnter } from '../surfaceZones'
import { cosOfDegrees, isWithinCos } from '../surfaceZones/geometry'
import {
  PLANET_PROP_MIN_SEPARATION_DEGREES,
  PLANET_PROP_PLACEMENT_ATTEMPTS,
  PLANET_PROPS,
  type PlanetPropKind
} from './constants'

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
  serverProps = scatterProps()
  for (const prop of serverProps) {
    addSurfaceZone({
      id: prop.id,
      kind: prop.kind,
      direction: prop.direction,
      radiusDegrees: PLANET_PROPS[prop.kind].zoneRadiusDegrees
    })
  }
  for (const kind of KINDS) {
    onSurfaceZoneEnter(kind, (zone) => {
      console.log(`[SERVER] Ship flew over ${zone.kind} ${zone.id}`)
    })
  }
  console.log(`[SERVER] Scattered ${serverProps.length} planet props`)
}

// MARK: Client

/** Layout from the server, waiting for the planet entity. Null once spawned. */
let pendingProps: PlanetProp[] | null = null
const spawned: Entity[] = []

function removeSpawned(): void {
  for (const entity of spawned) engine.removeEntity(entity)
  spawned.length = 0
}

function spawnProp(planet: Entity, prop: PlanetProp): Entity {
  const config = PLANET_PROPS[prop.kind]
  const entity = engine.addEntity()
  Transform.create(entity, {
    parent: planet,
    // Half the height past the surface, so the cube sits on it.
    position: Vector3.scale(prop.direction, PLANET_SURFACE_RADIUS_METERS + config.size.y / 2),
    rotation: rotationWithUp(prop.direction),
    scale: Vector3.create(config.size.x, config.size.y, config.size.z)
  })
  MeshRenderer.setBox(entity)
  Material.setPbrMaterial(entity, { albedoColor: config.color })
  return entity
}

function PlanetPropSpawnSystem(): void {
  if (pendingProps === null) return
  const planet = findPlanet()
  if (planet === null) return
  removeSpawned()
  for (const prop of pendingProps) spawned.push(spawnProp(planet, prop))
  pendingProps = null
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
  pendingProps = null
  spawned.length = 0
  if (isServer()) {
    setupServer()
    return
  }
  setOnPlanetProps(receiveProps)
  engine.addSystem(PlanetPropSpawnSystem)
}
