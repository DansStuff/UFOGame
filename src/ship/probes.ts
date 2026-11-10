/**
 * Cosmetic reactions on the four ship probes. Each loops Idle until the server
 * accepts a probe. This client then plays Probe1 once on one idle probe and
 * returns that probe to Idle after the clip's duration. If every probe is
 * mid-clip, the notify is dropped. Which probe plays is local, so clients can
 * disagree. A placed probe can be missing the Probe1 clip after import, so it
 * is added here.
 */
import { Animator, Entity, timers, Transform } from '@dcl/sdk/ecs'
import { isServer } from '@dcl/sdk/network'
import { EntityNames } from '../../assets/scene/entity-names'
import { PROBE_ACTION_CLIP, PROBE_ACTION_SECONDS, PROBE_IDLE_CLIP } from '../constants'
import { sceneEntities } from '../scene/entities'

const PROBE_NAMES = [EntityNames.Probe1, EntityNames.Probe2, EntityNames.Probe3, EntityNames.Probe4]

type ProbeSlot = {
  name: string
  entity: Entity | null
  /** True while the Probe1 clip is playing. */
  busy: boolean
  timer: number | null
}

const slots: ProbeSlot[] = PROBE_NAMES.map((name) => ({
  name,
  entity: null,
  busy: false,
  timer: null
}))

function clearTimer(slot: ProbeSlot): void {
  if (slot.timer === null) return
  timers.clearTimeout(slot.timer)
  slot.timer = null
}

/** Adds the one-shot clip when import left it off, and keeps Idle looping. */
function prepareProbe(entity: Entity): void {
  if (!Animator.has(entity)) Animator.create(entity, { states: [] })
  const animator = Animator.getMutable(entity)
  const states = animator.states

  let idle = states.find((state) => state.clip === PROBE_IDLE_CLIP)
  if (!idle) {
    states.push({
      clip: PROBE_IDLE_CLIP,
      playing: true,
      loop: true,
      weight: 1,
      speed: 1,
      shouldReset: false
    })
    idle = states[states.length - 1]
  }
  idle.loop = true
  idle.playing = true

  let action = states.find((state) => state.clip === PROBE_ACTION_CLIP)
  if (!action) {
    states.push({
      clip: PROBE_ACTION_CLIP,
      playing: false,
      loop: false,
      weight: 1,
      speed: 1,
      shouldReset: false
    })
    return
  }
  action.playing = false
  action.loop = false
}

function probeEntities(): (Entity | null)[] {
  return [sceneEntities.probe1, sceneEntities.probe2, sceneEntities.probe3, sceneEntities.probe4]
}

function bindProbes(): void {
  const entities = probeEntities()
  for (let index = 0; index < slots.length; index++) {
    const slot = slots[index]
    const entity = entities[index]
    if (entity !== null && Transform.getOrNull(entity) !== null) {
      if (slot.entity === entity) continue
      clearTimer(slot)
      prepareProbe(entity)
      slot.entity = entity
      slot.busy = false
      continue
    }
    clearTimer(slot)
    slot.entity = null
    slot.busy = false
  }
}

function resumeIdle(entity: Entity): void {
  const idle = Animator.getClipOrNull(entity, PROBE_IDLE_CLIP)
  if (idle) idle.loop = true
  Animator.playSingleAnimation(entity, PROBE_IDLE_CLIP, true)
}

/** Plays Probe1 on the first probe that is not already in that clip. */
export function playProbeReaction(): void {
  if (isServer()) return
  bindProbes()

  const slot = slots.find((candidate) => candidate.entity !== null && !candidate.busy)
  if (!slot || slot.entity === null) return

  const entity = slot.entity
  const action = Animator.getClipOrNull(entity, PROBE_ACTION_CLIP)
  if (action) action.loop = false
  if (!Animator.playSingleAnimation(entity, PROBE_ACTION_CLIP, true)) return

  clearTimer(slot)
  slot.busy = true
  slot.timer = timers.setTimeout(() => {
    slot.timer = null
    slot.busy = false
    if (slot.entity !== entity || !Animator.has(entity)) return
    resumeIdle(entity)
  }, PROBE_ACTION_SECONDS * 1000)
  console.log(`[CLIENT] ${slot.name} probed`)
}

export function setupProbes(): void {
  for (const slot of slots) {
    clearTimer(slot)
    slot.entity = null
    slot.busy = false
  }
  if (isServer()) return
  bindProbes()
}
