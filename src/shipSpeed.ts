/**
 * Ship speed derived from the synced planet spin. Nothing here is written back to GameState.
 * Player positions feed that spin through normalizedShipSpeed in shipMotion.ts.
 */
import { BEAM_MAX_VISIBLE_SPEED_FRACTION, PLANET_SPIN_MAX_DEGREES_PER_SECOND } from './constants'
import { getGameState } from './gamestate'

/** 0 when the ship is stopped, 1 at full tilt. */
export function shipSpeedFraction(): number {
  if (PLANET_SPIN_MAX_DEGREES_PER_SECOND <= 0) return 0
  const velocity = getGameState().planetAngularVelocity
  const speed = Math.hypot(velocity.x, velocity.y, velocity.z)
  return Math.min(Math.max(speed / PLANET_SPIN_MAX_DEGREES_PER_SECOND, 0), 1)
}

/** The abduction beam is visible while the ship is below the beam speed limit. */
export function abductionBeamOn(): boolean {
  return shipSpeedFraction() < BEAM_MAX_VISIBLE_SPEED_FRACTION
}
