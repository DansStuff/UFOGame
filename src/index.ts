/**
 * Scene composition root. Calls each domain `setup*` and, on the client,
 * registers notify handlers. Server request handling lives in the state machine.
 */
import { isServer } from '@dcl/sdk/network'
import { setupAbduction } from './abduction'
import { setupCamera } from './camera'
import { setupGameState } from './gamestate'
import { setupStateMachine } from './gamestate/stateMachine'
import { setupClientRoom } from './networking/client'
import { setupActivity } from './player/activity'
import { setupSceneEntities } from './scene/entities'
import { setupShipMotion } from './ship/motion'
import { setupProbes } from './ship/probes'
import { setupSaucerFX } from './ship/saucerFx'
import { setupShipWind } from './ship/wind'
import { registerUiBehaviors } from './ui/behaviors'
import { setupDebugUi } from './ui/debugUi'
import { setupUi } from './ui/index'

export function main() {
  setupGameState()
  setupStateMachine()
  setupShipMotion()
  setupAbduction()
  setupActivity()

  if (isServer()) {
    console.log('[SERVER] Init server')
    return
  }

  setupSceneEntities()
  setupCamera()
  setupClientRoom()
  setupShipWind()
  setupSaucerFX()
  setupProbes()
  setupUi()
  registerUiBehaviors()
  setupDebugUi()
}
