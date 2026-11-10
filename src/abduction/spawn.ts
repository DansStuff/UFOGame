/**
 * Client-only. Mirrors the cow described on GameState into a local entity.
 * A new spawn id replaces the cow. Id 0 or a zero direction removes it.
 */
import {
  Animator,
  ColliderLayer,
  engine,
  Entity,
  GltfContainer,
  InputAction,
  pointerEventsSystem,
  Transform
} from '@dcl/sdk/ecs'
import { Vector3 } from '@dcl/sdk/math'
import { EntityNames } from '../../assets/scene/entity-names'
import {
  ABDUCTABLE_HOVER_TEXT,
  ABDUCTABLE_MODELS,
  ABDUCTABLE_POINTER_MAX_DISTANCE_METERS,
  PLANET_SURFACE_RADIUS_METERS
} from '../constants'
import { getGameState, type AbductableDirectionSnapshot } from '../gamestate'
import { requestProbe } from '../networking/client'
import { Abductable, findAbductable } from './components'
import { hasPlacement, outwardDirection, rotationWithUp } from './geometry'
import { placeOnPlanet, placeOnShip, resetClientCarry } from './placement'
import { findNamed, findPlanet } from './sceneLookup'
import { detachMooSpeaker } from './sound'

function spawnAbductable(
  planet: Entity,
  direction: AbductableDirectionSnapshot,
  id: number,
  angularOffset: number,
  yOffset: number,
  samples: number
): void {
  const model = ABDUCTABLE_MODELS[0]
  if (!model) return

  const outward = outwardDirection(direction)
  const entity = engine.addEntity()
  Abductable.create(entity, { id, angularOffset, yOffset, samples })
  Transform.create(entity, {
    parent: planet,
    // Local to the planet entity, so the scene position is that entity's position plus this offset.
    position: Vector3.scale(outward, PLANET_SURFACE_RADIUS_METERS + yOffset),
    rotation: rotationWithUp(outward),
    scale: Vector3.create(model.scale, model.scale, model.scale)
  })
  GltfContainer.create(entity, {
    src: model.src,
    visibleMeshesCollisionMask: ColliderLayer.CL_POINTER
  })
  pointerEventsSystem.onPointerDown(
    {
      entity,
      opts: {
        button: InputAction.IA_POINTER,
        hoverText: ABDUCTABLE_HOVER_TEXT,
        showFeedback: true,
        maxDistance: ABDUCTABLE_POINTER_MAX_DISTANCE_METERS
      }
    },
    () => {
      requestProbe(id)
    }
  )
  Animator.create(entity, {
    states: model.clips.map((clip) => {
      const idle = clip === model.idleClip
      return {
        clip,
        playing: idle,
        loop: idle,
        weight: idle ? 1 : 0,
        speed: idle ? 1 : 0
      }
    })
  })
}

function removeAbductables(): void {
  const entities: Entity[] = []
  for (const [entity] of engine.getEntitiesWith(Abductable)) entities.push(entity)
  for (const entity of entities) {
    detachMooSpeaker(entity)
    pointerEventsSystem.removeOnPointerDown(entity)
    engine.removeEntity(entity)
  }
}

/** Spawns the cow from GameState and parents it to the ship or the planet. */
export function AbductableSpawnSystem(dt: number): void {
  const state = getGameState()
  const placed = state.abductableId !== 0 && hasPlacement(state.abductableDirection)
  let existing = findAbductable()

  if (!placed) {
    resetClientCarry()
    if (existing !== null) removeAbductables()
    return
  }

  if (existing === null || Abductable.get(existing).id !== state.abductableId) {
    if (existing !== null) removeAbductables()
    resetClientCarry()
    const planet = findPlanet()
    if (planet === null) return
    spawnAbductable(
      planet,
      state.abductableDirection,
      state.abductableId,
      state.abductableAngularOffset,
      state.abductableYOffset,
      state.abductableSamples
    )
    existing = findAbductable()
  }
  if (existing === null) return

  const component = Abductable.getMutable(existing)
  component.id = state.abductableId
  component.angularOffset = state.abductableAngularOffset
  component.yOffset = state.abductableYOffset
  component.samples = state.abductableSamples

  const planet = findPlanet()
  if (planet === null) return
  if (state.abductableOnShip) {
    const ship = findNamed(EntityNames.Ship)
    if (ship === null) return
    placeOnShip(existing, planet, ship, state, dt)
    return
  }
  placeOnPlanet(existing, planet, state)
}
