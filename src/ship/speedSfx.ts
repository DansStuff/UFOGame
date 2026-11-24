/**
 * Client-only. Plays the saucer's speed-up sound when the synced speed rises past
 * SHIP_SPEEDUP_SFX_FRACTION, and the slow-down sound when it falls past
 * SHIP_SLOWDOWN_SFX_FRACTION. Each sound has its own cooldown, so a speed hovering
 * on a threshold cannot retrigger it every frame.
 */
import { engine } from '@dcl/sdk/ecs'
import { playSfx, type SfxName } from '../sfx'
import { SHIP_SLOWDOWN_SFX_FRACTION, SHIP_SPEED_SFX_COOLDOWN_SECONDS, SHIP_SPEEDUP_SFX_FRACTION } from './constants'
import { shipSpeedFraction } from './speed'

/** Speed on the previous frame. Null until the first frame, so joining mid-flight plays nothing. */
let lastSpeed: number | null = null
/** Seconds left before each sound may play again. */
const cooldowns = new Map<SfxName, number>()

function tryPlay(name: SfxName): void {
  if ((cooldowns.get(name) ?? 0) > 0) return
  playSfx(name)
  cooldowns.set(name, SHIP_SPEED_SFX_COOLDOWN_SECONDS)
}

function ShipSpeedSfxSystem(dt: number): void {
  for (const [name, left] of cooldowns) cooldowns.set(name, Math.max(0, left - dt))

  const speed = shipSpeedFraction()
  const previous = lastSpeed
  lastSpeed = speed
  if (previous === null) return

  if (previous < SHIP_SPEEDUP_SFX_FRACTION && speed >= SHIP_SPEEDUP_SFX_FRACTION) tryPlay('shipSpeedUp')
  if (previous > SHIP_SLOWDOWN_SFX_FRACTION && speed <= SHIP_SLOWDOWN_SFX_FRACTION) tryPlay('shipSlowDown')
}

export function setupShipSpeedSfx(): void {
  lastSpeed = null
  cooldowns.clear()
  engine.addSystem(ShipSpeedSfxSystem)
}
