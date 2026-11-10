/** @jsx ReactEcs.createElement */
import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'

// The driver in src/ui/behaviors.ts writes `samplesCollected` from GameState,
// and shifts this bar so the label sits on the screen center. The HUD root
// is the safe inset, so a 100% row would center inside that inset instead.
// Rest size is a 1920-wide desktop canvas with no inset.
export interface State {
  samplesCollected: number
  barLeft: number
  barWidth: number
}

export const state: State = {
  samplesCollected: 0,
  barLeft: 0,
  barWidth: 1920
}

export function SamplesCollected(props: {}) {
  return (
    <UiEntity
      uiTransform={{
        width: state.barWidth,
        height: 64,
        positionType: 'absolute',
        position: { top: 16, left: state.barLeft },
        justifyContent: 'center',
        alignItems: 'center',
        pointerFilter: 'none'
      }}
    >
      <UiEntity
        uiTransform={{
          width: 460,
          height: 48,
          justifyContent: 'center',
          alignItems: 'center',
          pointerFilter: 'none'
        }}
        uiBackground={{ color: { r: 0.08, g: 0.1, b: 0.14, a: 0.88 } }}
      >
        <Label
          value={`Samples collected: ${state.samplesCollected}`}
          fontSize={22}
          textAlign="middle-center"
          color={{ r: 1, g: 1, b: 1, a: 1 }}
          uiTransform={{ width: 440, height: 32 }}
        />
      </UiEntity>
    </UiEntity>
  )
}
