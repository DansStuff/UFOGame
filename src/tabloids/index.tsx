/**
 * Client-only. When the server says the ship flew over a newsstand (`notifyTabloids`),
 * a handful of tabloids spin in from the distance, grow until they stick to the screen,
 * hold there, then fade quickly.
 *
 * They draw in their own UI renderer with `screenInset: 'none'`, so they cover the whole
 * device screen, notch and HUD areas included. UiTransform has no rotation, so each page
 * spins by rotating the texture UVs inside a square box; the texture keeps the page inside
 * a transparent margin so the corners never clip.
 */
import { engine } from '@dcl/sdk/ecs'
import ReactEcs, { ReactEcsRenderer, UiEntity } from '@dcl/sdk/react-ecs'
import { setOnTabloids } from '../networking/client'
import {
  TABLOID_APPROACH_SECONDS,
  TABLOID_BOX_MAX_PIXELS,
  TABLOID_BOX_MIN_PIXELS,
  TABLOID_CENTER_MAX_PERCENT,
  TABLOID_CENTER_MIN_PERCENT,
  TABLOID_COUNT_MAX,
  TABLOID_COUNT_MIN,
  TABLOID_FADE_SECONDS,
  TABLOID_HOLD_SECONDS,
  TABLOID_LIFE_SECONDS,
  TABLOID_MAX_ON_SCREEN,
  TABLOID_MAX_TILT_DEGREES,
  TABLOID_RENDERER_Z_INDEX,
  TABLOID_SPIN_TURNS,
  TABLOID_STAGGER_SECONDS,
  TABLOID_START_SCALE,
  TABLOID_TEXTURES
} from './constants'

type Tabloid = {
  key: number
  texture: string
  /** Clock time, seconds, when the approach starts. */
  startAt: number
  centerXPercent: number
  centerYPercent: number
  boxPixels: number
  /** Degrees the page settles at. */
  tilt: number
  /** Degrees spun during the approach, signed for direction. */
  spin: number
}

let clock = 0
let nextKey = 1
let tabloids: Tabloid[] = []

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

/** Overshoots a little before settling, so the page looks like it slaps onto the glass. */
function easeOutBack(t: number): number {
  const c1 = 1.4
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

/** The 4 UV pairs (bottom-left, top-left, top-right, bottom-right) turned by `degrees` about the middle. */
function rotatedUvs(degrees: number): number[] {
  const radians = (degrees * Math.PI) / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  const corners = [
    [0, 0],
    [0, 1],
    [1, 1],
    [1, 0]
  ]
  const uvs: number[] = []
  for (const [u, v] of corners) {
    const du = u - 0.5
    const dv = v - 0.5
    uvs.push(0.5 + du * cos - dv * sin, 0.5 + du * sin + dv * cos)
  }
  return uvs
}

/** The covers in random order. */
function shuffledTextures(): string[] {
  const textures = [...TABLOID_TEXTURES]
  for (let i = textures.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const swap = textures[i]
    textures[i] = textures[j]
    textures[j] = swap
  }
  return textures
}

function throwTabloids(): void {
  const count = Math.floor(randomBetween(TABLOID_COUNT_MIN, TABLOID_COUNT_MAX + 1))
  // Different covers within a batch while there are enough to go round.
  const textures = shuffledTextures()
  for (let i = 0; i < count; i++) {
    const direction = Math.random() < 0.5 ? -1 : 1
    tabloids.push({
      key: nextKey++,
      texture: textures[i % textures.length],
      startAt: clock + i * TABLOID_STAGGER_SECONDS,
      centerXPercent: randomBetween(TABLOID_CENTER_MIN_PERCENT, TABLOID_CENTER_MAX_PERCENT),
      centerYPercent: randomBetween(TABLOID_CENTER_MIN_PERCENT, TABLOID_CENTER_MAX_PERCENT),
      boxPixels: randomBetween(TABLOID_BOX_MIN_PIXELS, TABLOID_BOX_MAX_PIXELS),
      tilt: randomBetween(-TABLOID_MAX_TILT_DEGREES, TABLOID_MAX_TILT_DEGREES),
      spin: direction * TABLOID_SPIN_TURNS * 360
    })
  }
  if (tabloids.length > TABLOID_MAX_ON_SCREEN) tabloids = tabloids.slice(tabloids.length - TABLOID_MAX_ON_SCREEN)
}

function TabloidClockSystem(dt: number): void {
  clock += dt
  if (tabloids.length === 0) return
  tabloids = tabloids.filter((tabloid) => clock - tabloid.startAt < TABLOID_LIFE_SECONDS)
}

type TabloidPose = { scale: number; degrees: number; opacity: number }

function poseAt(tabloid: Tabloid, age: number): TabloidPose {
  if (age < TABLOID_APPROACH_SECONDS) {
    const t = age / TABLOID_APPROACH_SECONDS
    const grow = easeOutBack(t)
    return {
      scale: TABLOID_START_SCALE + (1 - TABLOID_START_SCALE) * grow,
      // Spins from `tilt - spin` down to `tilt`, slowing as it lands.
      degrees: tabloid.tilt - tabloid.spin * (1 - easeOutCubic(t)),
      opacity: 1
    }
  }
  const fadeAge = age - TABLOID_APPROACH_SECONDS - TABLOID_HOLD_SECONDS
  const opacity = fadeAge <= 0 ? 1 : Math.max(0, 1 - fadeAge / TABLOID_FADE_SECONDS)
  return { scale: 1, degrees: tabloid.tilt, opacity }
}

function TabloidView(props: { tabloid: Tabloid; key: number }) {
  const { tabloid } = props
  const age = clock - tabloid.startAt
  const pose = poseAt(tabloid, age)
  const size = tabloid.boxPixels * pose.scale
  return (
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        position: { left: `${tabloid.centerXPercent}%`, top: `${tabloid.centerYPercent}%` },
        margin: { left: -size / 2, top: -size / 2 },
        width: size,
        height: size,
        opacity: pose.opacity,
        pointerFilter: 'none'
      }}
      uiBackground={{
        textureMode: 'stretch',
        texture: { src: tabloid.texture, wrapMode: 'clamp' },
        uvs: rotatedUvs(pose.degrees),
        color: { r: 1, g: 1, b: 1, a: pose.opacity }
      }}
    />
  )
}

function TabloidOverlay() {
  // Tabloids waiting out their stagger are not drawn yet.
  const visible = tabloids.filter((tabloid) => clock >= tabloid.startAt)
  return (
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        position: { left: 0, top: 0 },
        width: '100%',
        height: '100%',
        pointerFilter: 'none'
      }}
    >
      {visible.map((tabloid) => (
        <TabloidView key={tabloid.key} tabloid={tabloid} />
      ))}
    </UiEntity>
  )
}

export function setupTabloids(): void {
  clock = 0
  nextKey = 1
  tabloids = []
  setOnTabloids((newsstandId) => {
    console.log(`[CLIENT] Tabloids from newsstand ${newsstandId}`)
    throwTabloids()
  })
  engine.addSystem(TabloidClockSystem)
  ReactEcsRenderer.addUiRenderer(engine.addEntity(), TabloidOverlay, {
    screenInset: 'none',
    zIndex: TABLOID_RENDERER_Z_INDEX
  })
}
