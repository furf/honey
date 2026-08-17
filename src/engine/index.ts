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

export {
  centredText,
  easeInOut,
  easeOut,
  fillHexPortion,
  hexPath,
  lerp,
  roundedHexPath,
} from './shapes'

export type { SoundBank } from './audio'
export { createSoundBank } from './audio'
