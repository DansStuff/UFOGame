/**
 * Synced list of props that are unavailable for now (a corn field whose cob was just taken,
 * a newsstand whose tabloids are still on screen). The server is the only writer and makes
 * each prop available again once its cooldown runs out. Clients poll `isPlanetPropAvailable`
 * to pick visuals.
 */
import { engine, Entity, Schemas } from '@dcl/sdk/ecs'
import { createServerSingleton, findSyncedSingleton } from '../gamestate/singleton'

const PLANET_PROP_STATE_SYNC_ID = 2

export const PlanetPropState = engine.defineComponent('planetProps:State', {
  /** Ids of props that are unavailable. Every other prop is available. */
  depleted: Schemas.Array(Schemas.Int)
})

let stateEntity: Entity | null = null
/** Server-only. Server clock, ms, when each unavailable prop becomes available again. */
const availableAgainAt = new Map<number, number>()

/** Server-only. Creates the synced entity with every prop available. */
export function createPlanetPropState(): void {
  stateEntity = createServerSingleton(PlanetPropState, { depleted: [] }, PLANET_PROP_STATE_SYNC_ID)
}

export function resetPlanetPropState(): void {
  stateEntity = null
  availableAgainAt.clear()
}

/** False while the prop is cooling down. Also true on a client before the synced state arrives. */
export function isPlanetPropAvailable(id: number): boolean {
  stateEntity = findSyncedSingleton(PlanetPropState, stateEntity)
  if (stateEntity === null) return true
  return !PlanetPropState.get(stateEntity).depleted.includes(id)
}

/**
 * Server-only. Marks the prop unavailable for `cooldownSeconds`, then it is available again.
 * Returns false, and changes nothing, if it is already unavailable.
 */
export function takePlanetProp(id: number, cooldownSeconds: number): boolean {
  if (stateEntity === null || !isPlanetPropAvailable(id)) return false
  PlanetPropState.getMutable(stateEntity).depleted.push(id)
  availableAgainAt.set(id, Date.now() + cooldownSeconds * 1000)
  return true
}

/** Server-only. Makes props available again once their cooldown has run out. */
export function PlanetPropCooldownSystem(): void {
  if (stateEntity === null || availableAgainAt.size === 0) return
  const now = Date.now()
  const due: number[] = []
  for (const [id, at] of availableAgainAt) if (now >= at) due.push(id)
  if (due.length === 0) return
  for (const id of due) availableAgainAt.delete(id)
  const state = PlanetPropState.getMutable(stateEntity)
  state.depleted = state.depleted.filter((id) => !due.includes(id))
}
