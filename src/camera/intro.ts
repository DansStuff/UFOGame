/**
 * Opening fly-in. It orbits the ship from far out, then moves in and lands
 * exactly on the pose the active camera mode wants. Its system removes itself when
 * done, and the mode's system takes over with no cut.
 */
import { engine, Entity, getWorldPosition } from '@dcl/sdk/ecs'
import { Vector3 } from '@dcl/sdk/math'
import { SIMULATION_MAX_DELTA_SECONDS } from '../ship/constants'
import {
  CAMERA_INTRO_ANGLE_OFF_HORIZONTAL_DEGREES,
  CAMERA_INTRO_DISTANCE_METERS,
  CAMERA_INTRO_ORBIT_TURNS,
  CAMERA_INTRO_SECONDS,
  CAMERA_INTRO_ZOOM_START_FRACTION
} from './constants'
import { CameraPose, DEG_TO_RAD, findShip, lerp, placeCamera, smoothstep } from './rig'

let introActive = false

/** True while the intro system owns the camera transform. */
export function isIntroActive(): boolean {
  return introActive
}

/**
 * The orbit is measured from the live landing heading, so the last frame equals
 * `landingPose` and the hand-off has no jump.
 */
export function startIntro(camera: Entity, landingPose: (shipPosition: Vector3) => CameraPose): void {
  introActive = false
  if (CAMERA_INTRO_SECONDS <= 0) return
  introActive = true
  let elapsed = 0

  function CameraIntroSystem(dt: number) {
    const ship = findShip()
    if (ship === null) return // Hold the clock until the ship exists.
    elapsed += Math.min(Math.max(dt, 0), SIMULATION_MAX_DELTA_SECONDS)
    const progress = Math.min(elapsed / CAMERA_INTRO_SECONDS, 1)
    const shipPosition = getWorldPosition(engine, ship)
    const landing = landingPose(shipPosition)

    if (progress >= 1) {
      introActive = false
      engine.removeSystem(CameraIntroSystem)
      placeCamera(camera, shipPosition, landing)
      return
    }

    const orbitTurns = 1 - smoothstep(progress)
    const zoomSpan = Math.max(1 - CAMERA_INTRO_ZOOM_START_FRACTION, 1e-6)
    const zoom = smoothstep((progress - CAMERA_INTRO_ZOOM_START_FRACTION) / zoomSpan)
    placeCamera(camera, shipPosition, {
      heading: landing.heading + orbitTurns * CAMERA_INTRO_ORBIT_TURNS * Math.PI * 2,
      distance: lerp(CAMERA_INTRO_DISTANCE_METERS, landing.distance, zoom),
      angle: lerp(CAMERA_INTRO_ANGLE_OFF_HORIZONTAL_DEGREES * DEG_TO_RAD, landing.angle, zoom)
    })
  }

  CameraIntroSystem(0) // Start on the orbit pose, not the entity origin.
  engine.addSystem(CameraIntroSystem)
}
