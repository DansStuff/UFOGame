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
  planetAngularVelocity: Schemas.Vector3,
  /**
   * Unit direction from the planet origin to the abductable, in planet space.
   * Zero until the server places it. Clients parent the cow to the planet along this ray.
   */
  abductableDirection: Schemas.Vector3,
  /** 0 until the server places one. Increments each time a new one is placed. */
  abductableId: Schemas.Int,
  /**
   * Degrees between the ship and the abductable, measured from the planet center.
   * 0 is directly under the ship. The server writes this whenever it changes.
   */
  abductableAngularOffset: Schemas.Float,
  /**
   * Meters above the planet surface.
   * On the planet this is added to the surface radius. On the ship it is added to the
   * ship-local height captured when the lift started. After a release it falls back to 0.
   */
  abductableYOffset: Schemas.Float,
  /** True while the abductable is parented to the ship. False parents it to the planet. */
  abductableOnShip: Schemas.Boolean
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

/** Unit direction from the planet origin to the abductable, in planet space. */
export type AbductableDirectionSnapshot = {
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
  abductableDirection: AbductableDirectionSnapshot
  abductableId: number
  abductableAngularOffset: number
  abductableYOffset: number
  abductableOnShip: boolean
}
