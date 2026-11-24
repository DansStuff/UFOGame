/**
 * Client-only tutorial arrows: the bouncing arrow from `TutArrow.gltf` that also points at
 * the cow (AbductableArrow, a composite entity). Use this to point at anything else in code.
 *
 * The model is about 1.5 units tall with its tip at the origin, so `position` is where the
 * tip sits and `scale` sets the size (the cow's arrow is 5). It billboards around Y to face
 * the camera, plays its looping "Point" clip, and casts no shadow.
 */
import { Animator, Billboard, BillboardMode, engine, Entity, GltfContainer, GltfNodeModifiers, Transform } from '@dcl/sdk/ecs'
import { Vector3 } from '@dcl/sdk/math'

const TUTORIAL_ARROW_SRC = 'assets/scene/Models/TutArrow.gltf'
const TUTORIAL_ARROW_CLIP = 'Point'

/** Scale of the composite arrow above the cow, for comparison. */
export const TUTORIAL_ARROW_COW_SCALE = 5

export type TutorialArrowOptions = {
  /** Entity the arrow follows. Position is in its space. */
  parent?: Entity
  /** Where the arrow's tip sits, in parent space. */
  position: Vector3
  /** Uniform scale. The model is about 1.5 units tall at scale 1. */
  scale: number
}

/** Creates an arrow pointing down at `position`. Remove it with `removeTutorialArrow`. */
export function createTutorialArrow(options: TutorialArrowOptions): Entity {
  const entity = engine.addEntity()
  Transform.create(entity, {
    parent: options.parent,
    position: Vector3.clone(options.position),
    scale: Vector3.create(options.scale, options.scale, options.scale)
  })
  GltfContainer.create(entity, {
    src: TUTORIAL_ARROW_SRC,
    visibleMeshesCollisionMask: 0,
    invisibleMeshesCollisionMask: 0
  })
  Animator.create(entity, {
    states: [{ clip: TUTORIAL_ARROW_CLIP, playing: true, loop: true, weight: 1, speed: 1, shouldReset: false }]
  })
  Billboard.create(entity, { billboardMode: BillboardMode.BM_Y })
  GltfNodeModifiers.create(entity, { modifiers: [{ path: '', castShadows: false }] })
  return entity
}

/** Moves an arrow's tip and resizes it. */
export function placeTutorialArrow(entity: Entity, position: Vector3, scale?: number): void {
  const transform = Transform.getMutable(entity)
  transform.position = Vector3.clone(position)
  if (scale !== undefined) transform.scale = Vector3.create(scale, scale, scale)
}

export function removeTutorialArrow(entity: Entity): void {
  engine.removeEntity(entity)
}
