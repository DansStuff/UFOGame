/**
 * Client-only view of the saucer. Composes the camera modes onto one virtual camera:
 * - `gameplay.ts`: the in-game camera that follows ship travel.
 * - `promo.ts`: a fixed framing for promotional renders, on while `CAMERA_PROMO_MODE` is true.
 * - `intro.ts`: the opening fly-in, which lands on whichever mode is active.
 * `rig.ts` holds the shared pose type and placement math.
 */
import { engine, getWorldPosition, MainCamera, Transform, VirtualCamera } from '@dcl/sdk/ecs'
import { Vector3 } from '@dcl/sdk/math'
import { isServer } from '@dcl/sdk/network'
import { CAMERA_FOV_DEGREES, CAMERA_PROMO_MODE } from './constants'
import { gameplayPose, resetGameplayCamera, updateGameplayCamera } from './gameplay'
import { isIntroActive, startIntro } from './intro'
import { promoPose } from './promo'
import { CameraPose, findShip, placeCamera, resetShipLookup } from './rig'

export function setupCamera(): void {
  if (isServer()) return
  resetShipLookup()
  resetGameplayCamera()

  const activePose: (shipPosition: Vector3) => CameraPose = CAMERA_PROMO_MODE ? promoPose : gameplayPose

  const camera = engine.addEntity()
  Transform.create(camera)
  VirtualCamera.create(camera, {
    fov: CAMERA_FOV_DEGREES,
    defaultTransition: {
      transitionMode: VirtualCamera.Transition.Time(0.5)
    }
  })

  startIntro(camera, activePose)
  const ship = findShip()
  if (ship !== null && !isIntroActive()) {
    const shipPosition = getWorldPosition(engine, ship)
    placeCamera(camera, shipPosition, activePose(shipPosition))
  }

  MainCamera.createOrReplace(engine.CameraEntity, { virtualCameraEntity: camera })

  engine.addSystem(function CameraSystem(dt: number) {
    const currentShip = findShip()
    if (currentShip === null) return
    if (!CAMERA_PROMO_MODE) updateGameplayCamera(dt)
    if (isIntroActive()) return
    const shipPosition = getWorldPosition(engine, currentShip)
    placeCamera(camera, shipPosition, activePose(shipPosition))
  })
}
