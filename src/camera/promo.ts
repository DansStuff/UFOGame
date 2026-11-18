/**
 * Promotional-render camera. A fixed pose that frames the whole saucer and ignores
 * ship travel and where the player stands. Turn it on with `CAMERA_PROMO_MODE`.
 */
import {
  CAMERA_PROMO_ANGLE_OFF_HORIZONTAL_DEGREES,
  CAMERA_PROMO_DISTANCE_METERS,
  CAMERA_PROMO_HEADING_DEGREES
} from './constants'
import { CameraPose, DEG_TO_RAD } from './rig'

export function promoPose(): CameraPose {
  return {
    heading: CAMERA_PROMO_HEADING_DEGREES * DEG_TO_RAD,
    distance: CAMERA_PROMO_DISTANCE_METERS,
    angle: CAMERA_PROMO_ANGLE_OFF_HORIZONTAL_DEGREES * DEG_TO_RAD
  }
}
