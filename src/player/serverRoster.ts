/**
 * Server-only diagnostics: what the server sees of each player entity.
 * Tracks when each player's Transform last changed, so a frozen position shows up in the logs,
 * and logs the whole roster every ROSTER_LOG_INTERVAL_SECONDS while anyone is in the scene.
 */
import { engine, Entity, PlayerIdentityData, Transform } from '@dcl/sdk/ecs'
import { isServer } from '@dcl/sdk/network'
import { SHIP_CENTER_X, SHIP_CENTER_Z } from '../ship/constants'

/** Seconds between periodic roster lines. */
const ROSTER_LOG_INTERVAL_SECONDS = 30

type Seen = { x: number; y: number; z: number; movedAt: number }

const lastSeen = new Map<Entity, Seen>()
let secondsSinceLog = 0

function ServerRosterSystem(dt: number): void {
  const now = Date.now()
  const present = new Set<Entity>()
  for (const [entity, , transform] of engine.getEntitiesWith(PlayerIdentityData, Transform)) {
    present.add(entity)
    const { x, y, z } = transform.position
    const seen = lastSeen.get(entity)
    if (!seen || seen.x !== x || seen.y !== y || seen.z !== z) lastSeen.set(entity, { x, y, z, movedAt: now })
  }
  for (const entity of Array.from(lastSeen.keys())) {
    if (!present.has(entity)) lastSeen.delete(entity)
  }

  secondsSinceLog += dt
  if (secondsSinceLog < ROSTER_LOG_INTERVAL_SECONDS) return
  secondsSinceLog = 0
  const summary = rosterSummary()
  if (summary === null) return
  console.log(`[SERVER] Roster: ${summary}; ${describeServerPlayers()}`)
}

/**
 * Counts first, so they survive if a long roster line is truncated.
 * Null when there are no player entities, so an empty scene logs nothing.
 */
function rosterSummary(): string | null {
  let total = 0
  let missingTransform = 0
  const addresses = new Map<string, number>()
  for (const [entity, identity] of engine.getEntitiesWith(PlayerIdentityData)) {
    total++
    if (!Transform.has(entity)) missingTransform++
    const key = identity.address.toLowerCase()
    addresses.set(key, (addresses.get(key) ?? 0) + 1)
  }
  if (total === 0) return null
  const duplicated = Array.from(addresses.values()).filter((count) => count > 1).length
  return `${total} player entities, ${missingTransform} without Transform, ${duplicated} duplicated addresses`
}

function describeEntity(entity: Entity, address: string, now: number): string {
  const transform = Transform.getOrNull(entity)
  if (!transform) return `#${entity} ${address} no Transform`
  const { x, y, z } = transform.position
  const fromCenter = Math.hypot(x - SHIP_CENTER_X, z - SHIP_CENTER_Z)
  const seen = lastSeen.get(entity)
  const moved = seen ? `${((now - seen.movedAt) / 1000).toFixed(1)}s ago` : 'never'
  return `#${entity} ${address} at (${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}), ${fromCenter.toFixed(1)}m from ship center, last moved ${moved}`
}

/** Every player entity the server sees, one per line. */
export function describeServerPlayers(): string {
  const now = Date.now()
  const lines: string[] = []
  for (const [entity, identity] of engine.getEntitiesWith(PlayerIdentityData)) {
    lines.push(describeEntity(entity, identity.address, now))
  }
  return lines.length ? lines.join(' | ') : 'no player entities'
}

/** Every entity the server sees with this address. More than one means a stale duplicate. */
export function describeServerPlayer(address: string): string {
  const now = Date.now()
  const lines: string[] = []
  for (const [entity, identity] of engine.getEntitiesWith(PlayerIdentityData)) {
    if (identity.address.toLowerCase() !== address.toLowerCase()) continue
    lines.push(describeEntity(entity, identity.address, now))
  }
  return lines.length ? `${lines.length} entity(ies): ${lines.join(' | ')}` : 'no entity with this address'
}

export function setupServerRoster(): void {
  lastSeen.clear()
  secondsSinceLog = 0
  if (!isServer()) return
  engine.addSystem(ServerRosterSystem)
}
