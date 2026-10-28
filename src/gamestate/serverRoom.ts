/**
 * The only server `room.onMessage` / `room.send`. Imported by the state
 * machine; other server modules notify through it, they do not import `room`.
 */
import { room } from '../networking/messages'

export type ServerInboxHandlers = {
  onRoundStart: (playerAddress: string) => void
  onRoundEnd: (playerAddress: string) => void
  onRoundReset: (playerAddress: string) => void
  onInitialState: (playerAddress: string) => void
}

export function notifyRoundStart(startedAt: number, to?: string): void {
  const payload = { startedAt }
  if (to) {
    room.send('notifyRoundStart', payload, { to: [to] })
    return
  }
  room.send('notifyRoundStart', payload)
}

export function notifyRoundEnd(endedAt: number, to?: string): void {
  const payload = { endedAt }
  if (to) {
    room.send('notifyRoundEnd', payload, { to: [to] })
    return
  }
  room.send('notifyRoundEnd', payload)
}

export function notifyRoundReset(resetAt: number, to?: string): void {
  const payload = { resetAt }
  if (to) {
    room.send('notifyRoundReset', payload, { to: [to] })
    return
  }
  room.send('notifyRoundReset', payload)
}

export function setupServerInbox(handlers: ServerInboxHandlers): void {
  room.onMessage('requestRoundStart', (_data, context) => {
    if (!context) return
    handlers.onRoundStart(context.from)
  })

  room.onMessage('requestRoundEnd', (_data, context) => {
    if (!context) return
    handlers.onRoundEnd(context.from)
  })

  room.onMessage('requestRoundReset', (_data, context) => {
    if (!context) return
    handlers.onRoundReset(context.from)
  })

  room.onMessage('requestInitialState', (_data, context) => {
    if (!context) return
    handlers.onInitialState(context.from)
  })
}
