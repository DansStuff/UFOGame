/**
 * Custom nameplate above each player, replacing the native nametag that
 * `avatarArea.ts` hides. It sits higher so the alien head does not cover it,
 * and turns to face this client's camera. Names pass through
 * `alienizeNameParts`, and each 'AYY' / 'LMAO' run is wrapped in a rich-text
 * color tag. A player's name can arrive after they join, so the text is
 * refreshed on every roster poll.
 */
import { Billboard, BillboardMode, TextAlignMode, TextShape } from '@dcl/sdk/ecs'
import { getPlayer } from '@dcl/sdk/src/players'
import {
  NAMEPLATE_ALIEN_BRIGHTNESS,
  NAMEPLATE_ALIEN_SATURATION,
  NAMEPLATE_ANCHOR,
  NAMEPLATE_FONT_SIZE,
  NAMEPLATE_OFFSET,
  NAMEPLATE_OUTLINE_COLOR,
  NAMEPLATE_OUTLINE_WIDTH,
  NAMEPLATE_SHOW_LOCAL_PLAYER,
  NAMEPLATE_TEXT_COLOR
} from './constants'
import { alienizeNameParts } from './alienName'
import { PlayerCosmetic } from './playerAttachments'

/** FNV-1a. Stable across clients, so every player sees the same colors. */
function hashString(value: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash
}

/** HSV (hue 0–360, saturation and value 0–1) to `#rrggbb`. */
function hsvToHex(hue: number, saturation: number, value: number): string {
  const channel = (n: number): string => {
    const k = (n + hue / 60) % 6
    const c = value - value * saturation * Math.max(0, Math.min(k, 4 - k, 1))
    return Math.round(c * 255)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${channel(5)}${channel(3)}${channel(1)}`
}

/** Looks random, but is fixed per player and per replacement. */
function alienColor(address: string, index: number): string {
  const hue = hashString(`${address.toLowerCase()}:${index}`) % 360
  return hsvToHex(hue, NAMEPLATE_ALIEN_SATURATION, NAMEPLATE_ALIEN_BRIGHTNESS)
}

/** Keeps a name from opening its own rich-text tags. */
function escapeTags(text: string): string {
  return text.replace(/</g, '‹').replace(/>/g, '›')
}

function nameplateText(address: string): string {
  const name = getPlayer({ userId: address })?.name ?? ''
  let alienIndex = 0
  return alienizeNameParts(escapeTags(name))
    .map((part) =>
      part.alien ? `<color=${alienColor(address, alienIndex++)}>${part.text}</color>` : part.text
    )
    .join('')
}

export const nameplate: PlayerCosmetic = {
  id: 'nameplate',
  anchor: NAMEPLATE_ANCHOR,
  offset: NAMEPLATE_OFFSET,
  skipLocalPlayer: !NAMEPLATE_SHOW_LOCAL_PLAYER,
  create(entity, address) {
    TextShape.create(entity, {
      text: nameplateText(address),
      fontSize: NAMEPLATE_FONT_SIZE,
      textAlign: TextAlignMode.TAM_MIDDLE_CENTER,
      textColor: NAMEPLATE_TEXT_COLOR,
      outlineColor: NAMEPLATE_OUTLINE_COLOR,
      outlineWidth: NAMEPLATE_OUTLINE_WIDTH
    })
    Billboard.create(entity, { billboardMode: BillboardMode.BM_ALL })
  },
  update(entity, address) {
    const text = nameplateText(address)
    if (TextShape.get(entity).text !== text) TextShape.getMutable(entity).text = text
  }
}
