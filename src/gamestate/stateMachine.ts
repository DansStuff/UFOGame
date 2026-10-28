/**
 * Server authority: legal transitions and the writes/notifies that follow.
 * `nextState` is pure and returns null for an illegal event, which drops the
 * request. Clients do not run this machine.
 */
import { isServer } from '@dcl/sdk/network'
import { applyRoundEnded, applyRoundReset, applyRoundStarted, getGameState, type GamePhase } from './index'
import { notifyRoundEnd, notifyRoundReset, notifyRoundStart, setupServerInbox } from './serverRoom'

export type GameEvent = { type: 'ROUND_START' } | { type: 'ROUND_END' } | { type: 'ROUND_RESET' }

let currentState: GamePhase = 'idle'

function nextState(state: GamePhase, event: GameEvent): GamePhase | null {
  switch (state) {
    case 'idle':
      if (event.type === 'ROUND_START') return 'inRound'
      return null
    case 'inRound':
      if (event.type === 'ROUND_END') return 'roundEnded'
      return null
    case 'roundEnded':
      if (event.type === 'ROUND_RESET') return 'idle'
      return null
  }
}

function applyTransition(from: GamePhase, to: GamePhase, event: GameEvent): void {
  console.log(`[STATE] ${from} → ${to} (${event.type})`)

  if (event.type === 'ROUND_START') {
    const startedAt = Date.now()
    applyRoundStarted(startedAt)
    notifyRoundStart(startedAt)
    return
  }

  if (event.type === 'ROUND_END') {
    const endedAt = Date.now()
    applyRoundEnded(endedAt)
    notifyRoundEnd(endedAt)
    return
  }

  if (event.type === 'ROUND_RESET') {
    applyRoundReset()
    notifyRoundReset(Date.now())
  }
}

export function processEvent(event: GameEvent): boolean {
  const next = nextState(currentState, event)
  if (next === null) {
    console.log(`[STATE] Ignored ${event.type} in ${currentState}`)
    return false
  }

  const from = currentState
  currentState = next
  applyTransition(from, next, event)
  return true
}

function publishPhase(to: string): void {
  const state = getGameState()
  if (state.phase === 'inRound') {
    notifyRoundStart(state.startedAt, to)
    return
  }
  if (state.phase === 'roundEnded') {
    notifyRoundEnd(state.endedAt, to)
  }
}

export function setupStateMachine(): void {
  currentState = 'idle'
  if (!isServer()) return

  setupServerInbox({
    onRoundStart: (from) => {
      if (processEvent({ type: 'ROUND_START' })) {
        console.log(`[SERVER] Round started by ${from}`)
      }
    },
    onRoundEnd: (from) => {
      if (processEvent({ type: 'ROUND_END' })) {
        console.log(`[SERVER] Round ended by ${from}`)
      }
    },
    onRoundReset: (from) => {
      if (processEvent({ type: 'ROUND_RESET' })) {
        console.log(`[SERVER] Round reset by ${from}`)
      }
    },
    onInitialState: (from) => {
      console.log(`[SERVER] Initial state requested by ${from}`)
      publishPhase(from)
    }
  })
}
