/**
 * Tunable numbers and strings for the cosmetics domain. Grouped by feature with MARK comments.
 * Prefix names so they still make sense away from the module that uses them.
 */
import { AvatarAnchorPointType } from '@dcl/sdk/ecs'
import { Color4, Vector3 } from '@dcl/sdk/math'

// MARK: Roster

/**
 * How often this client re-checks which players are in the scene,
 * adds or removes their cosmetics, and refreshes nameplate text.
 */
export const COSMETICS_ROSTER_POLL_SECONDS = 0.5

// MARK: Avatar area

/**
 * Width and depth of the box where passports are disabled and native nametags are hidden.
 * The saucer is about 40m across and the floor collider reaches about 43m,
 * so this leaves room for someone standing at the rim.
 */
export const AVATAR_AREA_WIDTH_METERS = 46

/**
 * Height of that box, in ship-local meters.
 * The hull bottom is about 2m below the ship origin and the dome top is about 9m above it.
 */
export const AVATAR_AREA_HEIGHT_METERS = 14

/**
 * Ship-local Y of the box center.
 * The box extends half its height above and below this point.
 */
export const AVATAR_AREA_CENTER_Y = 4

// MARK: Alien head

/** Grey alien head worn by every player. Source: `blender/mcp_models.blend`, AlienHead collection. */
export const ALIEN_HEAD_MODEL_SRC = 'assets/scene/Models/Cosmetics/alien_head.glb'

/** Head bone, so the model follows head turns and the walk cycle. */
export const ALIEN_HEAD_ANCHOR = AvatarAnchorPointType.AAPT_HEAD

/**
 * Model offset from the head anchor, in the anchor's frame.
 * The model origin sits 0.27 m above its chin. Tune this in-world.
 */
export const ALIEN_HEAD_OFFSET = Vector3.create(0, 0, 0.125)

/** Uniform model scale. The native model is 0.87 m wide and 1.07 m tall. */
export const ALIEN_HEAD_SCALE = 1

// MARK: Nameplate

/** Where the native nametag would sit. Unlike the head bone, it does not bob with animations. */
export const NAMEPLATE_ANCHOR = AvatarAnchorPointType.AAPT_NAME_TAG

/** Lift above the native nametag position, to clear the alien head. Tune this in-world. */
export const NAMEPLATE_OFFSET = Vector3.create(0, 1.1, 0)

/** World units: 10 is about 1 m tall. */
export const NAMEPLATE_FONT_SIZE = 8.4

export const NAMEPLATE_TEXT_COLOR = Color4.White()

export const NAMEPLATE_OUTLINE_COLOR = Color4.Black()

export const NAMEPLATE_OUTLINE_WIDTH = 0.3

/** Replaces the first 'a' and any 'y's right after it in a displayed name. */
export const NAMEPLATE_AYY_TEXT = 'AYY'

/** Replaces the last 'l' in a displayed name. */
export const NAMEPLATE_LMAO_TEXT = 'LMAO'

/**
 * Saturation and brightness (0–1) of the colors given to 'AYY' and 'LMAO'.
 * The hue is picked per player from their address, so it looks random but
 * stays the same for that player and matches on every client.
 */
export const NAMEPLATE_ALIEN_SATURATION = 0.85
export const NAMEPLATE_ALIEN_BRIGHTNESS = 1

/** Whether you see a nameplate over your own avatar. */
export const NAMEPLATE_SHOW_LOCAL_PLAYER = true
