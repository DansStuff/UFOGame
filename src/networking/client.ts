/**
 * Client reactions to server notifies. Stale replays are ignored by timestamp.
 * The durable snapshot is GameState; these handlers are the edge triggers.
 */
import { isServer } from '@dcl/sdk/network'
import { catchUpFromGameState, hasBoundGameState, onGameStateCatchUp, type GameStateSnapshot } from '../gamestate'
import { room } from './messages'

export function setupClientRoom(): void {
  if (isServer()) return

  let appliedStartedAt = 0
  let appliedEndedAt = 0
  let appliedResetAt = 0

  function noteSnapshot(state: GameStateSnapshot): void {
    if (state.phase === 'inRound' && state.startedAt > appliedStartedAt) {
      appliedStartedAt = state.startedAt
      console.log(`[CLIENT] Round started (${state.startedAt})`)
    }
    if (state.phase === 'roundEnded' && state.endedAt > appliedEndedAt) {
      appliedEndedAt = state.endedAt
      console.log(`[CLIENT] Round ended (${state.endedAt})`)
    }
  }

  onGameStateCatchUp(noteSnapshot)
  if (hasBoundGameState()) catchUpFromGameState()

  room.onMessage('notifyRoundStart', (data) => {
    if (data.startedAt <= appliedStartedAt) return
    appliedStartedAt = data.startedAt
    console.log(`[CLIENT] Round started (${data.startedAt})`)
  })

  room.onMessage('notifyRoundEnd', (data) => {
    if (data.endedAt <= appliedEndedAt) return
    appliedEndedAt = data.endedAt
    console.log(`[CLIENT] Round ended (${data.endedAt})`)
  })

  room.onMessage('notifyRoundReset', (data) => {
    if (data.resetAt <= appliedResetAt) return
    appliedResetAt = data.resetAt
    appliedStartedAt = 0
    appliedEndedAt = 0
    console.log(`[CLIENT] Round reset (${data.resetAt})`)
  })

  let requestedInitialState = false
  const requestInitialState = () => {
    if (requestedInitialState) return
    requestedInitialState = true
    room.send('requestInitialState', { requestedAt: Date.now() })
  }

  const unsubscribe = room.onReady((ready) => {
    if (!ready) return
    requestInitialState()
    unsubscribe()
  })

  if (room.isReady()) {
    requestInitialState()
    unsubscribe()
  }
}
