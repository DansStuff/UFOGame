/**
 * Server-owned synced singletons: one entity carrying one component, written only by
 * the server and read by every client. GameState predates this helper; newer domains
 * (planet prop state, deck cargo) use it so each piece of state syncs on its own and
 * does not ride along with GameState, which changes every tick the planet spins.
 */
import { engine, Entity, type MapComponentDefinition } from '@dcl/sdk/ecs'
import { isServer, syncEntity } from '@dcl/sdk/network'
import { AUTH_SERVER_PEER_ID } from '@dcl/sdk/network/message-bus-sync'

/** Local entities sit below this slot. Synced entities from the server arrive above it. */
const RESERVED_ENTITY_SLOT = 512

/** Server-only. Creates the entity, syncs it with `syncId`, and rejects writes from anyone but the server. */
export function createServerSingleton<T>(component: MapComponentDefinition<T>, value: T, syncId: number): Entity {
  const entity = engine.addEntity()
  component.create(entity, value)
  syncEntity(entity, [component.componentId], syncId)
  component.validateBeforeChange((change) => change.senderAddress === AUTH_SERVER_PEER_ID)
  return entity
}

/**
 * Finds the synced entity carrying `component`, or null until it has arrived.
 * On the server, pass the entity returned by createServerSingleton instead.
 */
export function findSyncedSingleton<T>(component: MapComponentDefinition<T>, cached: Entity | null): Entity | null {
  if (cached !== null && component.has(cached)) return cached
  if (isServer()) return null
  for (const [entity] of engine.getEntitiesWith(component)) {
    if ((entity & 0xffff) < RESERVED_ENTITY_SLOT) continue
    return entity
  }
  return null
}
