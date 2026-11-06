/**
 * Scene composition root. Calls each domain `setup*` and, on the client,
 * registers notify handlers. Server request handling lives in the state machine.
 */
import { isServer } from '@dcl/sdk/network'
import { setupAbduction } from './abduction'
import { setupGameState } from './gamestate'
import { setupStateMachine } from './gamestate/stateMachine'
import { setupClientRoom } from './networking/client'
import { setupSaucerFX } from './saucerFx'
import { setupShipMotion } from './shipMotion'
import { setupShipWind } from './shipWind'
import { setupUi } from './ui'

export function main() {
  setupGameState()
  setupStateMachine()
  setupShipMotion()
  setupAbduction()

  if (isServer()) {
    console.log('[SERVER] Init server')
    return
  }

  setupClientRoom()
  setupShipWind()
  setupSaucerFX()
  setupUi()
}
