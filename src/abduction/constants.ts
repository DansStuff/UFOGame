/**
 * Tunable numbers and strings for the abduction domain. Grouped by feature with MARK comments.
 * Prefix names so they still make sense away from the module that uses them.
 */

// MARK: Abduction

/**
 * Distance from the planet origin to the surface, in meters.
 * The abductable's origin sits this far out.
 */
export const PLANET_SURFACE_RADIUS_METERS = 97

/**
 * Random picks for a new cow's spot before falling back to the point opposite the ship spawn.
 * A pick is rejected inside a landmark sign's zone (`zoneRadiusDegrees` in planetProps/constants.ts).
 */
export const ABDUCTABLE_PLACEMENT_ATTEMPTS = 30

/** One abductable model. The uniform scale, the sample count, the arrow height, and the clips belong to that file. */
export type AbductableModel = {
  src: string
  scale: number
  /** Samples a probe can extract from this target before it is replaced. */
  samples: number
  /** Meters above this model's origin, along its up. Measured in planet space. */
  arrowLocalY: number
  /** Clip played on a loop. The other clips stay stopped. */
  idleClip: string
  /** Every clip in the file, including `idleClip`. */
  clips: string[]
  /** One-shot sounds. A successful probe plays one, chosen at random. */
  probeClips: string[]
}

/** Playback volume for a probe clip. 1 is the loudest an AudioSource will play. */
export const ABDUCTABLE_PROBE_VOLUME = 1

/** Models that can be placed on the planet. Add a row for each abductable. */
export const ABDUCTABLE_MODELS: AbductableModel[] = [
  {
    src: 'assets/scene/Models/Abductable/cow.glb',
    scale: 0.45,
    samples: 10,
    arrowLocalY: 2,
    idleClip: 'Armature|Idle',
    clips: [
      'Armature|Death',
      'Armature|Idle',
      'Armature|Jump',
      'Armature|Run',
      'Armature|Walk',
      'Armature|WalkSlow'
    ],
    probeClips: ['assets/scene/Sounds/moo1.mp3', 'assets/scene/Sounds/moo2.mp3']
  }
]

/** Hover text when pointing at an abductable. */
export const ABDUCTABLE_HOVER_TEXT = 'Probe'

/** Prefix on the SamplesRemaining sign. The remaining count is appended. */
export const SAMPLES_REMAINING_LABEL = 'Samples remaining:'

/** How far the camera can be from an abductable and still show the hover text. */
export const ABDUCTABLE_POINTER_MAX_DISTANCE_METERS = 9

/**
 * Minimum time between `requestProbe` sends from an abductable pointer click.
 * Temporary defensive measure.
 */
export const ABDUCTABLE_PROBE_REQUEST_COOLDOWN_SECONDS = 0.5

/** Scene-space height of the ring the direction arrow travels. */
export const RED_ARROW_RING_Y = 45

/**
 * AbductableArrow shows while the angle between the ship and the abductable,
 * measured from the planet center, is within this many degrees.
 * 0 is directly under the ship. 90 is the horizon.
 */
export const ABDUCTABLE_ARROW_MAX_ANGLE_DEGREES = 42

/**
 * Guidance arrows hide while the angle from the planet center is within this many degrees.
 * The abductable is close enough that the indicators are not needed.
 */
export const ARROW_HIDE_ANGLE_DEGREES = 6

/**
 * The abductable rises toward the ship while the angle from the planet center
 * is within this many degrees. 0 is directly under the ship.
 */
export const ABDUCTABLE_LIFT_MAX_ANGLE_DEGREES = 4

/** Rise toward the ship, in meters per second, along the abductable's up. */
export const ABDUCTABLE_LIFT_METERS_PER_SECOND = 3

/** How far past the ship transform the abductable stops, along the ray from the planet center. */
export const ABDUCTABLE_LIFT_ABOVE_SHIP_METERS = 1.5

/** Client-only tumble while the abductable is off the surface, in degrees per second. */
export const ABDUCTABLE_SPIN_DEGREES_PER_SECOND = 40

/** Client-only slide toward the ship center while carried, in meters per second. */
export const ABDUCTABLE_CENTER_METERS_PER_SECOND = 1

/** Acceleration toward the planet center after the beam lets go, in meters per second squared. */
export const ABDUCTABLE_FALL_GRAVITY_METERS_PER_SECOND_SQUARED = 20
