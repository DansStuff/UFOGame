/**
 * Tunable numbers and strings for the UI domain. Grouped by feature with MARK comments.
 * Prefix names so they still make sense away from the module that uses them.
 */

// MARK: Debug

/**
 * Center of the default spawn area in scene.json.
 * The debug button moves the player back here.
 */
export const DEBUG_SPAWN_X = 90.9
export const DEBUG_SPAWN_Y = 67.5
export const DEBUG_SPAWN_Z = 80.51

/** Debug button size, in virtual pixels. */
export const DEBUG_BUTTON_WIDTH = 240
export const DEBUG_BUTTON_HEIGHT = 56

// MARK: Redeem

/** Padding inside the redeem samples window, in virtual pixels. */
export const REDEEM_PADDING = 24

/** Title row height inside the redeem samples window. */
export const REDEEM_HEADER_HEIGHT = 64

// MARK: Samples HUD

/** Gap between the top of the safe inset and the samples pill. */
export const SAMPLES_HUD_TOP = 16

/** Samples pill size, in virtual pixels. */
export const SAMPLES_HUD_WIDTH = 460
export const SAMPLES_HUD_HEIGHT = 48

// MARK: Tutorial

/**
 * One tutorial page, played as a looping flipbook.
 * - `frames`: image paths. A single frame is a still page.
 * - `sequence`: indices into `frames`, in play order; repeats are fine
 *   (`[0, 1, 2, 1]` ping-pongs). Defaults to every frame in order. Bad indices are skipped.
 * - `fps`: frames of `sequence` shown per second. Defaults to TUTORIAL_DEFAULT_FPS.
 * - `aspect`: the images' width ÷ height (1920x1080 is 16 / 9). The scene cannot read
 *   a texture's size, so leave it out only when they match TUTORIAL_DEFAULT_ASPECT.
 */
export type TutorialPage = {
  frames: string[]
  sequence?: number[]
  fps?: number
  aspect?: number
}

/** Width ÷ height used for any tutorial page that does not set its own `aspect`. */
export const TUTORIAL_DEFAULT_ASPECT = 1

/** Flipbook speed for any tutorial page that does not set its own `fps`. */
export const TUTORIAL_DEFAULT_FPS = 6

/**
 * Tutorial pages, shown in this order. Files live in assets/images/tutorial/ and are
 * numbered to match; the scene cannot list a folder at runtime, so add new pages here.
 * Example animated page:
 *   { frames: ['assets/images/tutorial/02_1.png', 'assets/images/tutorial/02_2.png'], sequence: [0, 0, 1], fps: 4 }
 */
export const TUTORIAL_PAGES: TutorialPage[] = [
  { frames: ['assets/images/tutorial/01.png'] },
  { frames: ['assets/images/tutorial/02.png'] },
  { frames: ['assets/images/tutorial/03.png'] }
]

/** Padding inside the tutorial popup, in virtual pixels. The image fits inside it. */
export const TUTORIAL_PADDING = 16

/** Gap between the tutorial image and the button row. */
export const TUTORIAL_BUTTON_GAP = 12

/** Next / Done button size, in virtual pixels. */
export const TUTORIAL_BUTTON_WIDTH = 200
export const TUTORIAL_BUTTON_HEIGHT = 56
