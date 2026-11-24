import ReactEcs from '@dcl/sdk/react-ecs'
import {
  Background,
  ButtonImageClose,
  Column,
  H2,
  Layer,
  Row,
  Text,
  ZoneType,
  getTheme
} from '@stom66/dcl-ui-component-kit'
import { withClick } from '../../sfx'
import { POPUP_PANEL_HEIGHT, POPUP_PANEL_WIDTH, REDEEM_HEADER_HEIGHT, REDEEM_PADDING } from '../constants'

// MARK: RedeemLayer
/**
 * Placeholder sample redeem window, POPUP_PANEL_WIDTH x POPUP_PANEL_HEIGHT centered on
 * the FullScreen zone, with a title row and a close button; the body is a stand-in for now.
 */
class RedeemLayer extends Layer {
  constructor() {
    super({
      id: 'redeem',
      zone: ZoneType.FullScreen,
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
  }

  close(): void {
    if (!this.isOpen) return
    this.hide()
  }

  protected body() {
    const theme = getTheme()
    return (
      <Column
        key="redeem_window"
        width={POPUP_PANEL_WIDTH}
        height={POPUP_PANEL_HEIGHT}
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
          <ButtonImageClose key="btn_redeem_close" id="btn_redeem_close" callback={withClick(() => this.close())} />
        </Row>
        <Column key="redeem_body" flexGrow={1} spacing={0} justifyContent="center" alignItems="center">
          <Text key="redeem_placeholder" value="Coming soon" fontColor={theme.colors.light} textAlign="middle-center" />
        </Column>
      </Column>
    )
  }
}

export const redeemLayer = new RedeemLayer()
