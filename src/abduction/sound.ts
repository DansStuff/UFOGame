/** Client-only moo played from the cow when the server accepts a probe. */
import { AssetLoad, AudioSource, engine, Entity, Transform } from '@dcl/sdk/ecs'
import { Vector3 } from '@dcl/sdk/math'
import { ABDUCTABLE_MODELS, ABDUCTABLE_PROBE_VOLUME } from '../constants'
import { findAbductable, findAbductableModel } from './components'

/** Follows the cow while a moo plays. Kept off the cow so replacing the cow does not stop the clip. */
let mooSpeaker: Entity | null = null

function speakerEntity(): Entity {
  if (mooSpeaker !== null && Transform.getOrNull(mooSpeaker) !== null) return mooSpeaker
  mooSpeaker = engine.addEntity()
  Transform.create(mooSpeaker)
  return mooSpeaker
}

/**
 * Leaves the speaker on the cow's parent, at the cow's local pose.
 * Removing the cow then keeps a moo that is already playing.
 */
export function detachMooSpeaker(cow: Entity): void {
  if (mooSpeaker === null || Transform.getOrNull(mooSpeaker) === null) return
  if (Transform.get(mooSpeaker).parent !== cow) return
  const cowTransform = Transform.getOrNull(cow)
  if (cowTransform === null) return
  const speaker = Transform.getMutable(mooSpeaker)
  speaker.parent = cowTransform.parent
  speaker.position = Vector3.create(cowTransform.position.x, cowTransform.position.y, cowTransform.position.z)
  speaker.rotation = cowTransform.rotation
}

/** Plays one of this model's probe clips from the cow. A missing cow or an empty list plays nothing. */
export function playProbeSound(): void {
  const cow = findAbductable()
  if (cow === null) return
  const clips = findAbductableModel(cow)?.probeClips
  if (!clips || clips.length === 0) return
  const clip = clips[Math.floor(Math.random() * clips.length)]
  if (!clip) return
  const speaker = speakerEntity()
  const place = Transform.getMutable(speaker)
  place.parent = cow
  place.position = Vector3.create(0, 0, 0)
  if (AudioSource.getOrNull(speaker) === null) {
    AudioSource.create(speaker, { audioClipUrl: clip, playing: false, loop: false, volume: ABDUCTABLE_PROBE_VOLUME })
  } else {
    AudioSource.getMutable(speaker).volume = ABDUCTABLE_PROBE_VOLUME
  }
  AudioSource.playSound(speaker, clip)
}

/** Loads every probe clip so the first accepted probe can play immediately. */
export function preloadProbeClips(): void {
  const assets: string[] = []
  for (const model of ABDUCTABLE_MODELS) {
    for (const clip of model.probeClips) {
      if (!assets.includes(clip)) assets.push(clip)
    }
  }
  if (assets.length === 0) return
  AssetLoad.create(engine.addEntity(), { assets })
}

export function resetMooSpeaker(): void {
  mooSpeaker = null
}
