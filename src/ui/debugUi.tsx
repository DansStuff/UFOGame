/**
 * Temporary debug controls. The button returns the player to the scene spawn.
 * Kept as coded UI so it can sit beside the editable samples HUD.
 */
import { engine, Entity } from '@dcl/sdk/ecs'
import ReactEcs, { ReactEcsRenderer, UiEntity } from '@dcl/sdk/react-ecs'
import { Color4, Vector3 } from '@dcl/sdk/math'
import { movePlayerTo } from '~system/RestrictedActions'
import { DEBUG_SPAWN_X, DEBUG_SPAWN_Y, DEBUG_SPAWN_Z } from '../constants'
import { markActivity } from '../player/activity'

let owner: Entity | null = null

export function setupDebugUi(): void {
  if (owner !== null) return
  owner = engine.addEntity()
  ReactEcsRenderer.addUiRenderer(owner, uiMenu, {
    virtualWidth: 1920,
    virtualHeight: 1080,
    screenInset: 'interactable'
  })
}

function returnToShip(): void {
  markActivity()
  void movePlayerTo({
    newRelativePosition: Vector3.create(DEBUG_SPAWN_X, DEBUG_SPAWN_Y, DEBUG_SPAWN_Z)
  })
}

const uiMenu = () => (
  <UiEntity
    uiTransform={{
      width: '100%',
      height: '100%',
      flexDirection: 'column',
      justifyContent: 'flex-end',
      alignItems: 'center',
      padding: { bottom: 32 },
      pointerFilter: 'none'
    }}
  >
    <UiEntity
      uiTransform={{
        width: 240,
        height: 56,
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
  </UiEntity>
)
