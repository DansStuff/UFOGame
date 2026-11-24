import ReactEcs, { UiEntity } from '@dcl/sdk/react-ecs'
import {
  Background,
  ButtonText,
  Column,
  H2,
  Layer,
  Row,
  ZoneType,
  getTheme,
  sizeValueToPixels
} from '@stom66/dcl-ui-component-kit'
import {
  POPUP_PANEL_HEIGHT,
  POPUP_PANEL_WIDTH,
  TUTORIAL_BUTTON_FONT_SIZE,
  TUTORIAL_BUTTON_GAP,
  TUTORIAL_BUTTON_HEIGHT,
  TUTORIAL_BUTTON_WIDTH,
  TUTORIAL_DEFAULT_ASPECT,
  TUTORIAL_DEFAULT_FPS,
  TUTORIAL_PAGES,
  TUTORIAL_PADDING,
  TUTORIAL_TITLE_FONT_SIZE,
  TUTORIAL_TITLE_HEIGHT
} from '../constants'
import type { TutorialFrame, TutorialPage } from '../constants'

/**
 * Largest box with the page's aspect that fits the space left in the popup
 * after padding, the title row (when there is one) and the button row. Virtual pixels.
 */
function fitTutorialImage(aspect: number, hasTitle: boolean): { width: number; height: number } {
  const zoneWidth = sizeValueToPixels(POPUP_PANEL_WIDTH) ?? 0
  const zoneHeight = sizeValueToPixels(POPUP_PANEL_HEIGHT) ?? 0
  const maxWidth = Math.max(1, zoneWidth - TUTORIAL_PADDING * 2)
  const titleSpace = hasTitle ? TUTORIAL_TITLE_HEIGHT + TUTORIAL_BUTTON_GAP : 0
  const maxHeight = Math.max(
    1,
    zoneHeight - TUTORIAL_PADDING * 2 - titleSpace - TUTORIAL_BUTTON_GAP - TUTORIAL_BUTTON_HEIGHT
  )
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

/** UiBackground UVs, bottom-left vertex first, clockwise. Mirrored swaps left and right. */
const UVS_NORMAL = [0, 0, 0, 1, 1, 1, 1, 0]
const UVS_XMIRROR = [1, 0, 1, 1, 0, 1, 0, 0]

function frameSrc(frame: TutorialFrame): string {
  return typeof frame === 'string' ? frame : frame.src
}

function frameXMirror(frame: TutorialFrame): boolean {
  return typeof frame !== 'string' && frame.xmirror === true
}

/** Index into `page.frames` to show `elapsed` seconds into the page, or -1 for none. The sequence loops. */
function pageFrameIndex(page: TutorialPage, elapsed: number): number {
  const sequence = pageSequence(page)
  if (sequence.length === 0) return -1
  const fps = page.fps !== undefined && page.fps > 0 ? page.fps : TUTORIAL_DEFAULT_FPS
  const step = Math.floor(elapsed * fps) % sequence.length
  return sequence[step]
}

const FRAME_SHOWN = { r: 1, g: 1, b: 1, a: 1 }
const FRAME_HIDDEN = { r: 1, g: 1, b: 1, a: 0 }

// MARK: TutorialLayer
/**
 * Centered tutorial popup, POPUP_PANEL_WIDTH x POPUP_PANEL_HEIGHT on the FullScreen zone,
 * with one page image and a Next button; the last page's button reads Done and closes.
 * Hidden until src/ui/behaviors.ts opens it when the camera fly-in lands.
 * The image keeps its aspect and is centered in the space above the button. Each page is a
 * looping flipbook (see TutorialPage); src/ui/behaviors.ts advances it with tick(). All of a
 * page's frames are drawn stacked and the flipbook only changes which one is opaque.
 */
class TutorialLayer extends Layer {
  private page = 0
  /** Seconds since the current page appeared. Drives its flipbook. */
  private elapsed = 0

  constructor() {
    super({
      id: 'tutorial',
      zone: ZoneType.FullScreen,
      canBeHidden: true,
      startHidden: true,
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
    const frames = page?.frames ?? []
    const shownFrame = page ? pageFrameIndex(page, this.elapsed) : -1
    const title = page?.title ?? ''
    const hasImage = shownFrame >= 0
    // A text-only page shows its title centered where the image would be.
    const titleOnTop = title !== '' && hasImage
    const size = fitTutorialImage(page?.aspect ?? TUTORIAL_DEFAULT_ASPECT, titleOnTop)
    return (
      <Column
        key="tutorial_popup"
        width={POPUP_PANEL_WIDTH}
        height={POPUP_PANEL_HEIGHT}
        spacing={0}
        padding={TUTORIAL_PADDING}
        alignItems="center"
        pointerFilter="block"
      >
        <Background key="tutorial_chrome" borderColor={theme.colors.secondary} borderRadius={theme.border.radiusSmall} />
        {titleOnTop ? (
          <H2
            key="tutorial_title"
            value={title}
            width="100%"
            height={TUTORIAL_TITLE_HEIGHT}
            fontSize={TUTORIAL_TITLE_FONT_SIZE}
            margin={{ bottom: TUTORIAL_BUTTON_GAP }}
            fontColor={theme.colors.light}
            textAlign="middle-center"
          />
        ) : null}
        <UiEntity
          key="tutorial_image_area"
          uiTransform={{ width: '100%', flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}
        >
          {hasImage ? (
            // Every frame stays mounted on its own texture, stacked in one box; only the
            // current one is opaque. Swapping a single image's src blanked for a frame.
            <UiEntity key="tutorial_image" uiTransform={{ width: size.width, height: size.height, flexShrink: 0 }}>
              {frames.map((frame, i) => (
                <UiEntity
                  key={`tutorial_frame_${this.page}_${i}`}
                  uiTransform={{
                    width: '100%',
                    height: '100%',
                    positionType: 'absolute',
                    position: { left: 0, top: 0 }
                  }}
                  uiBackground={{
                    textureMode: 'stretch',
                    texture: { src: frameSrc(frame) },
                    uvs: frameXMirror(frame) ? UVS_XMIRROR : UVS_NORMAL,
                    color: i === shownFrame ? FRAME_SHOWN : FRAME_HIDDEN
                  }}
                />
              ))}
            </UiEntity>
          ) : (
            <H2
              key="tutorial_text"
              value={title}
              width="100%"
              fontSize={TUTORIAL_TITLE_FONT_SIZE}
              fontColor={theme.colors.light}
              textAlign="middle-center"
            />
          )}
        </UiEntity>
        <Row
          key="tutorial_actions"
          height={TUTORIAL_BUTTON_HEIGHT}
          margin={{ top: TUTORIAL_BUTTON_GAP }}
          spacing={0}
          justifyContent="center"
        >
          <ButtonText
            key="btn_tutorial_next"
            id="btn_tutorial_next"
            textLabel={isLast ? 'Done' : 'Next'}
            width={TUTORIAL_BUTTON_WIDTH}
            height={TUTORIAL_BUTTON_HEIGHT}
            fontSize={TUTORIAL_BUTTON_FONT_SIZE}
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
