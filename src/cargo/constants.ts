/**
 * Tunable numbers for cargo: items abducted onto the ship deck.
 * Deck positions are ship-local meters. The deck is flat at local Y 0.
 */
import type { SfxName } from '../sfx/constants'
import { SHIP_TILT_EDGE_RADIUS, SHIP_TILT_SAFE_RADIUS } from '../ship/constants'

export type CargoKind = 'cornCob'

export type CargoModel = {
  src: string
  /** Uniform scale on the deck. */
  scale: number
  /**
   * Height of the model's middle above its origin, in model units. The origin sits on the
   * bottom edge so the item rests on the deck; the arrival tumble spins around this middle.
   */
  centerY: number
  /** Ship-local height of the origin when resting on the deck, meters. Negative sinks it into the deck. */
  restY: number
  /** Weight on steering, in players standing at the item's spot (see deckWeights in ship/motion.ts). */
  weight: number
  /** Text shown next to the proximity prompt. */
  removeHoverText: string
  /** Ship-local height of the tutorial arrow's tip while the item rests on the deck. */
  arrowY: number
  /** Tutorial arrow scale, a bit smaller than the cow's (TUTORIAL_ARROW_COW_SCALE). */
  arrowScale: number
  /** Played when the item starts up the beam. */
  abductSfx: SfxName
  /** Played when the item hits the deck at the end of its arrival. */
  landSfx: SfxName
  /** Played when a player removes the item from the deck. */
  removeSfx: SfxName
}

export const CARGO_MODELS: Record<CargoKind, CargoModel> = {
  cornCob: {
    // 1.5 m long in the file, origin at the bottom center. Source: blender/mcp_models.blend, CornCob collection.
    src: 'assets/scene/Models/Cargo/corn_cob.glb',
    // About 4.5 m long and 2.2 m tall on the deck.
    scale: 3,
    // The file is 0.737 m tall.
    centerY: 0.37,
    restY: -0.5,
    // A giant cob: as heavy as two players.
    weight: 2,
    removeHoverText: 'Eat corn',
    // The cob's top sits about 1.7 m above the deck.
    arrowY: 2,
    arrowScale: 1.75,
    abductSfx: 'cornPop',
    landSfx: 'cargoThud',
    removeSfx: 'cornCrunch'
  }
}

/** Cargo lands in the outer part of the deck: this fraction of the ship radius, measured in from the rim. */
export const CARGO_DECK_OUTER_FRACTION = 0.25
/** Cargo lands at least this far from the ship center, well outside the safe radius, so it pulls hard on steering. */
export const CARGO_DECK_MIN_RADIUS = Math.max(SHIP_TILT_EDGE_RADIUS * (1 - CARGO_DECK_OUTER_FRACTION), SHIP_TILT_SAFE_RADIUS + 1)
/** Cargo lands at most this far from the ship center, so a scaled cob stays clear of the rim wall. */
export const CARGO_DECK_MAX_RADIUS = SHIP_TILT_EDGE_RADIUS - 3
/** Cargo items are kept at least this far apart when placed, measured between origins. */
export const CARGO_MIN_SPACING_METERS = 5
/** Random picks per item before the spacing rule is dropped for it. */
export const CARGO_PLACEMENT_ATTEMPTS = 30

/** Proximity range for removing cargo. The Explorer clamps proximity at about 3 m. */
export const CARGO_REMOVE_PROXIMITY_METERS = 3
/** The server accepts a removal from a player within this many meters, measured flat on the deck. */
export const CARGO_REMOVE_SERVER_MAX_DISTANCE_METERS = 8
/** Minimum time between removal requests from one client. */
export const CARGO_REMOVE_REQUEST_COOLDOWN_SECONDS = 0.5

// MARK: Arrival
// Clients animate items that arrive while they watch: up the abduction beam from the
// surface under the ship, then spat out in an arc onto the deck spot. The server only
// counts an item's weight once the whole arrival has played (CARGO_ARRIVAL_SECONDS).

/** Seconds to ride the beam from the planet surface up through the deck. */
export const CARGO_BEAM_RISE_SECONDS = 3
/** Ship-local height the item's bottom reaches at the top of the beam, above the central hub. */
export const CARGO_BEAM_TOP_Y = 3
/** Tumble while riding the beam, in degrees per second. */
export const CARGO_BEAM_SPIN_DEGREES_PER_SECOND = 120
/** Seconds of the arc from the top of the beam to the deck spot. */
export const CARGO_SPIT_SECONDS = 1
/** Extra height at the middle of the arc, in meters. */
export const CARGO_SPIT_ARC_METERS = 4
/** Full arrival, from abduction to landing on the deck. */
export const CARGO_ARRIVAL_SECONDS = CARGO_BEAM_RISE_SECONDS + CARGO_SPIT_SECONDS
