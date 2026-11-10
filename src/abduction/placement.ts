/**
 * Client-only. Parents the cow to the planet while it is on or falling to the surface,
 * and to the ship while it is being abducted. Clients add the synced y offset to the
 * surface radius, or to the ship-local height captured at the grab.
 */
import { engine, Entity, getWorldRotation, Transform } from '@dcl/sdk/ecs'
import { Quaternion, Vector3 } from '@dcl/sdk/math'
import { ABDUCTABLE_CENTER_METERS_PER_SECOND, PLANET_SURFACE_RADIUS_METERS } from '../constants'
import type { GameStateSnapshot } from '../gamestate'
import { captureShipCarry, type ShipCarry } from './frames'
import { invertQuaternion, moveToward, outwardDirection, rotationWithUp, simulationStep } from './geometry'
import { syncSpinner } from './spinner'

type ClientCarry = ShipCarry & { id: number }

let clientCarry: ClientCarry | null = null

export function resetClientCarry(): void {
  clientCarry = null
}

/** Parents the cow to the planet and stands it up when it is back on the surface. */
export function placeOnPlanet(entity: Entity, planet: Entity, state: GameStateSnapshot): void {
  clientCarry = null
  const outward = outwardDirection(state.abductableDirection)
  const position = Vector3.scale(outward, PLANET_SURFACE_RADIUS_METERS + state.abductableYOffset)
  const transform = Transform.getMutable(entity)
  transform.parent = planet
  transform.position.x = position.x
  transform.position.y = position.y
  transform.position.z = position.z
  if (state.abductableYOffset === 0) transform.rotation = rotationWithUp(outward)
  syncSpinner(entity, state.abductableYOffset)
}

/**
 * Parents the cow to the ship. Local Y follows the synced y offset from the grab.
 * Local XZ eases toward the ship center and is not written back.
 */
export function placeOnShip(entity: Entity, planet: Entity, ship: Entity, state: GameStateSnapshot, dt: number): void {
  const transform = Transform.getMutable(entity)
  const attaching = clientCarry === null || clientCarry.id !== state.abductableId
  if (attaching) {
    const worldRotation = getWorldRotation(engine, entity)
    const shipWorldRotation = getWorldRotation(engine, ship)
    clientCarry = { id: state.abductableId, ...captureShipCarry(planet, ship, state) }
    transform.parent = ship
    transform.rotation = Quaternion.multiply(invertQuaternion(shipWorldRotation), worldRotation)
  }
  if (clientCarry === null) return

  const maxStep = ABDUCTABLE_CENTER_METERS_PER_SECOND * simulationStep(dt)
  clientCarry.localX = moveToward(clientCarry.localX, 0, maxStep)
  clientCarry.localZ = moveToward(clientCarry.localZ, 0, maxStep)
  transform.parent = ship
  transform.position.x = clientCarry.localX
  transform.position.y = clientCarry.baseY + state.abductableYOffset
  transform.position.z = clientCarry.localZ
  syncSpinner(entity, state.abductableYOffset)
}
