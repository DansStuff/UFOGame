/** @jsx ReactEcs.createElement */
import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'

export interface State {}
export const state: State = {}

/** One creature slot in the codex. `label` names a discovery; blank slots stay empty. */
/** @ui-component */
export function CodexCell(props: { cellSize?: number; label?: string }) {
  return (
    <UiEntity
      uiTransform={{
        width: props.cellSize,
        height: props.cellSize,
        borderWidth: 2,
        borderColor: { r: 0.4, g: 0.62, b: 0.48, a: 1 },
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center'
      }}
      uiBackground={{ color: { r: 0.1, g: 0.14, b: 0.16, a: 1 } }}
    >
      <Label
        value={`${props.label}`}
        fontSize={32}
        textAlign="middle-center"
        color={{ r: 0.9, g: 1, b: 0.94, a: 1 }}
        uiTransform={{ width: '100%', height: '100%' }}
      />
    </UiEntity>
  )
}
