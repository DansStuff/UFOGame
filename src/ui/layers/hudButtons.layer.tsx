import ReactEcs from '@dcl/sdk/react-ecs'
import { ButtonText, Layer, Row, ZoneType, getTheme } from '@stom66/dcl-ui-component-kit'
import { HUD_BUTTON_GAP, HUD_BUTTON_SIZE } from '../constants'
import { redeemLayer } from './redeem.layer'
import { tutorialLayer } from './tutorial.layer'

/** One square top-right HUD button. */
function HudButton(props: { key?: string; id: string; label: string; onClick: () => void }) {
  const theme = getTheme()
  return (
    <ButtonText
      id={props.id}
      textLabel={props.label}
      height={HUD_BUTTON_SIZE}
      aspectRatio={1}
      textWrap="wrap"
      textAlign="middle-center"
      borderColor={theme.colors.secondary}
      fontColor={theme.colors.light}
      callback={props.onClick}
    />
  )
}

// MARK: HudButtonsLayer
/**
 * Top-right square buttons: Tutorial reopens the tutorial from its first page,
 * Redeem Samples opens the redeem window. src/ui/behaviors.ts slides the row away
 * while either popup is open.
 */
class HudButtonsLayer extends Layer {
  constructor() {
    super({ id: 'hud-buttons', zone: ZoneType.TopRight, canBeHidden: true, zIndex: 3 })
  }

  protected body() {
    return (
      <Row key="hud_buttons" spacing={HUD_BUTTON_GAP} width="auto" height="auto" alignItems="flex-start">
        <HudButton key="hud_tutorial" id="btn_tutorial_open" label="Tutorial" onClick={() => tutorialLayer.open()} />
        <HudButton key="hud_redeem" id="btn_redeem_open" label="Redeem Samples" onClick={() => redeemLayer.open()} />
      </Row>
    )
  }
}

export const hudButtonsLayer = new HudButtonsLayer()
