/** Finds the named composite entities the abduction systems read every frame. */
import { engine, Entity, Name, Transform, VisibilityComponent } from '@dcl/sdk/ecs'
import { EntityNames } from '../../assets/scene/entity-names'

let planetEntity: Entity | null = null

export function findNamed(value: string): Entity | null {
  for (const [entity, name] of engine.getEntitiesWith(Name, Transform)) {
    if (name.value === value) return entity
  }
  return null
}

/** Cached, because every system on both server and client needs it each frame. */
export function findPlanet(): Entity | null {
  if (planetEntity !== null) {
    if (Transform.getOrNull(planetEntity)) return planetEntity
    planetEntity = null
  }
  planetEntity = findNamed(EntityNames.Planet)
  return planetEntity
}

export function setVisible(entity: Entity, visible: boolean): void {
  const current = VisibilityComponent.getOrNull(entity)
  if (current !== null && current.visible === visible) return
  VisibilityComponent.createOrReplace(entity, { visible })
}

export function resetSceneLookup(): void {
  planetEntity = null
}
