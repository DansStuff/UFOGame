import ReactEcs, { UiEntity } from '@dcl/sdk/react-ecs'
import {
  Background,
  ButtonImageClose,
  ButtonText,
  Column,
  Grid,
  H2,
  Layer,
  Row,
  ZoneType,
  getTheme
} from '@stom66/dcl-ui-component-kit'
import {
  CODEX_CELL_GAP,
  CODEX_COLUMNS,
  CODEX_DISCOVERIES,
  CODEX_HEADER_GAP,
  CODEX_HEADER_HEIGHT,
  CODEX_SCROLLBAR_GUTTER,
  CODEX_SLOT_COUNT,
  CODEX_WINDOW_BORDER,
  CODEX_WINDOW_PADDING
} from '../constants'

/**
 * Window geometry written by src/ui/behaviors.ts: the largest screen-centered box
 * that still fits the safe inset. Rest values are a 1920x1080 canvas with no inset.
 */
export const codexState = {
  panelLeft: 32,
  panelTop: 32,
  panelWidth: 1856,
  panelHeight: 1016,
  innerWidth: 1804,
  scrollHeight: 884,
  cellSize: 579
}

/** One slot per codex cell. Discoveries first, the rest blank. */
const CODEX_SLOTS: string[] = Array.from({ length: CODEX_SLOT_COUNT }, (_, i) => CODEX_DISCOVERIES[i] ?? '')

// MARK: CodexCell
/** One creature slot. `label` names a discovery; blank slots stay empty. */
function CodexCell(props: { key?: string; label: string; size: number }) {
  const theme = getTheme()
  return (
    <Column
      height={props.size}
      spacing={0}
      justifyContent="center"
      alignItems="center"
      backgroundColor={theme.colors.dark}
      borderColor={theme.colors.tertiary}
      borderWidth={CODEX_WINDOW_BORDER}
      borderRadius={theme.border.radiusSmall}
    >
      <H2 value={props.label} fontColor={theme.colors.light} textAlign="middle-center" alignSelf="center" />
    </Column>
  )
}

// MARK: CodexLayer
/**
 * Full-screen codex window. FullScreen zone so behaviors.ts can place the window
 * against the whole inset canvas; the zone slides it in from the bottom.
 */
class CodexLayer extends Layer {
  constructor() {
    super({
      id: 'codex',
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
    codexButtonLayer.hide()
  }

  close(): void {
    if (!this.isOpen) return
    this.hide()
    codexButtonLayer.show()
  }

  protected body() {
    const theme = getTheme()
    return (
      <UiEntity
        key="codex_window"
        uiTransform={{
          width: codexState.panelWidth,
          height: codexState.panelHeight,
          positionType: 'absolute',
          position: { left: codexState.panelLeft, top: codexState.panelTop },
          flexDirection: 'column',
          alignItems: 'flex-start',
          padding: CODEX_WINDOW_PADDING,
          pointerFilter: 'block'
        }}
      >
        <Background
          key="codex_chrome"
          borderColor={theme.colors.secondary}
          borderWidth={CODEX_WINDOW_BORDER}
          borderRadius={theme.border.radiusSmall}
        />
        <Row
          key="codex_header"
          height={CODEX_HEADER_HEIGHT}
          spacing={0}
          justifyContent="space-between"
          alignItems="center"
        >
          <H2 key="codex_title" value="Codex" fontColor={theme.colors.light} alignSelf="center" />
          <ButtonImageClose key="btn_codex_close" id="btn_codex_close" callback={() => this.close()} />
        </Row>
        <Column
          key="codex_scroll"
          width={codexState.innerWidth}
          height={codexState.scrollHeight}
          margin={{ top: CODEX_HEADER_GAP }}
          spacing={0}
          overflow="scroll"
          alignItems="flex-start"
        >
          <Grid
            key="codex_grid"
            limit={CODEX_COLUMNS}
            spacing={CODEX_CELL_GAP}
            width={codexState.innerWidth - CODEX_SCROLLBAR_GUTTER}
          >
            {CODEX_SLOTS.map((label, i) => (
              <CodexCell key={`codex_cell_${i}`} label={label} size={codexState.cellSize} />
            ))}
          </Grid>
        </Column>
      </UiEntity>
    )
  }
}

// MARK: CodexButtonLayer
/** Top-right "Codex" button. Slides away while the window is open. */
class CodexButtonLayer extends Layer {
  constructor() {
    super({ id: 'codex-button', zone: ZoneType.TopRight, canBeHidden: true, zIndex: 3 })
  }

  protected body() {
    const theme = getTheme()
    return (
      <ButtonText
        key="btn_codex_open"
        id="btn_codex_open"
        textLabel="Codex"
        borderColor={theme.colors.secondary}
        fontColor={theme.colors.light}
        callback={() => codexLayer.open()}
      />
    )
  }
}

export const codexLayer = new CodexLayer()
export const codexButtonLayer = new CodexButtonLayer()
