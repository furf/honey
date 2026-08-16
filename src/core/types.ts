/**
 * The shapes of game state and configuration.
 *
 * Values for every configuration field live in src/config/. Rules code contains no
 * numeric literals — see docs/config-reference.md.
 */

import type { Axial } from './hex'

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Multipliers and restoration keyed by word length; the largest key is a floor. */
export type ByWordLength = Readonly<Record<number, number>>

export interface WordsConfig {
  /** Shortest scoring word, counted in letters not cells. `Qu` counts as two. */
  readonly minLetters: number
  /** Longest word retained when building the word lists. */
  readonly maxLetters: number
}

export interface HoneyConfig {
  /** Honey a full cell holds. Every transfer is a percentage of this. */
  readonly cellCapacity: number
}

export interface ScoringConfig {
  /** Pot multiplier by word length, so longer words outpay the honey they remove. */
  readonly lengthMultipliers: ByWordLength
}

export interface HealthConfig {
  readonly max: number
  /** Health restored by a valid word, by length. */
  readonly restoreByLength: ByWordLength
  readonly stingCost: number
  /** Ease-in from zero to full drain rate when a pause expires. Animation polish. */
  readonly drainRampMs: number
}

export interface GenerationConfig {
  readonly minCommonWords: number
  readonly minLongestWord: number
  readonly requireEveryCellUsed: boolean
  /** The letter bag the generator draws from. Weights need not sum to one. */
  readonly letterWeights: Readonly<Record<string, number>>
  readonly vowelFloor: number
  readonly rareLetterCaps: Readonly<Record<string, number>>
  /** How many past letters a cell remembers, to force variety on reseed. */
  readonly reseedHistoryDepth: number
  /** Attempts before relaxing invariants rather than hanging. */
  readonly maxGenerationAttempts: number
}

export interface BoardConfig {
  readonly rings: number
  readonly orientation: 'pointy'
}

export interface TimingConfig {
  readonly simulationHz: number
  readonly hudUpdateHz: number
}

export interface GameConfig {
  readonly words: WordsConfig
  readonly honey: HoneyConfig
  readonly scoring: ScoringConfig
  readonly health: HealthConfig
  readonly generation: GenerationConfig
  readonly board: BoardConfig
  readonly timing: TimingConfig
}

/**
 * Behaviour of a kind of bee. Levels choose which types appear and may override any
 * field. See docs/adr/0005-bee-behaviour-lives-on-bee-types.md.
 */
export interface BeeType {
  readonly id: string
  /** Percentage of cell capacity taken per sip. */
  readonly sipPercent: number
  /** Sips before the bee fills and leaves. Counted in sips, not honey units. */
  readonly sipCapacity: number
  /** Probability of sipping at a given hop. Below certainty on purpose. */
  readonly sipChance: number
  readonly hopIntervalMs: number
  readonly sipDurationMs: number
  readonly spriteId: string
}

export interface LevelBees {
  readonly types: readonly string[]
  /** Bees below which one spawns immediately. */
  readonly min: number
  /** Bees above which none spawn. */
  readonly max: number
  readonly spawnIntervalMs: number
  /** Per-level overrides of any bee type field. */
  readonly overrides?: Partial<Omit<BeeType, 'id'>>
}

export interface Level {
  /** Pot total that advances the player into this level. */
  readonly honeyThreshold: number
  readonly environmentId: string
  readonly healthDrainPerSecond: number
  /** How long a valid word suspends the drain. */
  readonly drainPauseMs: number
  /** Percentage of cell capacity a harvest removes. */
  readonly harvestPercent: number
  readonly bees: LevelBees
  readonly transition: {
    readonly sound: string
    readonly durationMs: number
  }
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export interface Cell {
  readonly at: Axial
  readonly ring: number
  /** One character, or `Qu`. */
  letter: string
  honey: number
  /** Recent letters, newest first, so reseeds can prefer variety. */
  history: string[]
}

export interface Bee {
  readonly id: number
  readonly typeId: string
  at: Axial
  /** Sips taken so far, against the type's capacity. */
  sipsTaken: number
  /** Milliseconds until the next hop or the end of the current sip. */
  timerMs: number
  phase: 'arriving' | 'hopping' | 'sipping' | 'leaving'
}

/** Why a released trail did not score. Drives distinct feedback per reason. */
export type RejectionReason = 'tooShort' | 'stung' | 'alreadyPlayed' | 'notAWord'

export type TrailOutcome =
  | { readonly kind: 'scored'; readonly word: string; readonly harvested: number }
  | { readonly kind: 'rejected'; readonly reason: RejectionReason; readonly word: string }

export type Screen = 'welcome' | 'playing' | 'gameOver'

export interface GameState {
  readonly seed: number
  screen: Screen
  cells: Map<string, Cell>
  /** Cell keys in the current drag, in order. Empty when not dragging. */
  trail: string[]
  bees: Bee[]
  pot: number
  health: number
  levelIndex: number
  /** Words already scored this game; a word may only be played once. */
  played: Set<string>
  /** Milliseconds remaining before the health drain resumes. */
  drainPauseRemainingMs: number
  /** Milliseconds elapsed into the drain ease-in, capped at drainRampMs. */
  drainRampElapsedMs: number
  msSinceSpawn: number
  elapsedMs: number
  nextBeeId: number
  /** Outcomes produced this step, for the renderer and audio to react to. */
  events: TrailOutcome[]
}
