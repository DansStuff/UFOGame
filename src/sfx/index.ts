/**
 * Client-only global one-shot sound effects. Every clip in `SFX_CLIPS` is preloaded at
 * setup and gets a few non-spatial speakers, so `playSfx` plays at the same volume
 * wherever the player is and quick repeats overlap. Positional audio is avoided for now:
 * the Explorer's spatial falloff is too wide to place sounds usefully.
 */
import { AssetLoad, AudioSource, engine, Entity, Transform } from '@dcl/sdk/ecs'
import { SFX_CLIPS, SFX_VOICES_PER_CLIP, type SfxName } from './constants'

export type { SfxName } from './constants'

type Voices = { speakers: Entity[]; next: number }

const voices = new Map<SfxName, Voices>()

function createSpeaker(name: SfxName): Entity {
  const clip = SFX_CLIPS[name]
  const speaker = engine.addEntity()
  // The Explorer only plays AudioSources on entities with a Transform, global ones included.
  Transform.create(speaker)
  AudioSource.create(speaker, {
    audioClipUrl: clip.src,
    playing: false,
    loop: false,
    global: true,
    volume: clip.volume
  })
  return speaker
}

/** Plays a clip once, non-spatial, with a little pitch variation. Does nothing before `setupSfx`. */
export function playSfx(name: SfxName): void {
  const entry = voices.get(name)
  if (entry === undefined) return
  const speaker = entry.speakers[entry.next]
  entry.next = (entry.next + 1) % entry.speakers.length
  const clip = SFX_CLIPS[name]
  const audio = AudioSource.getMutable(speaker)
  audio.volume = clip.volume
  audio.pitch = 1 + (Math.random() * 2 - 1) * clip.pitchSpread
  // playSound rewrites the whole component, so an identical replay still retriggers.
  AudioSource.playSound(speaker, clip.src)
}

/** Wraps a button callback so it plays the UI click first. */
export function withClick(callback: () => void): () => void {
  return () => {
    playSfx('uiClick')
    callback()
  }
}

/** Client-only. Preloads every clip and creates its speakers. */
export function setupSfx(): void {
  voices.clear()
  const assets: string[] = []
  for (const name of Object.keys(SFX_CLIPS) as SfxName[]) {
    const speakers: Entity[] = []
    for (let i = 0; i < SFX_VOICES_PER_CLIP; i++) speakers.push(createSpeaker(name))
    voices.set(name, { speakers, next: 0 })
    assets.push(SFX_CLIPS[name].src)
  }
  AssetLoad.create(engine.addEntity(), { assets })
}
