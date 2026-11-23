/**
 * Synced list of props that have nothing left to give (a corn field whose cob was taken).
 * The server is the only writer. Clients poll `isPlanetPropAvailable` to pick visuals.
 */
import { engine, Entity, Schemas } from '@dcl/sdk/ecs'
import { createServerSingleton, findSyncedSingleton } from '../gamestate/singleton'

const PLANET_PROP_STATE_SYNC_ID = 2

export const PlanetPropState = engine.defineComponent('planetProps:State', {
  /** Ids of props that are used up. Every other prop is available. */
  depleted: Schemas.Array(Schemas.Int)
})

let stateEntity: Entity | null = null

/** Server-only. Creates the synced entity with every prop available. */
export function createPlanetPropState(): void {
  stateEntity = createServerSingleton(PlanetPropState, { depleted: [] }, PLANET_PROP_STATE_SYNC_ID)
}

export function resetPlanetPropState(): void {
  stateEntity = null
}

/** True until the prop has been used up. Also true on a client before the synced state arrives. */
export function isPlanetPropAvailable(id: number): boolean {
  stateEntity = findSyncedSingleton(PlanetPropState, stateEntity)
  if (stateEntity === null) return true
  return !PlanetPropState.get(stateEntity).depleted.includes(id)
}

/** Server-only. Marks the prop used up. Returns false if it already was. */
export function depletePlanetProp(id: number): boolean {
  if (stateEntity === null || !isPlanetPropAvailable(id)) return false
  PlanetPropState.getMutable(stateEntity).depleted.push(id)
  return true
}
