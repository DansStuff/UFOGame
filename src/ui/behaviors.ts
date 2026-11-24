/**
 * Writes the crew sample total onto the samples HUD, places that label on the
 * screen center, and hides the mobile controls while a popup covers them.
 * Layout lives in src/ui/layers. This file is the only thing that changes those values.
 */
import { engine, InputAction, TouchScreenControls, UiCanvasInformation } from '@dcl/sdk/ecs'
import { isServer } from '@dcl/sdk/network'
import { isMobile } from '@dcl/sdk/platform'
import { getGameState } from '../gamestate'
import { redeemLayer } from './layers/redeem.layer'
import { samplesHudState as samplesHud } from './layers/samples.layer'
import { tutorialLayer } from './layers/tutorial.layer'

/** Virtual canvas the renderer scales against. Mobile overrides a 16:9 size to 1600x720. */
const DESKTOP_VIRTUAL_WIDTH = 1920
const DESKTOP_VIRTUAL_HEIGHT = 1080
const MOBILE_VIRTUAL_WIDTH = 1600
const MOBILE_VIRTUAL_HEIGHT = 720

/** Buttons the stock mobile HUD keeps hidden. This SDK build has no showDefault(). */
const STOCK_HIDDEN_TOUCH_BUTTONS = [
  InputAction.IA_SECONDARY,
  InputAction.IA_ACTION_3,
  InputAction.IA_ACTION_4,
  InputAction.IA_ACTION_5,
  InputAction.IA_ACTION_6
]

let popupWasOpen = false

/** Hides the joystick and touch buttons while the tutorial or redeem popup is open. */
function syncPopupTouchControls(): void {
  const open = tutorialLayer.isOpen || redeemLayer.isOpen
  if (open === popupWasOpen) return
  popupWasOpen = open
  if (open) {
    TouchScreenControls.hideAll()
    TouchScreenControls.hideJoystick()
    return
  }
  TouchScreenControls.showAll()
  TouchScreenControls.hide(STOCK_HIDDEN_TOUCH_BUTTONS)
  TouchScreenControls.showJoystick()
}

/**
 * Full-screen bar in inset coordinates. Its flex center is the screen center,
 * so the label stays centered when the pill width changes.
 */
function placeSamplesCollectedBar(): void {
  const canvas = UiCanvasInformation.getOrNull(engine.RootEntity)
  if (!canvas || canvas.width <= 0 || canvas.height <= 0) return

  const virtualWidth = isMobile() ? MOBILE_VIRTUAL_WIDTH : DESKTOP_VIRTUAL_WIDTH
  const virtualHeight = isMobile() ? MOBILE_VIRTUAL_HEIGHT : DESKTOP_VIRTUAL_HEIGHT
  const scale = Math.min(canvas.width / virtualWidth, canvas.height / virtualHeight)
  if (!(scale > 0)) return

  samplesHud.barLeft = -(canvas.interactableArea?.left ?? 0) / scale
  samplesHud.barWidth = canvas.width / scale
}

export function registerUiBehaviors(): void {
  if (isServer()) return
  engine.addSystem(function UiBehaviorSystem() {
    samplesHud.samplesCollected = getGameState().samplesCollected
    placeSamplesCollectedBar()
    syncPopupTouchControls()
  })
}
