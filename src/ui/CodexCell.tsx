/** @jsx ReactEcs.createElement */
import ReactEcs, { UiEntity } from '@dcl/sdk/react-ecs'

export interface State {}
export const state: State = {}

/** One empty slot in the codex. A discovered creature will fill this later. */
/** @ui-component */
export function CodexCell(props: { cellSize?: number }) {
  return (
    <UiEntity
      uiTransform={{
        width: props.cellSize,
        height: props.cellSize,
        borderWidth: 2,
        borderColor: { r: 0.4, g: 0.62, b: 0.48, a: 1 },
        borderRadius: 10
      }}
      uiBackground={{ color: { r: 0.1, g: 0.14, b: 0.16, a: 1 } }}
    />
  )
}
