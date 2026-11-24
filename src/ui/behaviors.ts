/**
 * Writes the crew sample total onto the samples HUD, advances the tutorial
 * flipbook, and hides the mobile controls while a popup covers them.
 * Layout lives in src/ui/layers. This file is the only thing that changes those values.
 */
import { engine, InputAction, TouchScreenControls } from '@dcl/sdk/ecs'
import { isServer } from '@dcl/sdk/network'
import { getGameState } from '../gamestate'
import { redeemLayer } from './layers/redeem.layer'
import { samplesHudState as samplesHud } from './layers/samples.layer'
import { tutorialLayer } from './layers/tutorial.layer'

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

export function registerUiBehaviors(): void {
  if (isServer()) return
  engine.addSystem(function UiBehaviorSystem(dt: number) {
    tutorialLayer.tick(dt)
    samplesHud.samplesCollected = getGameState().samplesCollected
    syncPopupTouchControls()
  })
}
