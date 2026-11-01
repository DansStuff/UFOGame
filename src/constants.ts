/**
 * Tunable numbers and strings. Grouped by feature with MARK comments.
 * Prefix names so they still make sense in this file, away from the module that uses them.
 *
 * This file is for tuning. Message schemas stay in networking/messages.ts.
 * ECS components stay next to the systems that define them.
 */

// MARK: Simulation

/** Clamp for per-frame `dt` so a hitch cannot jump the sim too far. */
export const SIMULATION_MAX_DELTA_SECONDS = 0.1

// MARK: Ship motion

/** Scene-space X of the ship. Player positions are measured from here. */
export const SHIP_CENTER_X = 88
/** Scene-space Z of the ship. Player positions are measured from here. */
export const SHIP_CENTER_Z = 88

/**
 * Players inside this distance from the ship center are left out of the tilt average.
 * If every player is inside it, the ship stays level.
 */
export const SHIP_TILT_SAFE_RADIUS = 5.5

/** Slack on the average of players outside the safe radius. Offsets inside this do not tilt that axis. */
export const SHIP_TILT_DEADZONE = 1

/**
 * Meters past the deadzone, on one axis, that reach full tilt.
 * The saucer deck is about 20m in radius, so full tilt lands inside the deck.
 */
export const SHIP_TILT_INFLUENCE_RADIUS = 12

/** Largest pitch or roll. Steep enough to read, shallow enough to walk back up. */
export const SHIP_TILT_MAX_DEGREES = 10

/** How quickly the ship eases toward the tilt implied by the players. */
export const SHIP_TILT_SMOOTH_SECONDS = 0.4

/**
 * Planet spin at full tilt, in degrees per second.
 * The planet radius is about 97m, so this is roughly 10 m/s of surface travel.
 */
export const PLANET_SPIN_MAX_DEGREES_PER_SECOND = 10

/**
 * How quickly the displayed planet rotation catches the synced orientation.
 * Spin between updates comes from the synced angular velocity.
 */
export const PLANET_ROTATION_BLEND_SECONDS = 0.25

// MARK: Ship trail

/** How long a trail plane stays before the lifetime system removes it. */
export const TRAIL_SEGMENT_LIFETIME_SECONDS = 3

/**
 * Chord length that commits the open plane and starts the next one.
 * Shorter planes follow the planet's curve more closely.
 */
export const TRAIL_SEGMENT_LENGTH_METERS = 1.5

/** Open planes shorter than this are not spawned. */
export const TRAIL_SEGMENT_MIN_LENGTH_METERS = 0.05

/** Width of each trail plane, across the direction of travel. */
export const TRAIL_WIDTH_METERS = 2.5

export const TRAIL_COLOR_RED = 0.45
export const TRAIL_COLOR_GREEN = 0.85
export const TRAIL_COLOR_BLUE = 1

/** Emissive strength at full life. The lifetime system fades it to zero. */
export const TRAIL_EMISSIVE_INTENSITY = 4
