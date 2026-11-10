/**
 * Writes the crew sample total onto the samples HUD, places that label on the
 * screen center, and hides the mobile controls while the codex window covers them.
 * Layout lives in src/ui. This file is the only thing that changes those values.
 */
import { engine, InputAction, TouchScreenControls, UiCanvasInformation } from '@dcl/sdk/ecs'
import { isServer } from '@dcl/sdk/network'
import { isMobile } from '@dcl/sdk/platform'
import {
  CODEX_CELL_MARGIN,
  CODEX_HEADER_GAP,
  CODEX_HEADER_HEIGHT,
  CODEX_SCROLLBAR_GUTTER,
  CODEX_WINDOW_BORDER,
  CODEX_WINDOW_INSET_MARGIN,
  CODEX_WINDOW_PADDING
} from '../constants'
import { getGameState } from '../gamestate'
import { state as codex } from './Codex'
import { state as samplesHud } from './SamplesCollected'

/** Virtual canvas the renderer scales against. Mobile overrides a 16:9 size to 1600x720. */
const CODEX_DESKTOP_VIRTUAL_WIDTH = 1920
const CODEX_DESKTOP_VIRTUAL_HEIGHT = 1080
const CODEX_MOBILE_VIRTUAL_WIDTH = 1600
const CODEX_MOBILE_VIRTUAL_HEIGHT = 720

/** Buttons the stock mobile HUD keeps hidden. This SDK build has no showDefault(). */
const STOCK_HIDDEN_TOUCH_BUTTONS = [
  InputAction.IA_SECONDARY,
  InputAction.IA_ACTION_3,
  InputAction.IA_ACTION_4,
  InputAction.IA_ACTION_5,
  InputAction.IA_ACTION_6
]

let codexWasOpen = false

function syncCodexTouchControls(): void {
  if (codex.open === codexWasOpen) return
  codexWasOpen = codex.open
  if (codex.open) {
    TouchScreenControls.hideAll()
    TouchScreenControls.hideJoystick()
    return
  }
  TouchScreenControls.showAll()
  TouchScreenControls.hide(STOCK_HIDDEN_TOUCH_BUTTONS)
  TouchScreenControls.showJoystick()
}

/** Canvas pixels and the UI scale. Positions below are virtual pixels inside the inset. */
type CanvasFrame = {
  scale: number
  width: number
  height: number
  insetLeft: number
  insetTop: number
  insetRight: number
  insetBottom: number
}

function readCanvasFrame(): CanvasFrame | undefined {
  const canvas = UiCanvasInformation.getOrNull(engine.RootEntity)
  if (!canvas || canvas.width <= 0 || canvas.height <= 0) return

  const virtualWidth = isMobile() ? CODEX_MOBILE_VIRTUAL_WIDTH : CODEX_DESKTOP_VIRTUAL_WIDTH
  const virtualHeight = isMobile() ? CODEX_MOBILE_VIRTUAL_HEIGHT : CODEX_DESKTOP_VIRTUAL_HEIGHT
  const scale = Math.min(canvas.width / virtualWidth, canvas.height / virtualHeight)
  if (!(scale > 0)) return

  const inset = canvas.interactableArea
  return {
    scale,
    width: canvas.width,
    height: canvas.height,
    insetLeft: inset?.left ?? 0,
    insetTop: inset?.top ?? 0,
    insetRight: inset?.right ?? 0,
    insetBottom: inset?.bottom ?? 0
  }
}

/**
 * Full-screen bar in inset coordinates. Its flex center is the screen center,
 * so the label stays centered when the pill width changes.
 */
function placeSamplesCollectedBar(frame: CanvasFrame): void {
  samplesHud.barLeft = -frame.insetLeft / frame.scale
  samplesHud.barWidth = frame.width / frame.scale
}

/**
 * Largest window whose center is the screen center and whose edges stay inside
 * the interactable inset. Positions are virtual pixels relative to that inset,
 * because the HUD renderer is placed there.
 */
function placeCodexWindow(frame: CanvasFrame): void {
  const { scale, width, height, insetLeft, insetTop, insetRight, insetBottom } = frame
  const safeWidth = Math.max(0, width - insetLeft - insetRight) / scale
  const safeHeight = Math.max(0, height - insetTop - insetBottom) / scale
  const centerX = (width / 2 - insetLeft) / scale
  const centerY = (height / 2 - insetTop) / scale
  const margin = CODEX_WINDOW_INSET_MARGIN
  const maxHalfWidth = Math.min(centerX, safeWidth - centerX)
  const maxHalfHeight = Math.min(centerY, safeHeight - centerY)

  let panelWidth = 1
  let panelHeight = 1
  let panelLeft = 0
  let panelTop = 0
  if (maxHalfWidth > margin && maxHalfHeight > margin) {
    panelWidth = maxHalfWidth * 2 - margin * 2
    panelHeight = maxHalfHeight * 2 - margin * 2
    panelLeft = centerX - panelWidth / 2
    panelTop = centerY - panelHeight / 2
  } else {
    panelWidth = Math.max(1, safeWidth - margin * 2)
    panelHeight = Math.max(1, safeHeight - margin * 2)
    panelLeft = Math.max(0, (safeWidth - panelWidth) / 2)
    panelTop = Math.max(0, (safeHeight - panelHeight) / 2)
  }

  codex.panelWidth = Math.max(1, Math.round(panelWidth))
  codex.panelHeight = Math.max(1, Math.round(panelHeight))
  codex.panelLeft = Math.max(0, Math.round(panelLeft))
  codex.panelTop = Math.max(0, Math.round(panelTop))

  const innerWidth = Math.max(1, codex.panelWidth - CODEX_WINDOW_PADDING * 2 - CODEX_WINDOW_BORDER * 2)
  const scrollHeight = Math.max(
    1,
    codex.panelHeight - CODEX_WINDOW_PADDING * 2 - CODEX_WINDOW_BORDER * 2 - CODEX_HEADER_HEIGHT - CODEX_HEADER_GAP
  )
  const cellGaps = CODEX_CELL_MARGIN * 6
  codex.innerWidth = innerWidth
  codex.scrollHeight = scrollHeight
  codex.cellSize = Math.max(1, Math.floor((innerWidth - CODEX_SCROLLBAR_GUTTER - cellGaps) / 3))
}

export function registerUiBehaviors(): void {
  if (isServer()) return
  engine.addSystem(function SamplesCollectedUiSystem() {
    samplesHud.samplesCollected = getGameState().samplesCollected
    const frame = readCanvasFrame()
    if (frame) {
      placeSamplesCollectedBar(frame)
      placeCodexWindow(frame)
    }
    syncCodexTouchControls()
  })
}
