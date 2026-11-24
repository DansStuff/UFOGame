/**
 * Tunable numbers for the tabloids thrown at the screen when the ship flies over a newsstand.
 * Sizes are virtual canvas pixels (1920x1080 on desktop, set by the main UI renderer).
 */

/**
 * Tabloid covers. Each is a 1024 px square with the page centered inside a transparent
 * margin (page diagonal 96% of the square), so the page never clips while its UVs spin.
 * Greyscale, saved as palette PNGs to keep them small.
 * Sources (full size, not deployed): references/tabloids.
 */
export const TABLOID_TEXTURES = [
  'assets/images/tabloids/tabloid_celebrity_scandal.png',
  'assets/images/tabloids/tabloid_alien_wedding.png',
  'assets/images/tabloids/tabloid_farmer_surprise.png'
]

/** Tabloids per newsstand, inclusive. */
export const TABLOID_COUNT_MIN = 3
export const TABLOID_COUNT_MAX = 3

/** Spin in and grow until the page sticks to the screen. */
export const TABLOID_APPROACH_SECONDS = 0.5
/** Stuck to the screen before fading. */
export const TABLOID_HOLD_SECONDS = 3
/** Fade at the end. */
export const TABLOID_FADE_SECONDS = 1.25
/** Each tabloid starts this much after the previous one, so they land one after another. */
export const TABLOID_STAGGER_SECONDS = 0.1

/** One tabloid, from the start of its approach to the end of its fade. */
export const TABLOID_LIFE_SECONDS = TABLOID_APPROACH_SECONDS + TABLOID_HOLD_SECONDS + TABLOID_FADE_SECONDS
/** One newsstand's whole batch, last tabloid's fade included. The server debounces each newsstand for this long. */
export const TABLOID_BATCH_SECONDS = (TABLOID_COUNT_MAX - 1) * TABLOID_STAGGER_SECONDS + TABLOID_LIFE_SECONDS

/** Side of the square box holding the page. The page fills about 60-70% of its width. */
export const TABLOID_BOX_MIN_PIXELS = 1300
export const TABLOID_BOX_MAX_PIXELS = 1495
/** Starting size as a fraction of the final size. */
export const TABLOID_START_SCALE = 0.05
/** Whole turns spun during the approach. */
export const TABLOID_SPIN_TURNS = 2
/** The page settles at up to this tilt either way, in degrees. 180 gives any angle. */
export const TABLOID_MAX_TILT_DEGREES = 180
/** Page centers land within this band of the screen, in percent, on both axes. */
export const TABLOID_CENTER_MIN_PERCENT = 25
export const TABLOID_CENTER_MAX_PERCENT = 75

/** Older tabloids are dropped past this many on screen. */
export const TABLOID_MAX_ON_SCREEN = 14
/** Draws in front of the HUD. */
export const TABLOID_RENDERER_Z_INDEX = 1000
