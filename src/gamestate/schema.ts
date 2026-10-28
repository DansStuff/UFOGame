import { engine, Schemas } from '@dcl/sdk/ecs'

/**
 * Durable snapshot replicated to every client, including late joiners.
 * The auth server is the only writer; see setupGameState().
 */
export const GameState = engine.defineComponent('game:State', {
  /** 'idle' | 'inRound' | 'roundEnded' */
  phase: Schemas.String,
  startedAt: Schemas.Int64,
  endedAt: Schemas.Int64,
  /** Degrees about X. Positive dips the +Z side of the ship. */
  shipPitch: Schemas.Float,
  /** Degrees about Z. Positive lifts the +X side of the ship. */
  shipRoll: Schemas.Float,
  /** Planet orientation. The surface under the ship scrolls opposite the tilt. */
  planetRotation: Schemas.Quaternion,
  /** World-space angular velocity in degrees per second. Clients spin with this between updates. */
  planetAngularVelocity: Schemas.Vector3
})

export type GamePhase = 'idle' | 'inRound' | 'roundEnded'

export type PlanetRotationSnapshot = {
  x: number
  y: number
  z: number
  w: number
}

/** World-space angular velocity in degrees per second. */
export type PlanetAngularVelocitySnapshot = {
  x: number
  y: number
  z: number
}

export type GameStateSnapshot = {
  phase: GamePhase
  startedAt: number
  endedAt: number
  shipPitch: number
  shipRoll: number
  planetRotation: PlanetRotationSnapshot
  planetAngularVelocity: PlanetAngularVelocitySnapshot
}
