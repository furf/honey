export type { Surface, SurfaceHandle } from './canvas'
export { createSurface } from './canvas'

export type { Layout, LayoutOptions } from './layout'
export { cellAt, cellCentre, cellNear, computeLayout } from './layout'

export type { Loop, LoopOptions } from './loop'
export { createLoop } from './loop'

export type {
  Environment,
  Palette,
  Sprite,
  SoundRecipe,
  Theme,
  Typography,
} from './theme'
export { environmentById } from './theme'

export type { EnvironmentCache } from './environmentCache'
export { createEnvironmentCache } from './environmentCache'

export {
  centredText,
  darken,
  easeInOut,
  easeOut,
  fillLiquid,
  pourStream,
  hexPath,
  lerp,
  roundedHexPath,
  roundedHexSubpath,
} from './shapes'

export type { SoundBank } from './audio'
export { createSoundBank } from './audio'
