import { Schemas } from '@dcl/sdk/ecs'
import { registerMessages } from '@dcl/sdk/network'

export const Messages = {
  // Client → Server
  // Empty Map payloads can be dropped by the transport (seen on server→client).
  // Keep a timestamp so these always have a body.
  requestRoundStart: Schemas.Map({
    requestedAt: Schemas.Int64
  }),
  requestRoundEnd: Schemas.Map({
    requestedAt: Schemas.Int64
  }),
  requestRoundReset: Schemas.Map({
    requestedAt: Schemas.Int64
  }),
  requestInitialState: Schemas.Map({
    requestedAt: Schemas.Int64
  }),
  requestProbe: Schemas.Map({
    requestedAt: Schemas.Int64,
    abductableId: Schemas.Int
  }),
  requestActivity: Schemas.Map({
    reportedAt: Schemas.Int64
  }),

  // Server → Client
  notifyRoundStart: Schemas.Map({
    startedAt: Schemas.Int64
  }),
  notifyRoundEnd: Schemas.Map({
    endedAt: Schemas.Int64
  }),
  notifyRoundReset: Schemas.Map({
    resetAt: Schemas.Int64
  }),
  notifyActivityRecall: Schemas.Map({
    recalledAt: Schemas.Int64,
    x: Schemas.Float,
    y: Schemas.Float,
    z: Schemas.Float
  }),
  notifyProbed: Schemas.Map({
    probedAt: Schemas.Int64
  })
}

export const room = registerMessages(Messages)
