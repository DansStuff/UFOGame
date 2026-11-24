import ReactEcs, { UiEntity } from '@dcl/sdk/react-ecs'
import {
  Background,
  ButtonText,
  Column,
  Layer,
  Row,
  ZoneType,
  getTheme,
  sizeValueToPixels
} from '@stom66/dcl-ui-component-kit'
import {
  TUTORIAL_BUTTON_GAP,
  TUTORIAL_BUTTON_HEIGHT,
  TUTORIAL_BUTTON_WIDTH,
  TUTORIAL_DEFAULT_ASPECT,
  TUTORIAL_IMAGES,
  TUTORIAL_PADDING
} from '../constants'

/** Size of DUCK's Default zone, which this layer fills: half the virtual canvas each way. */
const TUTORIAL_ZONE_WIDTH = '50vw'
const TUTORIAL_ZONE_HEIGHT = '50vh'

/**
 * Largest box with the page's aspect that fits the space left in the popup
 * after padding and the button row. Virtual pixels.
 */
function fitTutorialImage(aspect: number): { width: number; height: number } {
  const zoneWidth = sizeValueToPixels(TUTORIAL_ZONE_WIDTH) ?? 0
  const zoneHeight = sizeValueToPixels(TUTORIAL_ZONE_HEIGHT) ?? 0
  const maxWidth = Math.max(1, zoneWidth - TUTORIAL_PADDING * 2)
  const maxHeight = Math.max(1, zoneHeight - TUTORIAL_PADDING * 2 - TUTORIAL_BUTTON_GAP - TUTORIAL_BUTTON_HEIGHT)
  const ratio = aspect > 0 ? aspect : TUTORIAL_DEFAULT_ASPECT
  if (maxWidth / maxHeight > ratio) {
    return { width: Math.floor(maxHeight * ratio), height: Math.floor(maxHeight) }
  }
  return { width: Math.floor(maxWidth), height: Math.floor(maxWidth / ratio) }
}

// MARK: TutorialLayer
/**
 * Centered tutorial popup. Fills DUCK's Default zone (the middle half of the screen)
 * with one page image and a Next button; the last page's button reads Done and closes.
 * The image keeps its aspect (see TutorialImage) and is centered in the space above the button.
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
    const image = TUTORIAL_IMAGES[this.page]
    const src = image?.src ?? ''
    const size = fitTutorialImage(image?.aspect ?? TUTORIAL_DEFAULT_ASPECT)
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
          key="tutorial_image_area"
          uiTransform={{ width: '100%', flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}
        >
          <UiEntity
            key="tutorial_image"
            uiTransform={{ width: size.width, height: size.height, flexShrink: 0 }}
            uiBackground={{ textureMode: 'stretch', texture: { src } }}
          />
        </UiEntity>
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
