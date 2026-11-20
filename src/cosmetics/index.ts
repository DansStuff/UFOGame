/**
 * Cosmetics worn by every player, and the avatar area that hides the native
 * nametag and passports around the ship. Each registered cosmetic is attached
 * to all players in the scene by `playerAttachments.ts`; add another by
 * registering another entry. Client only: the server has no avatars to dress.
 */
import { isServer } from '@dcl/sdk/network'
import { alienHead } from './alienHead'
import { setupAvatarArea } from './avatarArea'
import { nameplate } from './nameplate'
import { registerPlayerCosmetic, setupPlayerAttachments } from './playerAttachments'

export function setupCosmetics(): void {
  if (isServer()) return

  setupAvatarArea()
  registerPlayerCosmetic(alienHead)
  registerPlayerCosmetic(nameplate)
  setupPlayerAttachments()
}
