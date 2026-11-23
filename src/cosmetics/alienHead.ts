/** The grey alien head worn by every player. Source: `blender/mcp_models.blend`, AlienHead collection (originally `blender/AlienHead.blend`). */
import { GltfContainer, Transform } from '@dcl/sdk/ecs'
import { Vector3 } from '@dcl/sdk/math'
import { ALIEN_HEAD_ANCHOR, ALIEN_HEAD_MODEL_SRC, ALIEN_HEAD_OFFSET, ALIEN_HEAD_SCALE } from './constants'
import { PlayerCosmetic } from './playerAttachments'

export const alienHead: PlayerCosmetic = {
  id: 'alienHead',
  anchor: ALIEN_HEAD_ANCHOR,
  offset: ALIEN_HEAD_OFFSET,
  create(entity) {
    Transform.getMutable(entity).scale = Vector3.create(ALIEN_HEAD_SCALE, ALIEN_HEAD_SCALE, ALIEN_HEAD_SCALE)
    GltfContainer.create(entity, {
      src: ALIEN_HEAD_MODEL_SRC,
      // Purely visual: never block movement, the camera, or clicks.
      visibleMeshesCollisionMask: 0,
      invisibleMeshesCollisionMask: 0
    })
  }
}
