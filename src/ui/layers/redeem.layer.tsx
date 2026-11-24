import ReactEcs from '@dcl/sdk/react-ecs'
import {
  Background,
  ButtonImageClose,
  ButtonText,
  Column,
  H2,
  Layer,
  Row,
  Text,
  ZoneType,
  getTheme
} from '@stom66/dcl-ui-component-kit'
import { REDEEM_BUTTON_SIZE, REDEEM_HEADER_HEIGHT, REDEEM_PADDING } from '../constants'

// MARK: RedeemLayer
/**
 * Placeholder sample redeem window. Fills DUCK's Default zone (the middle half of
 * the screen) with a title row and a close button; the body is a stand-in for now.
 */
class RedeemLayer extends Layer {
  constructor() {
    super({
      id: 'redeem',
      zone: ZoneType.Default,
      canBeHidden: true,
      startHidden: true,
      showFrom: 'bottom',
      hideTo: 'bottom',
      zIndex: 10
    })
  }

  /** True from the moment open() is called until close() is called. */
  get isOpen(): boolean {
    return !this.visibility.isHidden
  }

  open(): void {
    if (this.isOpen) return
    this.show()
    redeemButtonLayer.hide()
  }

  close(): void {
    if (!this.isOpen) return
    this.hide()
    redeemButtonLayer.show()
  }

  protected body() {
    const theme = getTheme()
    return (
      <Column
        key="redeem_window"
        width="100%"
        height="100%"
        spacing={0}
        padding={REDEEM_PADDING}
        alignItems="flex-start"
        pointerFilter="block"
      >
        <Background key="redeem_chrome" borderColor={theme.colors.secondary} borderRadius={theme.border.radiusSmall} />
        <Row
          key="redeem_header"
          height={REDEEM_HEADER_HEIGHT}
          spacing={0}
          justifyContent="space-between"
          alignItems="center"
        >
          <H2 key="redeem_title" value="Redeem Samples" fontColor={theme.colors.light} alignSelf="center" />
          <ButtonImageClose key="btn_redeem_close" id="btn_redeem_close" callback={() => this.close()} />
        </Row>
        <Column key="redeem_body" flexGrow={1} spacing={0} justifyContent="center" alignItems="center">
          <Text key="redeem_placeholder" value="Coming soon" fontColor={theme.colors.light} textAlign="middle-center" />
        </Column>
      </Column>
    )
  }
}

// MARK: RedeemButtonLayer
/** Top-right square "Redeem Samples" button. Slides away while the window is open. */
class RedeemButtonLayer extends Layer {
  constructor() {
    super({ id: 'redeem-button', zone: ZoneType.TopRight, canBeHidden: true, zIndex: 3 })
  }

  protected body() {
    const theme = getTheme()
    return (
      <ButtonText
        key="btn_redeem_open"
        id="btn_redeem_open"
        textLabel="Redeem Samples"
        height={REDEEM_BUTTON_SIZE}
        aspectRatio={1}
        textWrap="wrap"
        textAlign="middle-center"
        borderColor={theme.colors.secondary}
        fontColor={theme.colors.light}
        callback={() => redeemLayer.open()}
      />
    )
  }
}

export const redeemLayer = new RedeemLayer()
export const redeemButtonLayer = new RedeemButtonLayer()
