/**
 * Client-side effects on the saucer. The ship stays put and the planet spins
 * under it, so flight speed is the synced planet spin compared with its maximum.
 * OuterLights and InnerLights are children of the ship. Each yaws around its
 * local up, at the minimum rate while the ship is stopped and up to the maximum
 * rate at full speed. The inner ring turns the other way.
 * BeamRing is also a child of the ship. Its local Y runs from the low end to
 * the high end on a fractional cycle, easing in, then snaps back. Copies run
 * the same travel, spaced evenly through the cycle. Uniform scale follows that
 * phase, full size at the bottom and smaller at the top. Opacity is the
 * authored alpha times that progress, and it drops to 0 just before the snap
 * back to the bottom. The beam and the rings show only while the ship is below
 * the speed threshold, and they do not cast shadows.
 */
import {
  engine,
  Entity,
  GltfContainer,
  GltfNodeModifiers,
  MaterialTransparencyMode,
  Transform,
  VisibilityComponent
} from '@dcl/sdk/ecs'
import { Color3, Color4, Quaternion, Scalar, Vector3 } from '@dcl/sdk/math'
import { isServer } from '@dcl/sdk/network'
import {
  BEAM_RING_ALBEDO_BLUE,
  BEAM_RING_ALBEDO_GREEN,
  BEAM_RING_ALBEDO_RED,
  BEAM_RING_ALPHA,
  BEAM_RING_ALPHA_CLEAR_EARLY,
  BEAM_RING_COUNT,
  BEAM_RING_CYCLES_PER_SECOND,
  BEAM_RING_EASE_IN,
  BEAM_RING_EMISSIVE_BLUE,
  BEAM_RING_EMISSIVE_GREEN,
  BEAM_RING_EMISSIVE_RED,
  BEAM_RING_LOCAL_Y_END,
  BEAM_RING_LOCAL_Y_START,
  BEAM_MAX_VISIBLE_SPEED_FRACTION,
  BEAM_RING_METALLIC,
  BEAM_RING_ROUGHNESS,
  BEAM_RING_SCALE_BOTTOM,
  BEAM_RING_SCALE_TOP,
  SAUCER_LIGHTS_MAX_DEGREES_PER_SECOND,
  SAUCER_LIGHTS_MIN_DEGREES_PER_SECOND,
  SIMULATION_MAX_DELTA_SECONDS
} from '../constants'
import { sceneEntities } from '../scene/entities'
import { shipSpeedFraction } from './speed'

type LightRing = {
  entity: Entity | null
  /** Authored local rotation, captured once so the spin is applied on top of it. */
  baseRotation: Quaternion | null
}

const outerLights: LightRing = { entity: null, baseRotation: null }
const innerLights: LightRing = { entity: null, baseRotation: null }
/** Accumulated yaw of the outer ring around local up, in degrees. Inner uses the negative. */
let yawDegrees = 0

let beam: Entity | null = null
/** Authored ring first, then the runtime copies. */
let beamRings: Entity[] = []
/** Cycles elapsed, kept in [0, 1) by the fractional wrap. 0 is the low end of the travel. */
let beamPhase = 0

/** Degrees per second around local up. The minimum rate holds while the ship is stopped. */
function lightRingDegreesPerSecond(speedFraction: number): number {
  const min = SAUCER_LIGHTS_MIN_DEGREES_PER_SECOND
  const max = SAUCER_LIGHTS_MAX_DEGREES_PER_SECOND
  return min + speedFraction * (max - min)
}

function wrapDegrees(degrees: number): number {
  const wrapped = degrees % 360
  return wrapped < 0 ? wrapped + 360 : wrapped
}

function ringIsLive(ring: LightRing): boolean {
  if (ring.entity === null) return false
  if (Transform.getOrNull(ring.entity)) return true
  ring.entity = null
  ring.baseRotation = null
  return false
}

function captureRing(ring: LightRing, entity: Entity): void {
  const rotation = Transform.get(entity).rotation
  ring.entity = entity
  ring.baseRotation = Quaternion.create(rotation.x, rotation.y, rotation.z, rotation.w)
}

function findLightRings(): void {
  if (!ringIsLive(outerLights)) {
    const entity = sceneEntities.outerLights
    if (entity !== null && Transform.getOrNull(entity)) captureRing(outerLights, entity)
  }
  if (!ringIsLive(innerLights)) {
    const entity = sceneEntities.innerLights
    if (entity !== null && Transform.getOrNull(entity)) captureRing(innerLights, entity)
  }
}

function spinRing(ring: LightRing, yaw: number): void {
  if (ring.entity === null || ring.baseRotation === null) return
  Transform.getMutable(ring.entity).rotation = Quaternion.multiply(
    ring.baseRotation,
    Quaternion.fromAngleAxis(yaw, Vector3.Up())
  )
}

function entityIsLive(entity: Entity | null): boolean {
  return entity !== null && Transform.getOrNull(entity) !== null
}

/** An empty path applies the override to every node in the glTF. */
function disableCastShadows(entity: Entity): void {
  GltfNodeModifiers.createOrReplace(entity, {
    modifiers: [{ path: '', castShadows: false }]
  })
}

function releaseBeamRingCopies(): void {
  for (let i = 1; i < beamRings.length; i++) engine.removeEntity(beamRings[i])
  beamRings = []
}

function beamRingsAreLive(): boolean {
  if (beamRings.length === 0) return false
  if (entityIsLive(beamRings[0])) return true
  releaseBeamRingCopies()
  return false
}

