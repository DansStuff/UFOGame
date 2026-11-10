/**
 * Composite entities placed in Creator Hub and configured further in code.
 * Resolved once when the client starts, then read by the systems that drive them.
 * The two arrows do not cast shadows.
 */
import { engine, Entity, GltfNodeModifiers } from '@dcl/sdk/ecs'
import { EntityNames } from '../../assets/scene/entity-names'

type SceneEntity = Entity | null

export const sceneEntities: {
  probe1: SceneEntity
  probe2: SceneEntity
  probe3: SceneEntity
  probe4: SceneEntity
  abductableArrow: SceneEntity
  redArrow: SceneEntity
  outerLights: SceneEntity
  innerLights: SceneEntity
  beam: SceneEntity
  beamRing: SceneEntity
} = {
  probe1: null,
  probe2: null,
  probe3: null,
  probe4: null,
  abductableArrow: null,
  redArrow: null,
  outerLights: null,
  innerLights: null,
  beam: null,
  beamRing: null
}

function load(name: EntityNames): Entity | null {
  const entity = engine.getEntityOrNullByName(name)
  if (entity === null) console.error(`[scene] entity ${name} missing from main.composite`)
  return entity
}

/** An empty path applies the override to every node in the glTF. */
function disableCastShadows(entity: Entity): void {
  GltfNodeModifiers.createOrReplace(entity, {
    modifiers: [{ path: '', castShadows: false }]
  })
}

export function setupSceneEntities(): void {
  sceneEntities.probe1 = load(EntityNames.Probe1)
  sceneEntities.probe2 = load(EntityNames.Probe2)
  sceneEntities.probe3 = load(EntityNames.Probe3)
  sceneEntities.probe4 = load(EntityNames.Probe4)
  sceneEntities.abductableArrow = load(EntityNames.AbductableArrow)
  sceneEntities.redArrow = load(EntityNames.RedArrow)
  sceneEntities.outerLights = load(EntityNames.OuterLights)
  sceneEntities.innerLights = load(EntityNames.InnerLights)
  sceneEntities.beam = load(EntityNames.Beam)
  sceneEntities.beamRing = load(EntityNames.BeamRing)

  if (sceneEntities.abductableArrow !== null) disableCastShadows(sceneEntities.abductableArrow)
  if (sceneEntities.redArrow !== null) disableCastShadows(sceneEntities.redArrow)
}
