/** @jsx ReactEcs.createElement */
import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { CodexRow } from './CodexRow'
import { useInteraction } from './interaction'

export interface State {
  open: boolean
  panelLeft: number
  panelTop: number
  panelWidth: number
  panelHeight: number
  innerWidth: number
  scrollHeight: number
  cellSize: number
}

// Rest box for a 1920x1080 canvas with no inset. The driver replaces it
// with the screen-centered rectangle that fits the live safe area.
export const state: State = {
  open: false,
  panelLeft: 32,
  panelTop: 32,
  panelWidth: 1856,
  panelHeight: 1016,
  innerWidth: 1804,
  scrollHeight: 884,
  cellSize: 579
}

type UiAction = { state: State; props: Parameters<typeof Codex>[0]; value?: unknown }

/** @ui-action */
function openCodex({ state }: UiAction) {
  state.open = true
}

/** @ui-action */
function closeCodex({ state }: UiAction) {
  state.open = false
}

export function Codex(props: {}) {
  const openButton = useInteraction(
    {
      base: {
        uiTransform: {
          width: 96,
          height: 96,
          positionType: 'absolute',
          position: { top: 24, right: 24 },
          justifyContent: 'center',
          alignItems: 'center',
          borderRadius: 8,
          borderWidth: 2,
          borderColor: { r: 0.45, g: 0.75, b: 0.55, a: 1 }
        },
        uiBackground: { color: { r: 0.08, g: 0.12, b: 0.14, a: 0.94 } }
      },
      hover: { uiBackground: { color: { r: 0.14, g: 0.24, b: 0.2, a: 0.98 } } },
      press: { uiBackground: { color: { r: 0.05, g: 0.1, b: 0.09, a: 1 } } },
      active: { uiTransform: { display: 'none' } }
    },
    state.open === true
  )
  const closeButton = useInteraction({
    base: {
      uiTransform: {
        width: 128,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
        borderWidth: 2,
        borderColor: { r: 0.45, g: 0.75, b: 0.55, a: 1 }
      },
      uiBackground: { color: { r: 0.12, g: 0.18, b: 0.16, a: 1 } }
    },
    hover: { uiBackground: { color: { r: 0.18, g: 0.28, b: 0.22, a: 1 } } },
    press: { uiBackground: { color: { r: 0.08, g: 0.14, b: 0.12, a: 1 } } }
  })
  // The driver places this box on the screen center, clamped to the safe inset.
  // The gate lives on the panel. It is display:none until Codex is opened.
  const windowPanel = useInteraction(
    {
      base: {
        uiTransform: {
          width: state.panelWidth,
          height: state.panelHeight,
          positionType: 'absolute',
          position: { left: state.panelLeft, top: state.panelTop },
          flexDirection: 'column',
          alignItems: 'flex-start',
          borderWidth: 2,
          borderColor: { r: 0.45, g: 0.75, b: 0.55, a: 1 }
        },
        uiBackground: { color: { r: 0.05, g: 0.07, b: 0.09, a: 0.96 } }
      },
      active: { uiTransform: { display: 'none' } }
    },
    state.open !== true
  )
  return (
    <UiEntity
      uiTransform={{
        width: '100%',
        height: '100%',
        pointerFilter: 'none'
      }}
    >
      <UiEntity {...openButton} onMouseDown={() => openCodex({ state, props })}>
        <Label
          value="Codex"
          fontSize={20}
          textAlign="middle-center"
          color={{ r: 0.9, g: 1, b: 0.94, a: 1 }}
          uiTransform={{ width: '100%', height: '100%' }}
        />
      </UiEntity>
      <UiEntity {...windowPanel}>
        <UiEntity
          uiTransform={{
            width: state.innerWidth,
            height: 64,
            margin: { top: 24, left: 24 },
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <Label
            value="Codex"
            fontSize={32}
            textAlign="middle-left"
            color={{ r: 0.9, g: 1, b: 0.94, a: 1 }}
            uiTransform={{ width: 240, height: 40 }}
          />
          <UiEntity {...closeButton} onMouseDown={() => closeCodex({ state, props })}>
            <Label
              value="Close"
              fontSize={20}
              textAlign="middle-center"
              color={{ r: 0.9, g: 1, b: 0.94, a: 1 }}
              uiTransform={{ width: '100%', height: '100%' }}
            />
          </UiEntity>
        </UiEntity>
        <UiEntity
          uiTransform={{
            width: state.innerWidth,
            height: state.scrollHeight,
            margin: { top: 16, left: 24, bottom: 24 },
            overflow: 'scroll',
            flexDirection: 'column',
            alignItems: 'stretch'
          }}
        >
          <UiEntity uiTransform={{ width: '100%', height: state.cellSize, margin: { bottom: 16 } }}>
            <CodexRow cellSize={state.cellSize} leadLabel="Cow?" />
          </UiEntity>
          <UiEntity uiTransform={{ width: '100%', height: state.cellSize, margin: { bottom: 16 } }}>
            <CodexRow cellSize={state.cellSize} leadLabel="" />
          </UiEntity>
          <UiEntity uiTransform={{ width: '100%', height: state.cellSize, margin: { bottom: 16 } }}>
            <CodexRow cellSize={state.cellSize} leadLabel="" />
          </UiEntity>
          <UiEntity uiTransform={{ width: '100%', height: state.cellSize, margin: { bottom: 16 } }}>
            <CodexRow cellSize={state.cellSize} leadLabel="" />
          </UiEntity>
          <UiEntity uiTransform={{ width: '100%', height: state.cellSize, margin: { bottom: 16 } }}>
            <CodexRow cellSize={state.cellSize} leadLabel="" />
          </UiEntity>
        </UiEntity>
      </UiEntity>
    </UiEntity>
  )
}
