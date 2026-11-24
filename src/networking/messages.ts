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
  requestRemoveCargo: Schemas.Map({
    requestedAt: Schemas.Int64,
    cargoId: Schemas.Int
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
  }),
  /** Every prop on the planet. Sent to one client in reply to requestInitialState. */
  notifyPlanetProps: Schemas.Map({
    sentAt: Schemas.Int64,
    props: Schemas.Array(
      Schemas.Map({
        id: Schemas.Int,
        kind: Schemas.String,
        x: Schemas.Float,
        y: Schemas.Float,
        z: Schemas.Float,
        /** Planet-local direction the model's front (+Z) points along the surface. Zero for no set facing. */
        fx: Schemas.Float,
        fy: Schemas.Float,
        fz: Schemas.Float
      })
    )
  }),
  /** The ship flew over a newsstand. Sent to everyone; each client throws tabloids at the screen. */
  notifyTabloids: Schemas.Map({
    sentAt: Schemas.Int64,
    newsstandId: Schemas.Int
  })
}

export const room = registerMessages(Messages)
