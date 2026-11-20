/**
 * Keeps one copy of each registered cosmetic attached to every player in the
 * scene. Each client builds these entities itself and never syncs them, so
 * every player sees the same cosmetics without any network traffic. A copy is
 * removed when its player leaves the scene.
 */
import { AvatarAnchorPointType, AvatarAttach, engine, Entity, PlayerIdentityData, Transform } from '@dcl/sdk/ecs'
import { Vector3 } from '@dcl/sdk/math'
import { getPlayer } from '@dcl/sdk/src/players'
import { COSMETICS_ROSTER_POLL_SECONDS } from './constants'

export type PlayerCosmetic = {
  /** Used as the attachment key. Registering the same id again replaces the entry. */
  id: string
  anchor: AvatarAnchorPointType
  /** Offset of the visible entity from the anchor. The anchor itself ignores Transform position. */
  offset: Vector3
  /** Skip the player running this client, e.g. so you do not see your own nameplate. */
  skipLocalPlayer?: boolean
  /** Adds the visible components to `entity`, which already has its Transform. */
  create(entity: Entity, address: string): void
  /** Optional per-poll refresh, e.g. for data that arrives after the player joins. */
  update?(entity: Entity, address: string): void
}

type Attachment = {
  cosmetic: PlayerCosmetic
  /** Carries AvatarAttach. The engine overwrites its position and rotation. */
  root: Entity
  /** Carries the cosmetic at its offset from the root. */
  visual: Entity
}

type PlayerEntry = {
  /** Address exactly as PlayerIdentityData reports it; `getPlayer` matches it case-sensitively. */
  address: string
  attachments: Attachment[]
}

const cosmetics: PlayerCosmetic[] = []

/** Keyed by lowercase player address. */
const players = new Map<string, PlayerEntry>()

let pollElapsed = 0

function attach(address: string, cosmetic: PlayerCosmetic): Attachment {
  const root = engine.addEntity()
  Transform.create(root, {})
  AvatarAttach.create(root, { avatarId: address, anchorPointId: cosmetic.anchor })

  const visual = engine.addEntity()
  Transform.create(visual, { parent: root, position: cosmetic.offset })
  cosmetic.create(visual, address)
  return { cosmetic, root, visual }
}

function detach(attachment: Attachment): void {
  engine.removeEntity(attachment.visual)
  engine.removeEntity(attachment.root)
}

function addPlayer(key: string, address: string, isLocal: boolean): void {
  const attachments = cosmetics
    .filter((cosmetic) => !(isLocal && cosmetic.skipLocalPlayer))
    .map((cosmetic) => attach(address, cosmetic))
  players.set(key, { address, attachments })
}

function removePlayer(key: string): void {
  const entry = players.get(key)
  if (!entry) return
  for (const attachment of entry.attachments) detach(attachment)
  players.delete(key)
}

/** Adds cosmetics for new players, removes them for players who left, refreshes the rest. */
function syncRoster(): void {
  // Collect first: creating entities while iterating a query can invalidate it.
  const present = new Map<string, string>()
  for (const [, identity] of engine.getEntitiesWith(PlayerIdentityData)) {
    if (identity.address) present.set(identity.address.toLowerCase(), identity.address)
  }
  const localKey = getPlayer()?.userId.toLowerCase() ?? ''

  for (const key of [...players.keys()]) {
    if (!present.has(key)) removePlayer(key)
  }
  for (const [key, address] of present) {
    if (!players.has(key)) addPlayer(key, address, key === localKey)
  }
  for (const entry of players.values()) {
    for (const { cosmetic, visual } of entry.attachments) cosmetic.update?.(visual, entry.address)
  }
}

function playerAttachmentsSystem(dt: number): void {
  pollElapsed += dt
  if (pollElapsed < COSMETICS_ROSTER_POLL_SECONDS) return
  pollElapsed = 0
  syncRoster()
}

/**
 * Adds a cosmetic to every player. Call during setup, before
 * `setupPlayerAttachments`, so each player gets the full list at once.
 */
export function registerPlayerCosmetic(cosmetic: PlayerCosmetic): void {
  const existing = cosmetics.findIndex((entry) => entry.id === cosmetic.id)
  if (existing >= 0) cosmetics[existing] = cosmetic
  else cosmetics.push(cosmetic)
}

export function setupPlayerAttachments(): void {
  for (const key of [...players.keys()]) removePlayer(key)
  pollElapsed = COSMETICS_ROSTER_POLL_SECONDS
  engine.removeSystem(playerAttachmentsSystem)
  engine.addSystem(playerAttachmentsSystem)
}
