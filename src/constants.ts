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

/** Width of the saucer mesh. */
export const SHIP_DISC_DIAMETER_METERS = 39

/**
 * Meters past the deadzone, on one axis, that reach full tilt.
 * The saucer deck is 19.5m in radius, so full tilt lands inside the deck.
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
export const PLANET_SPIN_MAX_DEGREES_PER_SECOND = 15

/**
 * How quickly the displayed planet rotation catches the synced orientation.
 * Spin between updates comes from the synced angular velocity.
 */
export const PLANET_ROTATION_BLEND_SECONDS = 0.25

// MARK: Abduction

/**
 * Distance from the planet origin to the surface, in meters.
 * The abductable's origin sits this far out.
 */
export const PLANET_SURFACE_RADIUS_METERS = 97

/** One abductable model. The uniform scale, the arrow height, and the clips belong to that file. */
export type AbductableModel = {
  src: string
  scale: number
  /** Meters above this model's origin, along its up. Measured in planet space. */
  arrowLocalY: number
  /** Clip played on a loop. The other clips stay stopped. */
  idleClip: string
  /** Every clip in the file, including `idleClip`. */
  clips: string[]
}

/** Models that can be placed on the planet. Add a row for each abductable. */
export const ABDUCTABLE_MODELS: AbductableModel[] = [
  {
    src: 'assets/scene/Models/Abductable/cow.glb',
    scale: 0.45,
    arrowLocalY: 2,
    idleClip: 'Armature|Idle',
    clips: [
      'Armature|Death',
      'Armature|Idle',
      'Armature|Jump',
      'Armature|Run',
      'Armature|Walk',
      'Armature|WalkSlow'
    ]
  }
]

/** Hover text when pointing at an abductable. */
export const ABDUCTABLE_HOVER_TEXT = 'Probe'

/** How far the camera can be from an abductable and still show the hover text. */
export const ABDUCTABLE_POINTER_MAX_DISTANCE_METERS = 6

/** Scene-space height of the ring the direction arrow travels. */
export const RED_ARROW_RING_Y = 40

/**
 * AbductableArrow shows while the angle between the ship and the abductable,
 * measured from the planet center, is within this many degrees.
 * 0 is directly under the ship. 90 is the horizon.
 */
export const ABDUCTABLE_ARROW_MAX_ANGLE_DEGREES = 42

/**
 * Both arrows hide while the angle from the planet center is within this many degrees.
 * The abductable is close enough that neither indicator is needed.
 */
export const ARROW_HIDE_ANGLE_DEGREES = 10

/**
 * The abductable rises toward the ship while the angle from the planet center
 * is within this many degrees. 0 is directly under the ship.
 */
export const ABDUCTABLE_LIFT_MAX_ANGLE_DEGREES = 3

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

// MARK: Debug

/**
 * Center of the default spawn area in scene.json.
 * The debug button moves the player back here.
 */
export const DEBUG_SPAWN_X = 90.9
export const DEBUG_SPAWN_Y = 67.5
export const DEBUG_SPAWN_Z = 80.51

// MARK: Wind

/**
 * Apparent ship speed, in meters per second, below which no wind planes spawn.
 * Full tilt is roughly 20 m/s at the saucer.
 */
export const WIND_MIN_SPEED_METERS_PER_SECOND = 2

/**
 * Seconds between wind planes at full ship speed.
 * Slower flight waits longer, in proportion to speed / max speed.
 */
export const WIND_SPAWN_INTERVAL_SECONDS = 0.075

/** How long a wind plane stays before it is removed. Width shrinks to zero over this time. */
export const WIND_PLANE_LIFETIME_SECONDS = 2.2

/** Width at spawn, across the direction of travel. It shrinks to zero over the plane's life. */
export const WIND_PLANE_SIZE_METERS = 2.5

/**
 * Length along travel at full ship speed, reached halfway through a plane's life.
 * Every live plane uses this times speed / max speed, times min(2 * age / lifetime, 1).
 */
