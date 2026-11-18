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

/** Horizontal margin on each side of a codex cell. */
export const CODEX_CELL_MARGIN = 8

/** Room left inside the scroller for its vertical bar. */
export const CODEX_SCROLLBAR_GUTTER = 18
