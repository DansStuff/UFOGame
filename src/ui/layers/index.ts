import type { Layer } from '@stom66/dcl-ui-component-kit'
import { toastHostLayer } from '@stom66/dcl-ui-component-kit'
import { debugLayer } from './debug.layer'
import { hudButtonsLayer } from './hudButtons.layer'
import { redeemLayer } from './redeem.layer'
import { samplesHudLayer } from './samples.layer'
import { tutorialLayer } from './tutorial.layer'

/**
 * Every HUD layer, bottom to top. Paint order also follows each Layer's zIndex.
 * toastHostLayer stays last so showToast() works from any domain.
 */
export const layers: Layer[] = [samplesHudLayer, debugLayer, hudButtonsLayer, redeemLayer, tutorialLayer, toastHostLayer]
