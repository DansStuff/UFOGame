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

// MARK: Popups

/** Size of the tutorial and redeem popups, centered on the screen, as a share of screen width and height. */
export const POPUP_PANEL_WIDTH = '75vw'
export const POPUP_PANEL_HEIGHT = '75vh'

// MARK: HUD buttons

/** Side of each square top-right button (Tutorial, Redeem Samples), as a share of screen height. */
export const HUD_BUTTON_SIZE = '15vh'

/** Gap between the top-right buttons, in virtual pixels. */
export const HUD_BUTTON_GAP = 12

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
 * One flipbook frame: an image path, or `{ src, xmirror: true }` to show that image
 * flipped left to right (done with UVs, so no mirrored copy of the file is needed).
 */
export type TutorialFrame = string | { src: string; xmirror?: boolean }

/**
 * One tutorial page, played as a looping flipbook.
 * - `title`: optional text shown above the image.
 * - `frames`: the page's frames (see TutorialFrame). A single frame is a still page;
 *   an empty list is a text-only page with its title centered in the panel.
 * - `sequence`: indices into `frames`, in play order; repeats are fine
 *   (`[0, 1, 2, 1]` ping-pongs). Defaults to every frame in order. Bad indices are skipped.
 * - `fps`: frames of `sequence` shown per second. Defaults to TUTORIAL_DEFAULT_FPS.
 * - `aspect`: the images' width ÷ height (1920x1080 is 16 / 9). The scene cannot read
 *   a texture's size, so leave it out only when they match TUTORIAL_DEFAULT_ASPECT.
 */
export type TutorialPage = {
  title?: string
  frames: TutorialFrame[]
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
 * Frames are picked by index in `sequence`; repeat an index to hold it longer.
 */
export const TUTORIAL_PAGES: TutorialPage[] = [
  {
    title: 'Balance the UFO to fly!',
    // Ship rocking: center, right, mirrored center, mirrored right.
    frames: [
      'assets/images/tutorial/TutCenter.png',
      'assets/images/tutorial/TutRight.png',
      { src: 'assets/images/tutorial/TutCenter.png', xmirror: true },
      { src: 'assets/images/tutorial/TutRight.png', xmirror: true }
    ],
    sequence: [0, 1, 2, 3],
    fps: 1.25,
    aspect: 4 / 3
  },
  {
    title: 'Camera follows the ship!',
    frames: ['assets/images/tutorial/cameraman1.png', 'assets/images/tutorial/cameraman2.png'],
    sequence: [0, 1],
    fps: 1.25,
    aspect: 16 / 9
  },
  {
    title: 'Abduct cows for samples!',
    // Probe frames alternate back and forth.
    frames: [
      'assets/images/tutorial/alien_cow_probe_flipbook_frame_1.png',
      'assets/images/tutorial/alien_cow_probe_flipbook_frame_2.png'
    ],
    sequence: [0, 1],
    fps: 1.25,
    aspect: 3 / 2
  },
  { title: 'Redeem (coming soon)', frames: [] }
]

/** Padding inside the tutorial popup, in virtual pixels. The image fits inside it. */
export const TUTORIAL_PADDING = 16

/** Height of the title row above a tutorial image, when the page has a title. */
export const TUTORIAL_TITLE_HEIGHT = 64

/** Theme-base px for the tutorial title and text-only pages (theme h2 is 24). */
export const TUTORIAL_TITLE_FONT_SIZE = 30

/** Theme-base px for the Next / Done label (theme default is 14). */
export const TUTORIAL_BUTTON_FONT_SIZE = 18

/** Gap between the tutorial title, image and button row. */
export const TUTORIAL_BUTTON_GAP = 12

/** Next / Done button size, in virtual pixels. */
export const TUTORIAL_BUTTON_WIDTH = 200
export const TUTORIAL_BUTTON_HEIGHT = 56
