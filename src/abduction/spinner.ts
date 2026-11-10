/** Client-only tumble while the cow is off the surface. Not synced, so each client picks its own axis. */
import { engine, Entity, Schemas, Transform } from '@dcl/sdk/ecs'
import { Quaternion, Vector3 } from '@dcl/sdk/math'
import { ABDUCTABLE_SPIN_DEGREES_PER_SECOND } from '../constants'
import { randomSurfaceDirection, simulationStep } from './geometry'

/** Never passed to syncEntity. `axis` is a unit direction in planet space. */
export const Spinner = engine.defineComponent('abductable:Spinner', {
  axis: Schemas.Vector3
})

/** Adds a tumble while the cow is off the surface. Standing it back up is the planet placement's job. */
export function syncSpinner(entity: Entity, yOffset: number): void {
  if (yOffset > 0) {
    if (Spinner.getOrNull(entity) !== null) return
    const axis = randomSurfaceDirection()
    Spinner.create(entity, { axis: Vector3.create(axis.x, axis.y, axis.z) })
    return
  }
  if (Spinner.getOrNull(entity) === null) return
  Spinner.deleteFrom(entity)
}

/** Revolves each spinning cow around the axis chosen when its Spinner was added. */
export function SpinnerSystem(dt: number): void {
  const degrees = ABDUCTABLE_SPIN_DEGREES_PER_SECOND * simulationStep(dt)
  if (degrees === 0) return
  for (const [entity, spinner] of engine.getEntitiesWith(Spinner, Transform)) {
    const transform = Transform.getMutable(entity)
    const spun = Quaternion.multiply(Quaternion.fromAngleAxis(degrees, spinner.axis), transform.rotation)
    transform.rotation = Quaternion.normalize(spun)
  }
}
