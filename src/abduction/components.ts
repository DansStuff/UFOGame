import { engine, Entity, GltfContainer, Schemas } from '@dcl/sdk/ecs'
import { ABDUCTABLE_MODELS } from '../constants'

/** The cow. `samples` is how many probes it has left. `angularOffset` is degrees from the ship. `yOffset` is meters along local up past the surface. */
export const Abductable = engine.defineComponent('abductable:Target', {
  id: Schemas.Int,
  angularOffset: Schemas.Float,
  yOffset: Schemas.Float,
  samples: Schemas.Int
})

/** The cow that carries Abductable, or null before it has been placed. */
export function findAbductable(): Entity | null {
  for (const [entity] of engine.getEntitiesWith(Abductable)) return entity
  return null
}

/** The ABDUCTABLE_MODELS entry whose glTF this entity shows. */
export function findAbductableModel(entity: Entity): (typeof ABDUCTABLE_MODELS)[number] | undefined {
  const src = GltfContainer.getOrNull(entity)?.src
  return ABDUCTABLE_MODELS.find((model) => model.src === src)
}