export const WIND_PLANE_MAX_LENGTH_METERS = 25

/**
 * Cylindrical shell around the ship's travel axis, in meters from that axis.
 * Planes spawn on the sides, top, and bottom, between these radii.
 * The cylinder inside the inner radius stays empty.
 */
export const WIND_SPAWN_INNER_RADIUS_METERS = 22
export const WIND_SPAWN_OUTER_RADIUS_METERS = 50

/**
 * Arc length, in meters, from the ship to the center of the spawn cylinder, along the planet surface.
 * The step stays tangent to the planet. It does not follow the ship's tilted forward.
 */
export const WIND_SPAWN_AHEAD_METERS = 40

/**
 * How far a spawn may sit ahead of or behind that center, along the same surface arc.
 * The cylinder's length is twice this.
 */
export const WIND_SPAWN_ALONG_HALF_LENGTH_METERS = 15

export const WIND_COLOR_RED = 1
export const WIND_COLOR_GREEN = 1
export const WIND_COLOR_BLUE = 1

/** Albedo alpha. It stays at this value for the whole life of the plane. */
export const WIND_COLOR_ALPHA = 0.55

// MARK: Saucer FX

/**
 * Light ring spin, in degrees per second, while the ship is stopped.
 * Both rings use this. The inner ring spins the other way.
 */
export const SAUCER_LIGHTS_MIN_DEGREES_PER_SECOND = 5

/** Light ring spin, in degrees per second, at full ship speed. */
export const SAUCER_LIGHTS_MAX_DEGREES_PER_SECOND = 50

/**
 * The beam and its rings stay visible while the ship is below this share of full speed.
 * 0 is stopped. 1 is full tilt.
 */
export const BEAM_MAX_VISIBLE_SPEED_FRACTION = 0.2

/**
 * Beam ring travel, in local meters on the saucer.
 * Each cycle runs from the low end up to the high end, then snaps back.
 */
export const BEAM_RING_LOCAL_Y_START = -13
export const BEAM_RING_LOCAL_Y_END = -0.75

/** How many times per second the beam ring runs that travel. */
export const BEAM_RING_CYCLES_PER_SECOND = 1

/** Beam rings on the same travel, spaced evenly through the cycle. */
export const BEAM_RING_COUNT = 3

/**
 * Ease-in power on the beam ring's travel. 1 is linear.
 * Higher values leave the bottom more slowly and arrive at the top faster.
 */
export const BEAM_RING_EASE_IN = 1

/** Uniform scale at the bottom of the beam ring's travel. */
export const BEAM_RING_SCALE_BOTTOM = 1

/** Uniform scale at the top of the beam ring's travel. */
export const BEAM_RING_SCALE_TOP = 0.6

/**
 * Fraction of the cycle, just before the wrap, where ring alpha is forced to 0.
 * The ring is already clear when it snaps back to the bottom.
 */
export const BEAM_RING_ALPHA_CLEAR_EARLY = 0.02

/**
 * Beam ring albedo, copied from BeamRing.gltf.
 * Alpha is the opacity at the top of the travel. Progress multiplies it, so a ring is clear at the bottom.
 */
export const BEAM_RING_ALBEDO_RED = 0.017929963767528534
export const BEAM_RING_ALBEDO_GREEN = 0.2982626259326935
export const BEAM_RING_ALBEDO_BLUE = 0.03715888410806656
export const BEAM_RING_ALPHA = 0.904144883155823

/** Beam ring emissive color, copied from BeamRing.gltf. */
export const BEAM_RING_EMISSIVE_RED = 0.0021440964511647287
export const BEAM_RING_EMISSIVE_GREEN = 0.12422632164100289
export const BEAM_RING_EMISSIVE_BLUE = 0.004879222882974488

/** Beam ring surface, copied from BeamRing.gltf. */
export const BEAM_RING_METALLIC = 0
export const BEAM_RING_ROUGHNESS = 0.5
