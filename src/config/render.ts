/**
 * Presentation timings and proportions.
 *
 * Separate from GameConfig because none of it is a rule: changing any value here
 * alters how the game looks, never how it behaves. The type is declared alongside the
 * values because config sits below the engine and cannot reach up for it.
 *
 * Proportions are fractions of a cell's circumradius, so the board scales to any
 * screen without a second set of numbers.
 */
export interface RenderConfig {
  readonly cellCornerRadius: number
  readonly cellGap: number
  readonly cellDepth: number
  /** Warmth of the glow through the wax, so the comb reads as translucent. */
  readonly waxGlow: number
  readonly waxRim: number

  readonly trailRing: number

  /** How long a cell's drawn honey takes to catch up with its real level. */
  readonly honeyTweenMs: number

  /**
   * The honey surface.
   *
   * Honey is a liquid, and liquids have a curved surface that catches light and
   * settles after it is disturbed. Drawing a flat edge is what made the board read as
   * coloured plastic rather than a comb with something in it.
   */
  readonly honeyMeniscus: number
  readonly honeyRippleMs: number
  readonly honeyRippleAmplitude: number
  readonly honeyRippleWaves: number
  /** Milliseconds per radian of ripple travel. Higher is slower, and honey is slow. */
  readonly honeyRipplePeriodMs: number
  readonly honeyGloss: number
  /** How long honey takes to pour back in after a reseed. */
  readonly honeyPourMs: number
  readonly honeyPourWidth: number

  readonly scoredFlashMs: number
  readonly scoredBlinks: number
  /** Blinks when a cell takes a new letter, so the change is impossible to miss. */
  readonly reseedBlinks: number
  /** How far the new letter overshoots as it lands, as a scale factor. */
  readonly reseedPop: number
  readonly rejectedMs: number
  readonly stungMs: number
  readonly shakeMs: number
  readonly shakeAmplitude: number
  readonly reseedMs: number
  readonly popupMs: number
  readonly popupRise: number

  /** How long a bee takes to slide between cells, within one hop interval. */
  readonly beeTravelMs: number
  readonly beeWingHz: number
  readonly beeSize: number
  /**
   * Where a bee sits relative to its cell's centre, in cell radii.
   *
   * Offset to the upper left rather than centred, so the letter underneath stays
   * readable — a bee sitting on the glyph hides the one thing the player needs.
   * It overhangs the cell edge slightly, which also helps it read as *on* the board
   * rather than *in* a slot.
   */
  readonly beeOffset: { readonly x: number; readonly y: number }
  /** How far beyond the rim a bee starts its flight in, in cell radii. */
  readonly beeEntryDistance: number

  /** Per-ring delay for the intro and game-over sweeps. */
  readonly ringStaggerMs: number
  readonly introMs: number
  readonly gameOverMs: number

  readonly boardMargin: number
  readonly topInset: number
  readonly bottomInset: number
  /** How far outside a cell a pointer may stray before the trail drops it. */
  readonly pointerTolerance: number
}

export const renderConfig: RenderConfig = {
  cellCornerRadius: 0.2,
  cellGap: 0.06,
  cellDepth: 0.09,
  waxGlow: 0.35,
  waxRim: 0.055,

  trailRing: 0.1,

  honeyTweenMs: 400,

  // Curvature kept, depth eased: the bow reads as a meniscus rather than a bowl.
  honeyMeniscus: 0.075,
  // Honey is viscous. A fast, tall, many-crested ripple read as water — so the wave
  // is shallower, longer and much slower, and takes longer to settle.
  honeyRippleMs: 900,
  honeyRippleAmplitude: 0.028,
  honeyRippleWaves: 1,
  honeyRipplePeriodMs: 260,
  honeyGloss: 0.45,
  honeyPourMs: 520,
  honeyPourWidth: 0.17,

  scoredFlashMs: 620,
  scoredBlinks: 3,
  rejectedMs: 450,
  stungMs: 520,
  shakeMs: 250,
  shakeAmplitude: 9,
  reseedMs: 820,
  reseedBlinks: 3,
  reseedPop: 0.35,
  popupMs: 950,
  popupRise: 1.7,

  beeTravelMs: 260,
  beeWingHz: 14,
  beeSize: 0.82,
  beeOffset: { x: -0.4, y: -0.44 },
  beeEntryDistance: 5.5,

  ringStaggerMs: 70,
  introMs: 620,
  gameOverMs: 900,

  boardMargin: 0.08,
  // Header, then the trail band beneath it, then the board.
  topInset: 158,
  bottomInset: 76,
  pointerTolerance: 0.22,
}
