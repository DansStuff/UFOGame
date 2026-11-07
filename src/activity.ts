/**
 * Client heartbeat and server idle recall. The client polls the InputActions
 * that desktop and mobile both produce, and sends at most one report per window
 * when any of them fired. The first input after the client has gone idle is sent
 * immediately, so the server hears it before a recall. Camera look is left out:
 * mouse delta stays 0 on mobile, and the saucer's tilt would move a world-space
 * camera while the player is still.
 *
 * Once idle, a player standing outside the safe zone is sent to a
 * spot one meter inside that zone, on the line from the ship center through
 * where they were. Players already inside the zone are left where they are.
 */
import {
  engine,
  Entity,
  InputAction,
  inputSystem,
  Name,
  PlayerIdentityData,
  PointerEventType,
  Transform
} from '@dcl/sdk/ecs'
import { Vector3 } from '@dcl/sdk/math'
import { onEnterScene, onLeaveScene } from '@dcl/sdk/src/players'
import { isServer } from '@dcl/sdk/network'
import { movePlayerTo } from '~system/RestrictedActions'
import { EntityNames } from '../assets/scene/entity-names'
import {
  ACTIVITY_HEARTBEAT_SECONDS,
  ACTIVITY_IDLE_SECONDS,
  ACTIVITY_RECALL_HEIGHT_METERS,
  ACTIVITY_RECALL_INSET_METERS,
  SHIP_CENTER_X,
  SHIP_CENTER_Z,
  SHIP_TILT_SAFE_RADIUS
} from './constants'
import { notifyActivityRecall } from './gamestate/serverRoom'
import { reportActivity } from './networking/client'
import { room } from './networking/messages'

const ACTIVITY_INPUTS = [
  InputAction.IA_POINTER,
  InputAction.IA_PRIMARY,
  InputAction.IA_JUMP,
  InputAction.IA_FORWARD,
  InputAction.IA_BACKWARD,
  InputAction.IA_LEFT,
  InputAction.IA_RIGHT,
  InputAction.IA_SECONDARY,
  InputAction.IA_ACTION_3,
  InputAction.IA_ACTION_4,
  InputAction.IA_ACTION_5,
  InputAction.IA_ACTION_6,
  InputAction.IA_WALK,
  InputAction.IA_MODIFIER
]

const ACTIVITY_IDLE_MS = ACTIVITY_IDLE_SECONDS * 1000

/** Server receipt time, in ms. Missing entries have not reported since they arrived. */
const lastActivityAtByPlayer = new Map<string, number>()
/** When the player entered the scene, in ms. The idle clock starts here if they never report. */
const joinedAtByPlayer = new Map<string, number>()
/**
 * Players already sent back this idle spell. Idle players inside the safe zone
 * are not added. A new activity report arms the next recall.
 */
const recalledPlayers = new Set<string>()

let hadInput = false
let secondsSinceHeartbeat = 0
/** When this client last told the server it was active, or when it joined. */
let lastReportAt = 0

/** Records a local input that `inputSystem` does not see, such as a scene UI tap. */
export function markActivity(): void {
  hadInput = true
}

/**
 * When this client last convinced the server it was active.
 * Null means no report has arrived. A new joiner is not idle until
 * ACTIVITY_IDLE_SECONDS has passed since they entered.
 */
export function getLastActivity(playerAddress: string): number | null {
  return lastActivityAtByPlayer.get(playerAddress) ?? null
}

export function noteActivity(playerAddress: string): void {
  lastActivityAtByPlayer.set(playerAddress, Date.now())
  recalledPlayers.delete(playerAddress)
}

function forgetPlayer(playerAddress: string): void {
  lastActivityAtByPlayer.delete(playerAddress)
  joinedAtByPlayer.delete(playerAddress)
  recalledPlayers.delete(playerAddress)
}

function isInactive(now = Date.now()): boolean {
  return now - lastReportAt >= ACTIVITY_IDLE_MS
}

