/**
 * Server-only fly-over detection for fixed points on the planet surface.
 * Works like a trigger area, but runs on the server, where TriggerArea does not
 * (the Explorer's physics evaluates it, and the headless server has none).
 *
 * Each zone is a planet-local direction plus a radius in degrees. Once per tick the
 * ship is turned into planet space with the synced planet rotation, and each zone
 * is one dot product against a precomputed cosine. Enter and exit fire per zone,
 * keyed by kind, so a new kind of surface object is a registration and a handler.
 */
import { engine } from '@dcl/sdk/ecs'
import { Vector3 } from '@dcl/sdk/math'
import { isServer } from '@dcl/sdk/network'
import { EntityNames } from '../../assets/scene/entity-names'
import { findNamed, findPlanet } from '../abduction/sceneLookup'
import { getGameState } from '../gamestate'
import { SURFACE_ZONE_EXIT_MARGIN_DEGREES } from './constants'
import { cosOfDegrees, isWithinCos } from '../sphere/geometry'
import { shipPlanetDirection } from './geometry'

export type SurfaceZone = {
  id: number
  kind: string
  /** Unit direction from the planet center, in planet-local space. */
  direction: Vector3
  /** The ship is over the zone within this many degrees, measured from the planet center. */
  radiusDegrees: number
}

export type SurfaceZoneHandler = (zone: SurfaceZone) => void

type ZoneEntry = {
  zone: SurfaceZone
  cosEnter: number
  cosExit: number
  inside: boolean
}

const zones = new Map<number, ZoneEntry>()
const enterHandlers = new Map<string, SurfaceZoneHandler[]>()
const exitHandlers = new Map<string, SurfaceZoneHandler[]>()

function addHandler(table: Map<string, SurfaceZoneHandler[]>, kind: string, handler: SurfaceZoneHandler): void {
  const list = table.get(kind)
  if (list) list.push(handler)
  else table.set(kind, [handler])
}

function fire(table: Map<string, SurfaceZoneHandler[]>, zone: SurfaceZone): void {
  for (const handler of table.get(zone.kind) ?? []) handler(zone)
}

/** Server-only. Adds or replaces the zone with this id. It starts outside. */
export function addSurfaceZone(zone: SurfaceZone): void {
  const direction = Vector3.normalize(zone.direction)
  zones.set(zone.id, {
    zone: { ...zone, direction },
    cosEnter: cosOfDegrees(zone.radiusDegrees),
    cosExit: cosOfDegrees(zone.radiusDegrees + SURFACE_ZONE_EXIT_MARGIN_DEGREES),
    inside: false
  })
}

/** Server-only. Removing a zone does not fire exit. */
export function removeSurfaceZone(id: number): void {
  zones.delete(id)
}

export function getSurfaceZones(): SurfaceZone[] {
  return Array.from(zones.values(), (entry) => entry.zone)
}

/** Runs when the ship moves over a zone of this kind. */
export function onSurfaceZoneEnter(kind: string, handler: SurfaceZoneHandler): void {
  addHandler(enterHandlers, kind, handler)
}

/** Runs when the ship leaves a zone of this kind. */
export function onSurfaceZoneExit(kind: string, handler: SurfaceZoneHandler): void {
  addHandler(exitHandlers, kind, handler)
}

function SurfaceZoneSystem(): void {
  if (zones.size === 0) return
  const ship = findNamed(EntityNames.Ship)
  const planet = findPlanet()
  if (ship === null || planet === null) return

  const shipDirection = shipPlanetDirection(planet, ship, getGameState().planetRotation)
  if (shipDirection === null) return

  for (const entry of zones.values()) {
    const inside = isWithinCos(shipDirection, entry.zone.direction, entry.inside ? entry.cosExit : entry.cosEnter)
    if (inside === entry.inside) continue
    entry.inside = inside
    fire(inside ? enterHandlers : exitHandlers, entry.zone)
  }
}

export function setupSurfaceZones(): void {
  zones.clear()
  enterHandlers.clear()
  exitHandlers.clear()
  if (!isServer()) return
  engine.addSystem(SurfaceZoneSystem)
}
