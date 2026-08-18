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
  cellFill: '#f6b93b',
  cellFillEmpty: '#c98a3c',
  cellEdge: '#a8641a',
  cellShadow: 'rgba(93, 47, 6, 0.45)',
  cellHighlight: 'rgba(255, 240, 190, 0.75)',
  letter: '#4a2408',
  letterDim: 'rgba(74, 36, 8, 0.35)',

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

export const typography: Typography = {
  letters: '800 1px "Trebuchet MS", "Segoe UI", system-ui, sans-serif',
  ui: '700 1px "Trebuchet MS", "Segoe UI", system-ui, sans-serif',
  letterScale: 0.82,
}
