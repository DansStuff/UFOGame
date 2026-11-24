import { SetupUiComponentKit } from '@stom66/dcl-ui-component-kit'
import { ufo } from './theme'

/**
 * Mounts the HUD through DUCK (@stom66/dcl-ui-component-kit). Every layer shares
 * the 'none' inset (the whole screen), so the kit creates one renderer on the
 * 1920x1080 / 1600x720 virtual canvas and centered zones sit on the true screen
 * center. DUCK's edge and corner zones keep their own margins from the Explorer chrome.
 */
export function setupUi() {
  SetupUiComponentKit({
    theme: ufo.theme,
    layers: ufo.layers,
    screenInset: 'none'
  })
}
