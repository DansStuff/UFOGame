import { TextShape } from '@dcl/sdk/ecs'
import { EntityNames } from '../../assets/scene/entity-names'
import { SAMPLES_REMAINING_LABEL } from '../constants'
import { getGameState } from '../gamestate'
import { Abductable, findAbductable } from './components'
import { findNamed, setVisible } from './sceneLookup'

/** The ship sign shows the current target's remaining samples while that target is on the ship. */
export function SamplesRemainingSystem(): void {
  const label = findNamed(EntityNames.SamplesRemaining)
  if (label === null) return

  const abductable = findAbductable()
  const abducting = abductable !== null && getGameState().abductableOnShip
  setVisible(label, abducting)
  if (!abducting || abductable === null) return

  const text = `${SAMPLES_REMAINING_LABEL} ${Abductable.get(abductable).samples}`
  const shape = TextShape.getOrNull(label)
  if (shape === null || shape.text === text) return
  TextShape.getMutable(label).text = text
}
