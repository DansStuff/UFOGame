/**
 * The abductable is a cow on the planet surface. The server picks a direction
 * once, stores it on GameState with a spawn id, and keeps the angle from the
 * planet center up to date. Each client parents the cow to the planet along
 * that ray, so it spins with the surface. Each target starts with its own sample
 * count. A successful probe removes one. At zero a new id replaces the cow.
 * Local up points away from the planet origin.
 *
 * Server: `lift.ts` owns the angle, the lift onto the ship, and the fall back down.
 * Client: `spawn.ts` and `placement.ts` mirror the cow from GameState,
 * `spinner.ts` tumbles it while airborne, `arrows.ts` and `samplesLabel.ts`
 * drive the guidance arrows and the ship sign, and `sound.ts` plays the moo.
 */
import { engine } from '@dcl/sdk/ecs'
import { isServer } from '@dcl/sdk/network'
import { setOnProbeAccepted } from '../networking/client'
import { AbductableArrowSystem, CompassArrowSystem, RedArrowSystem } from './arrows'
import { AbductableAngleSystem, replaceAbductable, resetLift } from './lift'
import { resetClientCarry } from './placement'
import { SamplesRemainingSystem } from './samplesLabel'
import { resetSceneLookup } from './sceneLookup'
import { preloadProbeClips, playProbeSound, resetMooSpeaker } from './sound'
import { AbductableSpawnSystem } from './spawn'
import { SpinnerSystem } from './spinner'

export { replaceAbductable } from './lift'

export function setupAbduction(): void {
  resetSceneLookup()
  resetMooSpeaker()
  resetLift()
  resetClientCarry()

  if (isServer()) {
    replaceAbductable()
    engine.addSystem(AbductableAngleSystem)
    return
  }

  setOnProbeAccepted(playProbeSound)
  preloadProbeClips()
  engine.addSystem(AbductableSpawnSystem)
  engine.addSystem(SpinnerSystem)
  engine.addSystem(RedArrowSystem)
  engine.addSystem(CompassArrowSystem)
  engine.addSystem(AbductableArrowSystem)
  engine.addSystem(SamplesRemainingSystem)
}
