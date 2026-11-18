/**
 * Tunable numbers and strings for the camera domain. Grouped by feature with MARK comments.
 * Prefix names so they still make sense away from the module that uses them.
 */

// MARK: Camera

/** Horizontal field of view of the saucer camera, in degrees. */
export const CAMERA_FOV_DEGREES = 60

/**
 * Degrees the camera looks down from horizontal toward the ship origin.
 * 0 is level with the origin. 90 is straight above it.
 * The angle is `CAMERA_MIN_ANGLE_OFF_HORIZONTAL_DEGREES` at the center
 * and `CAMERA_MAX_ANGLE_OFF_HORIZONTAL_DEGREES` at the saucer rim.
 */
export const CAMERA_MIN_ANGLE_OFF_HORIZONTAL_DEGREES = 38
export const CAMERA_MAX_ANGLE_OFF_HORIZONTAL_DEGREES = 42

/**
 * Distance from the ship origin to the camera, in meters, with the local player at the center.
 * It grows to `CAMERA_MAX_DISTANCE_METERS` at the saucer rim.
 */
export const CAMERA_MIN_DISTANCE_METERS = 12//28

/** Distance from the ship origin to the camera, in meters, with the local player at the rim. */
export const CAMERA_MAX_DISTANCE_METERS = 38

/**
 * Tilt, in degrees, below which the camera keeps its heading.
 * A smaller lean does not have a stable direction of travel.
 */
export const CAMERA_TRAVEL_DEADZONE_DEGREES = 0.5

/**
 * How long the camera takes to accelerate into a new heading on the ring, in seconds.
 * The move starts at rest. Larger is a slower ease-in.
 */
export const CAMERA_HEADING_SMOOTH_SECONDS = 1.5

// MARK: Camera promo

/**
 * For promotional renders (`promo.ts`). While true the camera holds one fixed heading,
 * ignores ship travel and where the player stands, and sits far enough out to frame the
 * whole saucer. Set to false for the in-game camera (`gameplay.ts`).
 */
export const CAMERA_PROMO_MODE = true

/**
 * Promo distance from the ship origin, in meters. The saucer is 39 m across, so with a
 * 60 degree FOV about 34 m just fits its width; this leaves some margin.
 */
export const CAMERA_PROMO_DISTANCE_METERS = 35

/** Promo downward angle from horizontal. A little lower than gameplay, still above the deck. */
export const CAMERA_PROMO_ANGLE_OFF_HORIZONTAL_DEGREES = 12.5

/**
 * Promo heading around the ship, in degrees. 0 sits behind the ship looking toward +Z.
 * Positive turns the camera so the ship appears rotated by this much.
 */
export const CAMERA_PROMO_HEADING_DEGREES = 22.5

// MARK: Camera intro

/** Length of the opening fly-in, in seconds: one orbit of the ship, then the move into the gameplay view. */
export const CAMERA_INTRO_SECONDS = 7.5

/**
 * Distance from the ship origin to the camera while it orbits, in meters.
 * The camera is clamped to the scene volume, so the orbit's ground radius
 * (distance * cos(angle)) must stay inside it. The scene is 11x11 parcels (176 m)
 * with the ship at its center, so the edge is 88 m out; height is capped about
 * 73 m above the ship. 75 m at 22 degrees gives a ~70 m circle, 28 m up.
 */
export const CAMERA_INTRO_DISTANCE_METERS = 75

/** Degrees the camera looks down from horizontal while it orbits. */
export const CAMERA_INTRO_ANGLE_OFF_HORIZONTAL_DEGREES = 22

/**
 * Fraction of the intro, from 0 to 1, at which the camera starts moving in from the
 * orbit distance and angle. The move finishes when the intro ends.
 */
export const CAMERA_INTRO_ZOOM_START_FRACTION = 0.55
