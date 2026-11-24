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

// MARK: Codex

/**
 * Gap, in virtual pixels, between the codex window and the edge of the
 * largest screen-centered rectangle that still fits in the safe inset.
 */
export const CODEX_WINDOW_INSET_MARGIN = 32

/** Padding inside the codex window, in virtual pixels. */
export const CODEX_WINDOW_PADDING = 24

/** Border width of the codex window. The inner layout subtracts it. */
export const CODEX_WINDOW_BORDER = 2

/** Title row height inside the codex window. */
export const CODEX_HEADER_HEIGHT = 64

/** Space between the title row and the scrolling grid. */
export const CODEX_HEADER_GAP = 16

/** Gap between codex cells, horizontally and vertically. */
export const CODEX_CELL_GAP = 16

/** Number of creature slots in the codex grid. */
export const CODEX_SLOT_COUNT = 15

/** Cells per codex row. */
export const CODEX_COLUMNS = 3

/** Discovered creature names, filled into the codex slots in order. Remaining slots stay blank. */
export const CODEX_DISCOVERIES = ['Cow?']

/** Room left inside the scroller for its vertical bar. */
export const CODEX_SCROLLBAR_GUTTER = 18

// MARK: Samples HUD

/** Gap between the top of the safe inset and the samples pill. */
export const SAMPLES_HUD_TOP = 16

/** Samples pill size, in virtual pixels. */
export const SAMPLES_HUD_WIDTH = 460
export const SAMPLES_HUD_HEIGHT = 48

// MARK: Tutorial

/**
 * Tutorial pages, shown in this order. Files live in assets/images/tutorial/ and are
 * numbered to match; the scene cannot list a folder at runtime, so add new pages here.
 */
export const TUTORIAL_IMAGES = [
  'assets/images/tutorial/01.png',
  'assets/images/tutorial/02.png',
  'assets/images/tutorial/03.png'
]

/** Padding inside the tutorial popup, in virtual pixels. */
export const TUTORIAL_PADDING = 16

/** Gap between the tutorial image and the button row. */
export const TUTORIAL_BUTTON_GAP = 12

/** Next / Done button size, in virtual pixels. */
export const TUTORIAL_BUTTON_WIDTH = 200
export const TUTORIAL_BUTTON_HEIGHT = 56
