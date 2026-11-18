import type { Layer } from '@stom66/dcl-ui-component-kit'
import { toastHostLayer } from '@stom66/dcl-ui-component-kit'
import { codexButtonLayer, codexLayer } from './codex.layer'
import { debugLayer } from './debug.layer'
import { samplesHudLayer } from './samples.layer'

/**
 * Every HUD layer, bottom to top. Paint order also follows each Layer's zIndex.
 * toastHostLayer stays last so showToast() works from any domain.
 */
export const layers: Layer[] = [samplesHudLayer, debugLayer, codexButtonLayer, codexLayer, toastHostLayer]
