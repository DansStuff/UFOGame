/**
 * Tunable numbers for the tabloids thrown at the screen when the ship flies over a newsstand.
 * Sizes are virtual canvas pixels (1920x1080 on desktop, set by the main UI renderer).
 */

/** Placeholder page: white with a grey edge, inside a transparent margin so it can spin. */
export const TABLOID_TEXTURE = 'assets/images/tabloids/tabloid_placeholder.png'

/** Tabloids per newsstand, inclusive. */
export const TABLOID_COUNT_MIN = 3
export const TABLOID_COUNT_MAX = 3

/** Spin in and grow until the page sticks to the screen. */
export const TABLOID_APPROACH_SECONDS = 0.5
/** Stuck to the screen before fading. */
export const TABLOID_HOLD_SECONDS = 4
/** Quick fade at the end. */
export const TABLOID_FADE_SECONDS = 0.25
/** Each tabloid starts this much after the previous one, so they land one after another. */
export const TABLOID_STAGGER_SECONDS = 0.1

/** One tabloid, from the start of its approach to the end of its fade. */
export const TABLOID_LIFE_SECONDS = TABLOID_APPROACH_SECONDS + TABLOID_HOLD_SECONDS + TABLOID_FADE_SECONDS
/** One newsstand's whole batch, last tabloid's fade included. The server debounces each newsstand for this long. */
export const TABLOID_BATCH_SECONDS = (TABLOID_COUNT_MAX - 1) * TABLOID_STAGGER_SECONDS + TABLOID_LIFE_SECONDS

/** Side of the square box holding the page. The page fills 56% x 76% of it. */
export const TABLOID_BOX_MIN_PIXELS = 1000
export const TABLOID_BOX_MAX_PIXELS = 1150
/** Starting size as a fraction of the final size. */
export const TABLOID_START_SCALE = 0.05
/** Whole turns spun during the approach. */
export const TABLOID_SPIN_TURNS = 2
/** The page settles at up to this tilt either way, in degrees. */
export const TABLOID_MAX_TILT_DEGREES = 18
/** Page centers land within this band of the screen, in percent, on both axes. */
export const TABLOID_CENTER_MIN_PERCENT = 25
export const TABLOID_CENTER_MAX_PERCENT = 75

/** Older tabloids are dropped past this many on screen. */
export const TABLOID_MAX_ON_SCREEN = 14
/** Draws in front of the HUD. */
export const TABLOID_RENDERER_Z_INDEX = 1000
