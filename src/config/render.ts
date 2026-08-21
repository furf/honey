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
  readonly cellEdgeWidth: number
  /**
   * How far the emboss pair sits from the glyph it backs.
   *
   * A fraction of the circumradius like everything else here, so the effect keeps its
   * proportion on a tablet instead of vanishing. At phone size it works out to roughly
   * two pixels either way, which is as far as it can go before the pair stops reading
   * as one letter's edges and starts reading as three overlapping letters.
   */
  readonly letterEmbossOffset: number

  /**
   * The slab of comb behind the cells.
   *
   * Each cell's outline is inflated and the whole set filled as one shape, so the
   * board reads as one piece of wax with cells cut into it. Cells keep their own
   * borders and shadows on top, which is where the depth comes from.
   */
  readonly slabInflate: number
  readonly slabShadowBlur: number
  readonly slabShadowOffset: number
  readonly slabEdgeWidth: number

  /** How far a state colour is darkened for the empty part of a cell. */
  readonly stateEmptyShade: number
  /** How far a state colour is darkened for the lit centre of an empty cell. */
  readonly stateGlowShade: number
  /** Opacity of a bee once it is fading off the board. */
  readonly beeLeavingAlpha: number
  /** Points sampled along a honey surface. More is smoother and slower. */
  readonly honeySurfaceSteps: number

  /**
   * When the clock starts warning, in milliseconds remaining.
   *
   * Absolute time rather than a proportion of the duration. "Twenty percent left" is
   * not a thought anyone has at 0:18 — seconds are what the player is reading.
   */
  readonly clockWarnMs: number
  readonly clockDangerMs: number
  /** How long the bonus stays on screen beside the clock. */
  readonly bonusPopupMs: number
  /**
   * Whether the between-seconds beep sounds during the final countdown.
   *
   * Twenty beeps in ten seconds is a dense bed, and it arrives when the player is
   * most tense. This is the half of it to drop first — the on-the-second beep is the
   * one carrying the digit flip.
   */
  readonly clockHalfSecondTick: boolean
  /** How long the end-of-game buzzer waits when a sting is what ended the game. */
  readonly gameOverStaggerMs: number

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
  /** Red closing in from the edges on a sting. Where the clear centre ends, 0 to 1. */
  readonly vignetteInner: number
  readonly vignetteStrength: number
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
  cellEdgeWidth: 0.04,
  letterEmbossOffset: 0.04,
  slabInflate: 1.17,
  slabShadowBlur: 0.55,
  slabShadowOffset: 0.22,
  slabEdgeWidth: 0.05,

  stateEmptyShade: 0.55,
  stateGlowShade: 0.42,
  beeLeavingAlpha: 0.55,
  honeySurfaceSteps: 14,

  clockWarnMs: 30_000,
  clockDangerMs: 10_000,
  bonusPopupMs: 1_100,
  clockHalfSecondTick: true,
  gameOverStaggerMs: 200,

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
  vignetteInner: 0.35,
  vignetteStrength: 0.55,
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
