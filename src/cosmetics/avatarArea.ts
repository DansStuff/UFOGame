/**
 * Client-only box around the ship that changes how avatars inside it behave.
 * Clicking a player does not open their passport, and the native nametag is
 * hidden so the custom nameplate (`nameplate.ts`) can sit above the alien head.
 * The box is a child of the ship, so it tilts with the deck.
 */
import { AvatarModifierArea, AvatarModifierType, engine, Transform } from '@dcl/sdk/ecs'
import { Vector3 } from '@dcl/sdk/math'
import { EntityNames } from '../../assets/scene/entity-names'
import { AVATAR_AREA_CENTER_Y, AVATAR_AREA_HEIGHT_METERS, AVATAR_AREA_WIDTH_METERS } from './constants'

export function setupAvatarArea(): void {
  const ship = engine.getEntityOrNullByName(EntityNames.Ship)
  if (ship === null) {
    console.error('[cosmetics] entity Ship missing from main.composite')
    return
  }

  const area = Vector3.create(AVATAR_AREA_WIDTH_METERS, AVATAR_AREA_HEIGHT_METERS, AVATAR_AREA_WIDTH_METERS)
  const avatarArea = engine.addEntity()
  Transform.create(avatarArea, {
    parent: ship,
    position: Vector3.create(0, AVATAR_AREA_CENTER_Y, 0),
    scale: area
  })
  AvatarModifierArea.create(avatarArea, {
    area,
    modifiers: [AvatarModifierType.AMT_DISABLE_PASSPORTS, AvatarModifierType.AMT_HIDE_NAMETAGS],
    excludeIds: []
  })
}
