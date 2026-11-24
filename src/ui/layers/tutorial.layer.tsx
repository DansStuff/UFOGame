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
  TUTORIAL_DEFAULT_FPS,
  TUTORIAL_PAGES,
  TUTORIAL_PADDING
} from '../constants'
import type { TutorialPage } from '../constants'

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

/** Play order for a page: its `sequence` minus out-of-range indices, else every frame in order. */
function pageSequence(page: TutorialPage): number[] {
  const valid = (page.sequence ?? []).filter((i) => Number.isInteger(i) && i >= 0 && i < page.frames.length)
  return valid.length > 0 ? valid : page.frames.map((_, i) => i)
}

/** Frame image to show `elapsed` seconds into the page. The sequence loops. */
function pageFrameSrc(page: TutorialPage, elapsed: number): string {
  const sequence = pageSequence(page)
  if (sequence.length === 0) return ''
  const fps = page.fps !== undefined && page.fps > 0 ? page.fps : TUTORIAL_DEFAULT_FPS
  const step = Math.floor(elapsed * fps) % sequence.length
  return page.frames[sequence[step]] ?? ''
}

// MARK: TutorialLayer
/**
 * Centered tutorial popup. Fills DUCK's Default zone (the middle half of the screen)
 * with one page image and a Next button; the last page's button reads Done and closes.
 * The image keeps its aspect and is centered in the space above the button. Each page is a
 * looping flipbook (see TutorialPage); src/ui/behaviors.ts advances it with tick().
 */
class TutorialLayer extends Layer {
  private page = 0
  /** Seconds since the current page appeared. Drives its flipbook. */
  private elapsed = 0

  constructor() {
    super({
      id: 'tutorial',
      zone: ZoneType.Default,
      canBeHidden: true,
      startHidden: TUTORIAL_PAGES.length === 0,
      zIndex: 20
    })
  }

  get isOpen(): boolean {
    return !this.visibility.isHidden
  }

  /** Shows the tutorial from its first page. */
  open(): void {
    if (TUTORIAL_PAGES.length === 0) return
    this.page = 0
    this.elapsed = 0
    this.show()
  }

  close(): void {
    if (this.isOpen) this.hide()
  }

  private next(): void {
    if (this.page >= TUTORIAL_PAGES.length - 1) {
      this.close()
      return
    }
    this.page++
    this.elapsed = 0
  }

  /** Advances the current page's flipbook. Called once per frame. */
  tick(dt: number): void {
    if (this.isOpen) this.elapsed += dt
  }

  protected body() {
    const theme = getTheme()
    const isLast = this.page >= TUTORIAL_PAGES.length - 1
    const page = TUTORIAL_PAGES[this.page]
    const src = page ? pageFrameSrc(page, this.elapsed) : ''
    const size = fitTutorialImage(page?.aspect ?? TUTORIAL_DEFAULT_ASPECT)
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
          {(page?.frames ?? []).map((frame, i) => (
            // Invisible 1px copies of every frame so the textures load before the flipbook reaches them.
            <UiEntity
              key={`tutorial_preload_${i}`}
              uiTransform={{ width: 1, height: 1, positionType: 'absolute', position: { left: 0, top: 0 } }}
              uiBackground={{ textureMode: 'stretch', texture: { src: frame }, color: { r: 1, g: 1, b: 1, a: 0 } }}
            />
          ))}
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
