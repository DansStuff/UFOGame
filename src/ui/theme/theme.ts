import { Color4 } from '@dcl/sdk/math'
import type { ThemeCustomize } from '@stom66/dcl-ui-component-kit'

/**
 * UFO theme: overrides on top of the DUCK default theme. Missing keys inherit.
 * Colors carry over the original hand-built HUD palette (dark teal panels, green trim).
 */
export const theme: ThemeCustomize = {
  colors: {
    // Panel fill behind <Background /> (codex window).
    body: Color4.create(0.05, 0.07, 0.09, 0.96),
    // Chips, cells and the samples pill.
    dark: Color4.create(0.08, 0.12, 0.14, 0.94),
    // Text.
    light: Color4.create(0.9, 1, 0.94, 1),
    // ButtonText / Label default fill. Hover lightens it, press darkens it.
    primary: Color4.create(0.12, 0.18, 0.16, 1),
    // Window and button trim.
    secondary: Color4.create(0.45, 0.75, 0.55, 1),
    // Codex cell trim.
    tertiary: Color4.create(0.4, 0.62, 0.48, 1)
  },
  typography: {
    // Theme-base px: the kit adds a fluid viewport boost (~+7.5 at 1920 wide),
    // so these land close to the old raw 20 / 22 / 32 px sizes.
    size: {
      default: 14,
      h2: 24
    }
  }
}
