import type { Palette, Typography } from '../../engine'

/**
 * Golds and ambers for the honeycomb, which stays constant across every environment.
 * The world around it is what changes.
 *
 * Red appears exactly once, for a sting. It means damage and nothing else — an
 * invalid word desaturates instead, because it is the most common non-event in the
 * game and a red slap every time is exhausting.
 */
export const palette: Palette = {
  // Wax, not orange plastic: a touch yellower than before, and lit from within so the
  // comb reads as translucent.
  cellFill: '#e8a021',
  cellFillEmpty: '#b8843c',
  cellWaxLit: '#e2b366',
  honeyGloss: 'rgba(255, 246, 205, 0.85)',
  cellEdge: '#8f5514',
  cellShadow: 'rgba(74, 36, 8, 0.42)',
  cellHighlight: 'rgba(255, 244, 205, 0.9)',
  letter: '#5a2c09',
  letterDim: 'rgba(90, 44, 9, 0.35)',

  trailSelecting: '#3aa6f0',
  trailScored: '#4fd66f',
  // Deeper and less saturated than the board's own golds, so it reads as distinct
  // rather than as part of the honeycomb.
  trailAlreadyPlayed: '#8a5a20',
  trailInvalid: '#9a9188',
  trailStung: '#ef3b36',

  bee: '#ffd54a',
  beeStripe: '#2b1a08',
  beeWing: 'rgba(255, 255, 255, 0.7)',

  // The two kinds must be tellable apart while moving on a small screen, so they
  // differ in silhouette as well as colour.
  foragerFlower: '#ff7bb0',
  foragerFlowerCentre: '#fff3a8',
  foragerPollen: '#ffb31f',
  hunterBody: '#e2892c',
  hunterSting: '#3d1206',

  hudText: '#fff6e2',
  hudGood: '#4fd66f',
  hudWarn: '#f6b93b',
  hudDanger: '#ef3b36',
}

/**
 * A rounded, open-apertured face.
 *
 * This is a word game: the letters on the cells are the product, and they were
 * previously set in whatever the browser reached for first. `ui-rounded` resolves to
 * SF Pro Rounded on Apple platforms and costs nothing, so a large share of mobile
 * players get a genuinely rounded face today. `Fredoka` leads the stack so dropping
 * in a subset webfont later is one @font-face rule and no other change.
 */
const STACK = '"Fredoka", ui-rounded, "SF Pro Rounded", "Segoe UI Rounded", "Nunito", system-ui, sans-serif'

export const typography: Typography = {
  letters: `600 1px ${STACK}`,
  ui: `600 1px ${STACK}`,
  // Eased back from 0.82: the bee now sits over the cell's upper left, and the glyph
  // needs room to stay legible underneath it.
  letterScale: 0.78,
}