function sawActivityInput(): boolean {
  for (const action of ACTIVITY_INPUTS) {
    if (inputSystem.isPressed(action)) return true
    if (inputSystem.isTriggered(action, PointerEventType.PET_DOWN)) return true
  }
  return false
}

function findShip(): Entity | null {
  for (const [entity, name] of engine.getEntitiesWith(Name)) {
    if (name.value === EntityNames.Ship) return entity
  }
  return null
}

/**
 * Landing spot for an inactive player outside the safe zone.
 * Null when they are inside it, or their position is not known yet.
 */
function recallPosition(playerAddress: string): Vector3 | null {
  let offsetX = 0
  let offsetZ = 0
  let distance = 0
  let found = false
  for (const [, identity, transform] of engine.getEntitiesWith(PlayerIdentityData, Transform)) {
    if (identity.address.toLowerCase() !== playerAddress.toLowerCase()) continue
    offsetX = transform.position.x - SHIP_CENTER_X
    offsetZ = transform.position.z - SHIP_CENTER_Z
    distance = Math.hypot(offsetX, offsetZ)
    found = true
    break
  }
  if (!found || distance <= SHIP_TILT_SAFE_RADIUS) return null

  const ship = findShip()
  if (ship === null) return null
  const shipTransform = Transform.getOrNull(ship)
  if (!shipTransform) return null

  const landingRadius = Math.max(SHIP_TILT_SAFE_RADIUS - ACTIVITY_RECALL_INSET_METERS, 0)
  const landing = landingRadius / distance
  return Vector3.create(
    SHIP_CENTER_X + offsetX * landing,
    shipTransform.position.y + ACTIVITY_RECALL_HEIGHT_METERS,
    SHIP_CENTER_Z + offsetZ * landing
  )
}

function noteReportSent(): void {
  hadInput = false
  lastReportAt = Date.now()
  secondsSinceHeartbeat = 0
}

function ActivityClientSystem(dt: number): void {
  if (sawActivityInput()) markActivity()

  // An idle player must reach the server on the press, not at the next window.
  // Otherwise the first step out of the safe zone is still seen as idle.
  if (hadInput && isInactive()) {
    if (!reportActivity()) return
    noteReportSent()
    return
  }

  secondsSinceHeartbeat += dt
  if (secondsSinceHeartbeat < ACTIVITY_HEARTBEAT_SECONDS) return

  secondsSinceHeartbeat = 0
  if (!hadInput) return
  if (!reportActivity()) return
  noteReportSent()
}

function ActivityServerSystem(): void {
  const now = Date.now()
  for (const [playerAddress, joinedAt] of joinedAtByPlayer) {
    if (recalledPlayers.has(playerAddress)) continue
    const last = lastActivityAtByPlayer.get(playerAddress) ?? joinedAt
    if (now - last < ACTIVITY_IDLE_MS) continue
    const position = recallPosition(playerAddress)
    if (!position) continue
    recalledPlayers.add(playerAddress)
    notifyActivityRecall(now, playerAddress, position)
    console.log(`[SERVER] Recalled inactive player ${playerAddress}`)
  }
}

export function setupActivity(): void {
  hadInput = false
  secondsSinceHeartbeat = 0
  lastReportAt = Date.now()
  lastActivityAtByPlayer.clear()
  joinedAtByPlayer.clear()
  recalledPlayers.clear()

  if (isServer()) {
    onEnterScene((player) => {
      if (!player?.userId) return
      if (joinedAtByPlayer.has(player.userId)) return
      joinedAtByPlayer.set(player.userId, Date.now())
    })
    onLeaveScene((userId) => {
      if (!userId) return
      forgetPlayer(userId)
    })
    engine.addSystem(ActivityServerSystem)
    return
  }

  room.onMessage('notifyActivityRecall', (data) => {
    // A report is already in flight, or this client has not gone idle.
    if (hadInput || sawActivityInput() || !isInactive()) return
    void movePlayerTo({
      newRelativePosition: Vector3.create(data.x, data.y, data.z)
    })
  })
  engine.addSystem(ActivityClientSystem)
}
