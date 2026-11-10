/**
 * Client-only box around the ship. Clicking a player inside it does not open
 * their passport. The box is a child of the ship, so it tilts with the deck.
 */
import { AvatarModifierArea, AvatarModifierType, engine, Transform } from '@dcl/sdk/ecs'
import { Vector3 } from '@dcl/sdk/math'
import { EntityNames } from '../../assets/scene/entity-names'
import {
  PASSPORT_AREA_CENTER_Y,
  PASSPORT_AREA_HEIGHT_METERS,
  PASSPORT_AREA_WIDTH_METERS
} from '../constants'

export function setupPassportArea(): void {
  const ship = engine.getEntityOrNullByName(EntityNames.Ship)
  if (ship === null) {
    console.error('[ship] entity Ship missing from main.composite')
    return
  }

  const area = Vector3.create(PASSPORT_AREA_WIDTH_METERS, PASSPORT_AREA_HEIGHT_METERS, PASSPORT_AREA_WIDTH_METERS)
  const passportArea = engine.addEntity()
  Transform.create(passportArea, {
    parent: ship,
    position: Vector3.create(0, PASSPORT_AREA_CENTER_Y, 0),
    scale: area
  })
  AvatarModifierArea.create(passportArea, {
    area,
    modifiers: [AvatarModifierType.AMT_DISABLE_PASSPORTS],
    excludeIds: []
  })
}
