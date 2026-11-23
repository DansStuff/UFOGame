/**
 * Tunable numbers for cargo: items abducted onto the ship deck.
 * Deck positions are ship-local meters. The deck is flat at local Y 0.
 */
import { SHIP_TILT_EDGE_RADIUS, SHIP_TILT_SAFE_RADIUS } from '../ship/constants'

export type CargoKind = 'cornCob'

export type CargoModel = {
  src: string
  /** Text shown next to the proximity prompt. */
  removeHoverText: string
}

export const CARGO_MODELS: Record<CargoKind, CargoModel> = {
  cornCob: {
    // 1.5 m long, origin at the bottom center. Source: blender/Landmarks.blend, CornCob collection.
    src: 'assets/scene/Models/Cargo/corn_cob.glb',
    removeHoverText: 'Toss corn'
  }
}

/** Cargo lands at least this far from the ship center, so it always counts toward steering. */
export const CARGO_DECK_MIN_RADIUS = SHIP_TILT_SAFE_RADIUS + 1
/** Cargo lands at most this far from the ship center, clear of the rim wall. */
export const CARGO_DECK_MAX_RADIUS = SHIP_TILT_EDGE_RADIUS - 1.5
/** Cargo items are kept at least this far apart when placed. */
export const CARGO_MIN_SPACING_METERS = 2
/** Random picks per item before the spacing rule is dropped for it. */
export const CARGO_PLACEMENT_ATTEMPTS = 30

/** Proximity range for removing cargo. The Explorer clamps proximity at about 3 m. */
export const CARGO_REMOVE_PROXIMITY_METERS = 3
/** The server accepts a removal from a player within this many meters, measured flat on the deck. */
export const CARGO_REMOVE_SERVER_MAX_DISTANCE_METERS = 6
/** Minimum time between removal requests from one client. */
export const CARGO_REMOVE_REQUEST_COOLDOWN_SECONDS = 0.5

/** Client-only rise from under the ship to the deck spot, for items that arrive while watching. */
export const CARGO_ARRIVAL_SECONDS = 1.5
/** Ship-local height the arrival rise starts from, below the hull. */
export const CARGO_ARRIVAL_START_Y = -8