function copyBeamRing(source: Entity): Entity | null {
  const gltf = GltfContainer.getOrNull(source)
  if (gltf === null) return null
  const pose = Transform.get(source)
  const copy = engine.addEntity()
  Transform.create(copy, {
    parent: pose.parent,
    position: Vector3.create(pose.position.x, pose.position.y, pose.position.z),
    rotation: Quaternion.create(pose.rotation.x, pose.rotation.y, pose.rotation.z, pose.rotation.w),
    scale: Vector3.create(pose.scale.x, pose.scale.y, pose.scale.z)
  })
  GltfContainer.create(copy, {
    src: gltf.src,
    visibleMeshesCollisionMask: gltf.visibleMeshesCollisionMask,
    invisibleMeshesCollisionMask: gltf.invisibleMeshesCollisionMask
  })
  disableCastShadows(copy)
  return copy
}

/** Keeps the authored ring and adds copies until the count is filled. */
function captureBeamRing(source: Entity): boolean {
  disableCastShadows(source)
  const rings = [source]
  const count = Math.max(Math.floor(BEAM_RING_COUNT), 1)
  for (let i = 1; i < count; i++) {
    const copy = copyBeamRing(source)
    if (copy === null) {
      for (let j = 1; j < rings.length; j++) engine.removeEntity(rings[j])
      return false
    }
    rings.push(copy)
  }
  beamRings = rings
  return true
}

function findBeamParts(): void {
  const needBeam = !entityIsLive(beam)
  const needRing = !beamRingsAreLive()
  if (needBeam) beam = null
  if (!needBeam && !needRing) return

  if (needBeam) {
    const entity = sceneEntities.beam
    if (entity !== null && Transform.getOrNull(entity)) {
      beam = entity
      disableCastShadows(entity)
    }
  }
  if (needRing && beamRings.length === 0) {
    const entity = sceneEntities.beamRing
    if (entity !== null && Transform.getOrNull(entity)) captureBeamRing(entity)
  }
}

/**
 * Fractional part in [0, 1). Scalar.repeat is the SDK frac: value minus its floor
 * when the length is 1.
 */
function frac(value: number): number {
  return Scalar.repeat(value, 1)
}

/** t^power. Power 1 stays linear. */
function easeIn(t: number): number {
  if (BEAM_RING_EASE_IN <= 1) return t
  return Math.pow(t, BEAM_RING_EASE_IN)
}

/** Authored alpha times travel, forced to 0 in the last slice of the cycle. */
function beamRingAlpha(phase: number, travel: number): number {
  if (phase >= 1 - BEAM_RING_ALPHA_CLEAR_EARLY) return 0
  return BEAM_RING_ALPHA * travel
}

function placeBeamRing(entity: Entity, phase: number): void {
  const travel = easeIn(phase)
  const transform = Transform.getMutable(entity)
  transform.position.y = Scalar.lerp(BEAM_RING_LOCAL_Y_START, BEAM_RING_LOCAL_Y_END, travel)
  const scale = Scalar.lerp(BEAM_RING_SCALE_BOTTOM, BEAM_RING_SCALE_TOP, travel)
  transform.scale = Vector3.create(scale, scale, scale)
  GltfNodeModifiers.createOrReplace(entity, {
    modifiers: [
      {
        path: '',
        castShadows: false,
        material: {
          material: {
            $case: 'pbr',
            pbr: {
              albedoColor: Color4.create(
                BEAM_RING_ALBEDO_RED,
                BEAM_RING_ALBEDO_GREEN,
                BEAM_RING_ALBEDO_BLUE,
                beamRingAlpha(phase, travel)
              ),
              emissiveColor: Color3.create(BEAM_RING_EMISSIVE_RED, BEAM_RING_EMISSIVE_GREEN, BEAM_RING_EMISSIVE_BLUE),
              emissiveIntensity: 1,
              metallic: BEAM_RING_METALLIC,
              roughness: BEAM_RING_ROUGHNESS,
              transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND,
              castShadows: false
            }
          }
        }
      }
    ]
  })
}

function setVisible(entity: Entity, visible: boolean): void {
  const current = VisibilityComponent.getOrNull(entity)
  if (current !== null && current.visible === visible) return
  VisibilityComponent.createOrReplace(entity, { visible })
}

/** The beam and every ring share one visibility, on while the ship is below the threshold. */
function updateBeamVisibility(speedFraction: number): void {
  const visible = speedFraction < BEAM_MAX_VISIBLE_SPEED_FRACTION
  if (beam !== null) setVisible(beam, visible)
  for (const ring of beamRings) setVisible(ring, visible)
}

function advanceBeamRing(step: number): void {
  if (beamRings.length === 0 || BEAM_RING_CYCLES_PER_SECOND <= 0) return

  beamPhase = frac(beamPhase + BEAM_RING_CYCLES_PER_SECOND * step)
  for (let i = 0; i < beamRings.length; i++) {
    placeBeamRing(beamRings[i], frac(beamPhase + i / beamRings.length))
  }
}

function SaucerFxSystem(dt: number): void {
  findLightRings()
  findBeamParts()

  const step = Math.min(Math.max(dt, 0), SIMULATION_MAX_DELTA_SECONDS)

  const speedFraction = shipSpeedFraction()
  updateBeamVisibility(speedFraction)

  const rate = lightRingDegreesPerSecond(speedFraction)
  if (rate > 0) {
    yawDegrees = wrapDegrees(yawDegrees + rate * step)
    spinRing(outerLights, yawDegrees)
    spinRing(innerLights, wrapDegrees(-yawDegrees))
  }

  advanceBeamRing(step)
}

export function setupSaucerFX(): void {
  outerLights.entity = null
  outerLights.baseRotation = null
  innerLights.entity = null
  innerLights.baseRotation = null
  yawDegrees = 0
  beam = null
  releaseBeamRingCopies()
  beamPhase = 0
  if (isServer()) return
  engine.addSystem(SaucerFxSystem)
}
