/** @jsx ReactEcs.createElement */
import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'

// The driver in src/ui-behaviors.ts writes `samplesCollected` from GameState.
export interface State {
  samplesCollected: number
}

export const state: State = {
  samplesCollected: 0
}

export function SamplesCollected(props: {}) {
  return (
    <UiEntity
      uiTransform={{
        width: '100%',
        height: 64,
        positionType: 'absolute',
        position: { top: 16 },
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
