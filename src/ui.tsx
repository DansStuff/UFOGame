/**
 * Temporary debug controls. The button returns the player to the scene spawn.
 */
import ReactEcs, { ReactEcsRenderer, UiEntity } from '@dcl/sdk/react-ecs'
import { Color4, Vector3 } from '@dcl/sdk/math'
import { movePlayerTo } from '~system/RestrictedActions'
import { markActivity } from './activity'
import { DEBUG_SPAWN_X, DEBUG_SPAWN_Y, DEBUG_SPAWN_Z } from './constants'

export function setupUi() {
  ReactEcsRenderer.setUiRenderer(uiMenu, { virtualWidth: 1920, virtualHeight: 1080 })
}

function returnToShip(): void {
  markActivity()
  void movePlayerTo({
    newRelativePosition: Vector3.create(DEBUG_SPAWN_X, DEBUG_SPAWN_Y, DEBUG_SPAWN_Z)
  })
}

export const uiMenu = () => (
  <UiEntity
    uiTransform={{
      width: 240,
      height: 56,
      positionType: 'absolute',
      position: { right: 32, bottom: 32 },
      alignItems: 'center',
      justifyContent: 'center'
    }}
    uiBackground={{ color: Color4.create(0.12, 0.14, 0.18, 0.92) }}
    uiText={{
      value: 'I Fell :(',
      fontSize: 22,
      color: Color4.White(),
      textAlign: 'middle-center'
    }}
    onMouseDown={returnToShip}
  />
)
