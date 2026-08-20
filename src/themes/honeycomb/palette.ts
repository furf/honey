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
  // Wax, not orange plastic: lit from within so the comb reads as translucent. The
  // honey itself is bright and saturated — it is the thing the whole board is about,
  // and a muted amber made a full cell look like an empty one.
  cellFill: '#ffb01c',
  cellFillEmpty: '#b8843c',
  cellWaxLit: '#e2b366',
  honeyGloss: 'rgba(255, 246, 205, 0.85)',
  cellEdge: '#8f5514',
  // The board is cut from one piece of comb. Cells sit in it rather than on it.
  combSlab: '#b07826',
  combSlabEdge: '#7d4a11',
  cellShadow: 'rgba(74, 36, 8, 0.42)',
  cellHighlight: 'rgba(255, 244, 205, 0.9)',
  // Deeper than it was: against bright honey the old brown read as muddy beside the
  // white glyphs on a selected cell.
  letter: '#42190a',
  letterDim: 'rgba(66, 25, 10, 0.35)',
  // On a blue, green or red cell the brown glyph loses contrast; white holds against
  // all three.
  letterOnState: '#ffffff',

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
 * This is a word game: the letters on the cells are the product. Nunito is shipped
 * from public/fonts and declared in styles.css; the rounded system faces behind it
 * only matter if that download is slow or blocked.
 *
 * The board deliberately does not use the display face. Poetsen One sets the word
 * being spelled and nothing else — a display face across nineteen cells would compete
 * with the honey rather than sit in it.
 */
const STACK = '"Nunito", ui-rounded, "SF Pro Rounded", "Segoe UI Rounded", system-ui, sans-serif'

export const typography: Typography = {
  letters: `600 1px ${STACK}`,
  ui: `600 1px ${STACK}`,
  // Eased back from 0.82: the bee now sits over the cell's upper left, and the glyph
  // needs room to stay legible underneath it.
  letterScale: 0.78,
}
