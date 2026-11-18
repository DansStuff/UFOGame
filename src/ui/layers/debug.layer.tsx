import ReactEcs from '@dcl/sdk/react-ecs'
import { Vector3 } from '@dcl/sdk/math'
import { movePlayerTo } from '~system/RestrictedActions'
import { ButtonText, Layer, ZoneType, getTheme } from '@stom66/dcl-ui-component-kit'
import { DEBUG_BUTTON_HEIGHT, DEBUG_BUTTON_WIDTH, DEBUG_SPAWN_X, DEBUG_SPAWN_Y, DEBUG_SPAWN_Z } from '../constants'
import { markActivity } from '../../player/activity'

function returnToShip(): void {
  markActivity()
  void movePlayerTo({
    newRelativePosition: Vector3.create(DEBUG_SPAWN_X, DEBUG_SPAWN_Y, DEBUG_SPAWN_Z)
  })
}

// MARK: DebugLayer
/** Temporary debug control. The button returns the player to the scene spawn. */
class DebugLayer extends Layer {
  constructor() {
    super({ id: 'debug', zone: ZoneType.BottomCenter, zIndex: 2 })
  }

  protected body() {
    const theme = getTheme()
    return (
      <ButtonText
        key="btn_debug_return"
        id="btn_debug_return"
        textLabel="I Fell :("
        width={DEBUG_BUTTON_WIDTH}
        height={DEBUG_BUTTON_HEIGHT}
        backgroundColor={theme.colors.dark}
        fontColor={theme.colors.light}
        callback={returnToShip}
      />
    )
  }
}

export const debugLayer = new DebugLayer()
