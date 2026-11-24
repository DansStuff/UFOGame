/**
 * Tunable values for global one-shot sound effects. Clips are trimmed and level-matched
 * OGGs made from the CC0 candidates kept in `references/sounds/` (see `attributions/`).
 */

// MARK: Clips

export type SfxName =
  | 'cornPop'
  | 'cargoThud'
  | 'cornCrunch'
  | 'tabloidRustle'
  | 'uiClick'
  | 'uiWhooshIn'
  | 'uiWhooshOut'
  | 'shipSpeedUp'
  | 'shipSlowDown'

export type SfxClip = {
  src: string
  /** Playback volume, 0 to 1. */
  volume: number
  /** Random pitch spread per play, as a fraction (0.06 plays at 0.94 to 1.06). Zero keeps the exact pitch. */
  pitchSpread: number
}

export const SFX_CLIPS: Record<SfxName, SfxClip> = {
  // A corn cob leaves the field and starts up the beam.
  cornPop: { src: 'assets/scene/Sounds/corn_pop.ogg', volume: 0.8, pitchSpread: 0.08 },
  // A cargo item hits the deck at the end of its arrival.
  cargoThud: { src: 'assets/scene/Sounds/cargo_thud.ogg', volume: 0.8, pitchSpread: 0.06 },
  // Someone eats a corn cob off the deck.
  cornCrunch: { src: 'assets/scene/Sounds/corn_crunch.ogg', volume: 1, pitchSpread: 0.06 },
  // Tabloids fly at the screen after passing over a newsstand.
  tabloidRustle: { src: 'assets/scene/Sounds/tabloid_rustle.ogg', volume: 0.8, pitchSpread: 0.05 },
  // Any HUD button press. A short falling digital "bloop".
  uiClick: { src: 'assets/scene/Sounds/ui_click.ogg', volume: 0.8, pitchSpread: 0.05 },
  // A popup panel opens (rising) or closes (falling). The same whoosh, one reversed.
  uiWhooshIn: { src: 'assets/scene/Sounds/ui_whoosh_in.ogg', volume: 0.7, pitchSpread: 0 },
  uiWhooshOut: { src: 'assets/scene/Sounds/ui_whoosh_out.ogg', volume: 0.7, pitchSpread: 0 },
  // The saucer speeds up or slows down past a threshold (ship/speedSfx.ts). Synthesized by
  // tools/synth_ufo_speed.py, oscillator style.
  shipSpeedUp: { src: 'assets/scene/Sounds/ship_speedup.ogg', volume: 0.7, pitchSpread: 0.03 },
  shipSlowDown: { src: 'assets/scene/Sounds/ship_slowdown.ogg', volume: 0.7, pitchSpread: 0.03 }
}

/** Speakers per clip, used round-robin so quick repeats overlap instead of cutting each other off. */
export const SFX_VOICES_PER_CLIP = 3
