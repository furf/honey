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

  readonly trailWidth: number
  readonly trailGlow: number

  /** How long a cell's drawn honey takes to catch up with its real level. */
  readonly honeyTweenMs: number

  readonly scoredFlashMs: number
  readonly scoredBlinks: number
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
  readonly beeArriveDrop: number

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

  trailWidth: 0.16,
  trailGlow: 0.5,

  honeyTweenMs: 400,

  scoredFlashMs: 620,
  scoredBlinks: 3,
  rejectedMs: 450,
  stungMs: 520,
  shakeMs: 250,
  shakeAmplitude: 9,
  reseedMs: 760,
  popupMs: 950,
  popupRise: 1.7,

  beeTravelMs: 260,
  beeWingHz: 14,
  beeSize: 1.15,
  beeArriveDrop: 3.2,

  ringStaggerMs: 70,
  introMs: 620,
  gameOverMs: 900,

  boardMargin: 0.08,
  topInset: 96,
  bottomInset: 76,
  pointerTolerance: 0.22,
}
