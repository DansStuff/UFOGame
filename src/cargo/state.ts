/**
 * Synced list of cargo on the deck. The server is the only writer.
 * Kept free of networking imports so ship steering can read it without a cycle.
 */
import { engine, Entity, Schemas } from '@dcl/sdk/ecs'
import { createServerSingleton, findSyncedSingleton } from '../gamestate/singleton'
import { CARGO_ARRIVAL_SECONDS, type CargoKind } from './constants'

const CARGO_STATE_SYNC_ID = 3

export const CargoState = engine.defineComponent('cargo:State', {
  items: Schemas.Array(
    Schemas.Map({
      id: Schemas.Int,
      kind: Schemas.String,
      /** Ship-local deck position, meters. */
      x: Schemas.Float,
      z: Schemas.Float,
      /** Degrees about the deck normal. */
      yaw: Schemas.Float,
      /** Server clock, ms, when it was abducted. Weight counts once the arrival has played. */
      addedAt: Schemas.Int64
    })
  )
})

export type CargoItem = {
  id: number
  kind: CargoKind
  x: number
  z: number
  yaw: number
  addedAt: number
}

let stateEntity: Entity | null = null

function isKind(value: string): value is CargoKind {
  return value === 'cornCob'
}

/** Server-only. Creates the synced entity. */
export function createCargoState(): void {
  stateEntity = createServerSingleton(CargoState, { items: [] }, CARGO_STATE_SYNC_ID)
}

export function resetCargoState(): void {
  stateEntity = null
}

/** False on a client until the synced state has arrived. */
export function hasCargoState(): boolean {
  stateEntity = findSyncedSingleton(CargoState, stateEntity)
  return stateEntity !== null
}

/** Items on the deck. Empty on a client until the synced state arrives. */
export function getCargoItems(): CargoItem[] {
  stateEntity = findSyncedSingleton(CargoState, stateEntity)
  if (stateEntity === null) return []
  const items: CargoItem[] = []
  for (const item of CargoState.get(stateEntity).items) {
    if (!isKind(item.kind)) continue
    items.push({ id: item.id, kind: item.kind, x: item.x, z: item.z, yaw: item.yaw, addedAt: item.addedAt })
  }
  return items
}

/** Server-only. Items that have finished arriving and so weigh on the deck. */
export function getLandedCargoItems(now: number): CargoItem[] {
  return getCargoItems().filter((item) => now - item.addedAt >= CARGO_ARRIVAL_SECONDS * 1000)
}

/** Server-only. */
export function writeCargoItems(items: CargoItem[]): void {
  if (stateEntity === null) return
  CargoState.getMutable(stateEntity).items = items.map((item) => ({ ...item }))
}
