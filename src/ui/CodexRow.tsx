/** @jsx ReactEcs.createElement */
import ReactEcs, { UiEntity } from '@dcl/sdk/react-ecs'
import { CodexCell } from './CodexCell'

export interface State {}
export const state: State = {}

/** Three creature slots. Five of these rows make the codex grid. */
/** @ui-component */
export function CodexRow(props: { cellSize?: number }) {
  return (
    <UiEntity
      uiTransform={{
        width: '100%',
        height: props.cellSize,
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center'
      }}
    >
      <UiEntity
        uiTransform={{ width: props.cellSize, height: props.cellSize, margin: { left: 8, right: 8 } }}
      >
        <CodexCell cellSize={props.cellSize} />
      </UiEntity>
      <UiEntity
        uiTransform={{ width: props.cellSize, height: props.cellSize, margin: { left: 8, right: 8 } }}
      >
        <CodexCell cellSize={props.cellSize} />
      </UiEntity>
      <UiEntity
        uiTransform={{ width: props.cellSize, height: props.cellSize, margin: { left: 8, right: 8 } }}
      >
        <CodexCell cellSize={props.cellSize} />
      </UiEntity>
    </UiEntity>
  )
}
