import { SetupUiComponentKit } from '@stom66/dcl-ui-component-kit'
import { ufo } from './theme'

/**
 * Mounts the HUD through DUCK (@stom66/dcl-ui-component-kit). Every layer shares
 * the 'interactable' inset, so the kit creates one renderer that stays clear of
 * the Explorer chrome and uses the 1920x1080 / 1600x720 virtual canvas.
 */
export function setupUi() {
  SetupUiComponentKit({
    theme: ufo.theme,
    layers: ufo.layers,
    screenInset: 'interactable'
  })
}
