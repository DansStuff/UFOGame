/**
 * Writes the crew sample total onto the samples HUD.
 * The counter layout lives in src/ui. This file is the only thing that changes its number.
 */
import { engine } from '@dcl/sdk/ecs'
import { isServer } from '@dcl/sdk/network'
import { getGameState } from './gamestate'
import { state as samplesHud } from './ui/SamplesCollected'

export function registerUiBehaviors(): void {
  if (isServer()) return
  engine.addSystem(function SamplesCollectedUiSystem() {
    samplesHud.samplesCollected = getGameState().samplesCollected
  })
}
