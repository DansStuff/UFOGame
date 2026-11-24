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
 * One tutorial page. `aspect` is the image's width ÷ height (1920x1080 is 16 / 9);
 * the scene cannot read a texture's size, so leave it out only when the image
 * matches TUTORIAL_DEFAULT_ASPECT.
 */
export type TutorialImage = { src: string; aspect?: number }

/** Width ÷ height used for any tutorial page that does not set its own `aspect`. */
export const TUTORIAL_DEFAULT_ASPECT = 1

/**
 * Tutorial pages, shown in this order. Files live in assets/images/tutorial/ and are
 * numbered to match; the scene cannot list a folder at runtime, so add new pages here.
 */
export const TUTORIAL_IMAGES: TutorialImage[] = [
  { src: 'assets/images/tutorial/01.png' },
  { src: 'assets/images/tutorial/02.png' },
  { src: 'assets/images/tutorial/03.png' }
]

/** Padding inside the tutorial popup, in virtual pixels. The image fits inside it. */
export const TUTORIAL_PADDING = 16

/** Gap between the tutorial image and the button row. */
export const TUTORIAL_BUTTON_GAP = 12

/** Next / Done button size, in virtual pixels. */
export const TUTORIAL_BUTTON_WIDTH = 200
export const TUTORIAL_BUTTON_HEIGHT = 56
