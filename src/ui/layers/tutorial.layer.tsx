import ReactEcs, { UiEntity } from '@dcl/sdk/react-ecs'
import { Background, ButtonText, Column, Layer, Row, ZoneType, getTheme } from '@stom66/dcl-ui-component-kit'
import {
  TUTORIAL_BUTTON_GAP,
  TUTORIAL_BUTTON_HEIGHT,
  TUTORIAL_BUTTON_WIDTH,
  TUTORIAL_IMAGES,
  TUTORIAL_PADDING
} from '../constants'

// MARK: TutorialLayer
/**
 * Centered tutorial popup. Fills DUCK's Default zone (the middle half of the screen)
 * with one page image and a Next button; the last page's button reads Done and closes.
 */
class TutorialLayer extends Layer {
  private page = 0

  constructor() {
    super({
      id: 'tutorial',
      zone: ZoneType.Default,
      canBeHidden: true,
      startHidden: TUTORIAL_IMAGES.length === 0,
      zIndex: 20
    })
  }

  get isOpen(): boolean {
    return !this.visibility.isHidden
  }

  /** Shows the tutorial from its first page. */
  open(): void {
    if (TUTORIAL_IMAGES.length === 0) return
    this.page = 0
    this.show()
  }

  close(): void {
    if (this.isOpen) this.hide()
  }

  private next(): void {
    if (this.page >= TUTORIAL_IMAGES.length - 1) {
      this.close()
      return
    }
    this.page++
  }

  protected body() {
    const theme = getTheme()
    const isLast = this.page >= TUTORIAL_IMAGES.length - 1
    const src = TUTORIAL_IMAGES[this.page] ?? ''
    return (
      <Column
        key="tutorial_popup"
        width="100%"
        height="100%"
        spacing={TUTORIAL_BUTTON_GAP}
        padding={TUTORIAL_PADDING}
        alignItems="center"
        pointerFilter="block"
      >
        <Background key="tutorial_chrome" borderColor={theme.colors.secondary} borderRadius={theme.border.radiusSmall} />
        <UiEntity
          key="tutorial_image"
          uiTransform={{ width: '100%', flexGrow: 1 }}
          uiBackground={{ textureMode: 'stretch', texture: { src } }}
        />
        <Row key="tutorial_actions" height={TUTORIAL_BUTTON_HEIGHT} spacing={0} justifyContent="flex-end">
          <ButtonText
            key="btn_tutorial_next"
            id="btn_tutorial_next"
            textLabel={isLast ? 'Done' : 'Next'}
            width={TUTORIAL_BUTTON_WIDTH}
            height={TUTORIAL_BUTTON_HEIGHT}
            borderColor={theme.colors.secondary}
            fontColor={theme.colors.light}
            callback={() => this.next()}
          />
        </Row>
      </Column>
    )
  }
}

export const tutorialLayer = new TutorialLayer()
