import ReactEcs, { UiEntity } from '@dcl/sdk/react-ecs'
import { Label, Layer, ZoneType, getTheme } from '@stom66/dcl-ui-component-kit'
import { SAMPLES_HUD_HEIGHT, SAMPLES_HUD_TOP, SAMPLES_HUD_WIDTH } from '../constants'

/**
 * Live values written by src/ui/behaviors.ts. The bar spans the whole screen in
 * inset coordinates so the pill sits on the true screen center, not the inset center.
 * Rest size is a 1920-wide desktop canvas with no inset.
 */
export const samplesHudState = {
  samplesCollected: 0,
  barLeft: 0,
  barWidth: 1920
}

// MARK: SamplesHudLayer
/** Crew sample total, pinned top-center. Purely visual: never takes pointer input. */
class SamplesHudLayer extends Layer {
  constructor() {
    super({ id: 'samples-hud', zone: ZoneType.FullScreen, zIndex: 1 })
  }

  protected body() {
    const theme = getTheme()
    return (
      <UiEntity
        key="samples_bar"
        uiTransform={{
          width: samplesHudState.barWidth,
          height: SAMPLES_HUD_HEIGHT,
          positionType: 'absolute',
          position: { top: SAMPLES_HUD_TOP, left: samplesHudState.barLeft },
          justifyContent: 'center',
          alignItems: 'center',
          pointerFilter: 'none'
        }}
      >
        <Label
          key="samples_label"
          value={`Samples collected: ${samplesHudState.samplesCollected}`}
          width={SAMPLES_HUD_WIDTH}
          height={SAMPLES_HUD_HEIGHT}
          backgroundColor={theme.colors.dark}
          fontColor={theme.colors.light}
          textAlign="middle-center"
          pointerFilter="none"
        />
      </UiEntity>
    )
  }
}

export const samplesHudLayer = new SamplesHudLayer()
