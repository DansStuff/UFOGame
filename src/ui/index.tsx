/** @jsx ReactEcs.createElement */
import ReactEcs, { UiEntity, ReactEcsRenderer, InteractableArea } from '@dcl/sdk/react-ecs'
import { Codex } from './Codex'
import { SamplesCollected } from './SamplesCollected'

export function setupUi() {
  ReactEcsRenderer.setUiRenderer(() => (
    <UiEntity uiTransform={{ width: '100%', height: '100%' }}>
      <InteractableArea>
        <Codex />
      </InteractableArea>
      <InteractableArea>
        <SamplesCollected />
      </InteractableArea>
    </UiEntity>
  ))
}
