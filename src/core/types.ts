/**
 * The shapes of game state and configuration.
 *
 * Values for every configuration field live in src/config/. Rules code contains no
 * numeric literals — see docs/config-reference.md.
 */

import type { Axial } from './hex'
import type { Dictionary, LetterGenerator } from './ports'
import type { Rng } from './rng'

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
  /**
   * Proportion of cells holding vowels, as a band rather than a floor.
   *
   * A floor alone is not enough: the remaining cells still draw from a bag that is
   * itself vowel-heavy, so boards drift to roughly half vowels and degenerate into
   * vowel soup. The ceiling is what keeps consonants on the board.
   */
  readonly vowelFloor: number
  readonly vowelCeiling: number
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
  /**
   * How long a bee is visible approaching before it lands and can sting.
   *
   * The telegraph is what makes a sting a mistake rather than an ambush.
   */
  readonly arrivalMs: number
  /** How long a full bee remains visible on its way off the board. */
  readonly departureMs: number
  /**
   * Chance of turning at a hop instead of holding its heading.
   *
   * Bees cross the honeycomb in a line. A pure random walk would have them loiter
   * around wherever they landed, which reads as a swarm rather than a flight.
   */
  readonly turnChance: number
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

export type BeePhase = 'arriving' | 'hopping' | 'sipping' | 'leaving'

export interface Bee {
  readonly id: number
  readonly typeId: string
  at: Axial
  /** Index into the six hex directions. Bees hold a heading so flights read as lines. */
  heading: number
  /** Sips taken so far, against the type's capacity. */
  sipsTaken: number
  /** Milliseconds until the current phase ends. */
  timerMs: number
  phase: BeePhase
}

/**
 * Why a released trail did not score.
 *
 * Each reason gets its own feedback, because they mean different things to the
 * player: a word already played was a real find, and deserves to be told apart from
 * a word that never existed. See docs/design/presentation.md.
 */
export type RejectionReason = 'tooShort' | 'alreadyPlayed' | 'notAWord'

/**
 * Everything the rules did this step, for the renderer and audio to react to.
 *
 * The core produces events rather than calling out, so it stays free of any
 * dependency on how the game looks or sounds.
 */
export type GameEvent =
  | { readonly kind: 'trailStarted'; readonly cellKey: string }
  | { readonly kind: 'trailExtended'; readonly cellKey: string }
  | { readonly kind: 'trailBacktracked'; readonly cellKey: string }
  | {
      readonly kind: 'wordScored'
      readonly word: string
      readonly cellKeys: readonly string[]
      readonly harvested: number
      readonly healthRestored: number
    }
  | {
      readonly kind: 'wordRejected'
      readonly reason: RejectionReason
      readonly word: string
      readonly cellKeys: readonly string[]
    }
  | {
      readonly kind: 'stung'
      readonly cellKey: string
      readonly beeId: number
      readonly healthLost: number
    }
  | {
      readonly kind: 'cellReseeded'
      readonly cellKey: string
      readonly from: string
      readonly to: string
    }
  | { readonly kind: 'beeArrived'; readonly beeId: number; readonly cellKey: string }
  | { readonly kind: 'beeMoved'; readonly beeId: number; readonly cellKey: string }
  | {
      readonly kind: 'beeSipped'
      readonly beeId: number
      readonly cellKey: string
      readonly taken: number
      /** Sips remaining before this bee fills up and leaves. */
      readonly sipsLeft: number
    }
  | { readonly kind: 'beeLeft'; readonly beeId: number; readonly full: boolean }
  | { readonly kind: 'levelChanged'; readonly from: number; readonly to: number }
  | { readonly kind: 'gameOver'; readonly pot: number }

export type Screen = 'welcome' | 'playing' | 'gameOver'

export interface GameState {
  readonly seed: number
  screen: Screen
  cells: Map<string, Cell>
  /** Cell keys in the current drag, in order. Empty when not dragging. */
  trail: string[]
  /**
   * Set when a sting voids the drag mid-gesture.
   *
   * The pointer is still down, so without this latch the very next move would start a
   * fresh trail from the cell the player is being stung on.
   */
  dragVoided: boolean
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
  /** Events produced since the caller last drained them. */
  events: GameEvent[]
}

// ---------------------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------------------

/**
 * Everything the rules need from outside themselves.
 *
 * Assembled by the composition root. Time arrives as a delta and randomness as an
 * injected generator, so the rules stay free of any clock or global entropy.
 */
export interface GameDeps {
  readonly config: GameConfig
  readonly levels: readonly Level[]
  readonly dictionary: Dictionary
  readonly generator: LetterGenerator
  readonly beeTypes: Readonly<Record<string, BeeType>>
  readonly rng: Rng
}

export interface Game {
  readonly state: GameState
  /** Stable for the life of the game: which cells exist never changes. */
  readonly adjacency: Map<string, string[]>
  readonly deps: GameDeps
}
