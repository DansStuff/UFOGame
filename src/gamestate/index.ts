import { engine, Entity } from '@dcl/sdk/ecs'
import { isServer, syncEntity } from '@dcl/sdk/network'
import { AUTH_SERVER_PEER_ID } from '@dcl/sdk/network/message-bus-sync'
import {
  GameState,
  type GamePhase,
  type GameStateSnapshot,
  type PlanetAngularVelocitySnapshot,
  type PlanetRotationSnapshot
} from './schema'

export {
  GameState,
  type GamePhase,
  type GameStateSnapshot,
  type PlanetAngularVelocitySnapshot,
  type PlanetRotationSnapshot
} from './schema'

const GAME_STATE_SYNC_ID = 1
const RESERVED_ENTITY_SLOT = 512

let stateEntity: Entity | null = null
const catchUpListeners: Array<(state: GameStateSnapshot) => void> = []

export function defaultGameState(): GameStateSnapshot {
  return {
    phase: 'idle',
    startedAt: 0,
    endedAt: 0,
    shipPitch: 0,
    shipRoll: 0,
    planetRotation: { x: 0, y: 0, z: 0, w: 1 },
    planetAngularVelocity: { x: 0, y: 0, z: 0 }
  }
}

function stateEntityOrThrow(): Entity {
  if (stateEntity === null) {
    throw new Error('GameState entity is not created; call setupGameState() first')
  }
  return stateEntity
}

function asPhase(phase: string): GamePhase {
  if (phase === 'inRound' || phase === 'roundEnded') return phase
  return 'idle'
}

function readSnapshot(): GameStateSnapshot {
  const state = GameState.getOrNull(stateEntityOrThrow())
  if (!state) return defaultGameState()
  return {
    phase: asPhase(state.phase),
    startedAt: state.startedAt,
    endedAt: state.endedAt,
    shipPitch: state.shipPitch,
    shipRoll: state.shipRoll,
    planetRotation: copyRotation(state.planetRotation),
    planetAngularVelocity: copyAngularVelocity(state.planetAngularVelocity)
  }
}

function copyRotation(rotation: PlanetRotationSnapshot | undefined): PlanetRotationSnapshot {
  if (!rotation) return { x: 0, y: 0, z: 0, w: 1 }
  return { x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w }
}

function copyAngularVelocity(velocity: PlanetAngularVelocitySnapshot | undefined): PlanetAngularVelocitySnapshot {
  if (!velocity) return { x: 0, y: 0, z: 0 }
  return { x: velocity.x, y: velocity.y, z: velocity.z }
}

/** Subscribe to the snapshot applied when this client first binds the synced entity. */
export function onGameStateCatchUp(listener: (state: GameStateSnapshot) => void): void {
  catchUpListeners.push(listener)
}

export function hasBoundGameState(): boolean {
  return stateEntity !== null && GameState.getOrNull(stateEntity) !== null
}

/** Apply the replicated snapshot. Idempotent; listeners must be too. */
export function catchUpFromGameState(): void {
  const state = getGameState()
  console.log(`[CLIENT] GameState catch-up: phase=${state.phase} startedAt=${state.startedAt} endedAt=${state.endedAt}`)
  for (const listener of catchUpListeners) listener(state)
}

function bindClientGameState(): boolean {
  if (stateEntity !== null) return true
  for (const [entity] of engine.getEntitiesWith(GameState)) {
    // Local entities sit below the reserved slot. The synced GameState arrives above it.
    if ((entity & 0xffff) < RESERVED_ENTITY_SLOT) continue
    stateEntity = entity
    catchUpFromGameState()
    return true
  }
  return false
}

export function getGameState(): GameStateSnapshot {
  if (!isServer() && stateEntity === null) {
    bindClientGameState()
  }
  if (stateEntity === null) return defaultGameState()
  return readSnapshot()
}

export function applyRoundStarted(startedAt: number): void {
  const state = GameState.getMutable(stateEntityOrThrow())
  state.phase = 'inRound'
  state.startedAt = startedAt
  state.endedAt = 0
}

export function applyRoundEnded(endedAt: number): void {
  const state = GameState.getMutable(stateEntityOrThrow())
  state.phase = 'roundEnded'
  state.endedAt = endedAt
}

export function applyRoundReset(): void {
  const state = GameState.getMutable(stateEntityOrThrow())
  state.phase = 'idle'
  state.startedAt = 0
  state.endedAt = 0
}

/** Server-only. Pitch and roll are degrees. Angular velocity is degrees per second. */
export function applyShipMotion(
  pitch: number,
  roll: number,
  planetRotation: PlanetRotationSnapshot,
  planetAngularVelocity: PlanetAngularVelocitySnapshot
): void {
  const state = GameState.getMutable(stateEntityOrThrow())
  state.shipPitch = pitch
  state.shipRoll = roll
  state.planetRotation.x = planetRotation.x
  state.planetRotation.y = planetRotation.y
  state.planetRotation.z = planetRotation.z
  state.planetRotation.w = planetRotation.w
  state.planetAngularVelocity.x = planetAngularVelocity.x
  state.planetAngularVelocity.y = planetAngularVelocity.y
  state.planetAngularVelocity.z = planetAngularVelocity.z
}

export function setupGameState(): void {
  if (isServer()) {
    if (stateEntity !== null) return
    stateEntity = engine.addEntity()
    GameState.create(stateEntity, defaultGameState())
    syncEntity(stateEntity, [GameState.componentId], GAME_STATE_SYNC_ID)
    GameState.validateBeforeChange((value) => value.senderAddress === AUTH_SERVER_PEER_ID)
    return
  }

  bindClientGameState()
  engine.addSystem(function BindGameStateSystem() {
    if (stateEntity !== null && !GameState.getOrNull(stateEntity)) {
      stateEntity = null
    }
    if (stateEntity !== null) return
    bindClientGameState()
  })
}
