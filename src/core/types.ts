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

/** Values keyed by word length; the largest key is a floor for anything longer. */
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

  /**
   * Multiplier on the harvest percentage, by letter.
   *
   * Rare letters pay more per word and so empty in fewer words, which makes them
   * self-clearing rather than dead cells the player routes around. Capacity stays
   * uniform, so the honey meter means the same thing everywhere.
   * See docs/adr/0001-idle-decay-and-capacity-based-honey.md.
   */
  readonly rarityHarvest: Readonly<Record<string, number>>
  /** Applied to any letter absent from the table. */
  readonly rarityHarvestDefault: number
}

export interface ScoringConfig {
  /** Pot multiplier by word length, so longer words outpay the honey they remove. */
  readonly lengthMultipliers: ByWordLength
}

export interface ClockConfig {
  /**
   * Time a game begins with, and the ceiling a bonus may not push past.
   *
   * One number rather than two, because the rule is that the clock never rises above
   * where it started. A separate cap would be a second number that must always equal
   * the first, which is a trap rather than a flexibility.
   */
  readonly durationMs: number
  readonly stingCostMs: number
  /**
   * Seconds a word adds, by letter count. The largest key floors anything longer,
   * which matters because a word containing `Qu` can reach ten letters from nine
   * cells.
   */
  readonly bonusSecondsByLength: ByWordLength
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

  /**
   * What a good board looks like, as weights over the objective.
   *
   * Maximising the raw count of findable words optimises into a sea of four-letter
   * words, because short words vastly outnumber long ones. These weights are what
   * make the generator trade quantity for length and for word families.
   */
  readonly lengthWeights: Readonly<Record<number, number>>
  readonly familyWeight: number
  /** How many leading letters count as a shared stem. */
  readonly stemLetters: number
  /** How sharply a family beats the same number of unrelated words. */
  readonly familyExponent: number
  readonly bigramWeight: number
  /** Letters that make a word count as long. */
  readonly longWordLetters: number
  /** Long words a board must offer before it is accepted. */
  readonly minLongWords: number
  /** Single-cell improvements tried when refining a board. */
  readonly hillClimbSteps: number
  /**
   * How sharply a reseed prefers the best replacement letter.
   *
   * Reseeds happen constantly during play, so a reseed that picks weakly from every
   * candidate lets a refined board erode back to noise within one pass of the cells.
   * Higher values concentrate on strong letters; the history penalty supplies the
   * variety that this would otherwise cost.
   */
  readonly reseedSharpness: number
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
  readonly clock: ClockConfig
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
   * What this kind of bee is for.
   *
   * Fixed per type rather than rolled per bee: a forager and a hunter look different
   * and sound different, so a bee that changed its mind mid-visit would contradict
   * its own sprite. Disposition shifts across the difficulty curve by which types a
   * level fields. See docs/adr/0005-bee-behaviour-lives-on-bee-types.md.
   */
  readonly intent: BeeIntent
  /** How long the bee turns on the spot before setting off, so a hop reads as intent. */
  readonly turnMs: number
  /** Continuous buzz while this bee is on the board. */
  readonly ambientSound: string
  /** Played as it arrives, so the player hears which kind is coming. */
  readonly approachSound: string
  /**
   * Weight every neighbour keeps regardless of intent.
   *
   * Without a floor, a forager could never step onto an empty cell and a hunter
   * never onto a full one, which turns an inclination into a rail.
   */
  readonly intentFloor: number
  /** How strongly a bee avoids stepping straight back where it came from, 0 to 1. */
  readonly revisitAversion: number
  /** Hops before a bee gives up and leaves, however little it has collected. */
  readonly maxHops: number
  readonly spriteId: string
}

export interface LevelBees {
  /** Which kinds may appear. At most one of each is ever on the board at a time. */
  readonly types: readonly string[]
  /** Bees above which none spawn. */
  readonly max: number
  readonly spawnIntervalMs: number

  /**
   * How long bees may arrive for, and how long the board stays clear afterwards.
   *
   * Constant presence removes the suspense: a threat that is always there stops being
   * a threat. Waves lengthen and calms shorten as levels progress.
   */
  readonly waveMs: number
  readonly calmMs: number

  /** Scales every bee timing this level — above 1 is faster. */
  readonly speed: number

  /** Per-level overrides of any bee type field. */
  readonly overrides?: Partial<Omit<BeeType, 'id'>>
}

export interface Level {
  /** Pot total that advances the player into this level. */
  readonly honeyThreshold: number
  readonly environmentId: string
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

export type BeePhase = 'arriving' | 'hopping' | 'turning' | 'sipping' | 'leaving'

/**
 * What a bee is trying to do, which decides where it goes next.
 *
 * A cell's honey level is a record of how the player has been playing: cells they
 * keep using are the empty ones. So the two purposeful intents pull in opposite
 * directions — a forager goes where the food is, a hunter goes where the player is.
 */
export type BeeIntent = 'forage' | 'hunt'

export interface Bee {
  readonly id: number
  readonly typeId: string
  at: Axial
  /** Where it came from, so it can avoid immediately doubling back. */
  cameFrom: string | null
  /** Cell it is turning towards, while phase is 'turning'. */
  turningTo: string | null
  /**
   * Set once a bee is done and heading for the rim.
   *
   * An exiting bee stops sipping and steers outward, but is still on the board and
   * can still sting — it flies out rather than vanishing from wherever it filled up.
   */
  exiting: boolean
  /** Hops taken so far, against the type's maximum. */
  hops: number
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
      /**
       * Milliseconds actually added to the clock, after clamping at the duration.
       *
       * The applied amount rather than the amount the length earned, so presentation
       * can show the player what really happened without knowing the cap rule.
       */
      readonly bonusMs: number
    }
  | {
      readonly kind: 'wordRejected'
      readonly reason: RejectionReason
      readonly word: string
      readonly cellKeys: readonly string[]
    }
  | {
      readonly kind: 'stung'
      /** Where the sting happened. */
      readonly cellKey: string
      /** Every cell that was in the voided trail — the whole word is lost, not one cell. */
      readonly cellKeys: readonly string[]
      readonly beeId: number
      readonly timeLostMs: number
    }
  | {
      readonly kind: 'cellReseeded'
      readonly cellKey: string
      readonly from: string
      readonly to: string
    }
  | {
      readonly kind: 'beeApproaching'
      readonly beeId: number
      readonly typeId: string
      /** From the bee type's configuration, so the sound is not built by convention. */
      readonly approachSound: string
      readonly cellKey: string
      /** How long the approach lasts, so the flight in can be drawn to scale. */
      readonly durationMs: number
    }
  | {
      readonly kind: 'beeTurning'
      readonly beeId: number
      /** Where it has decided to go, before it starts moving. */
      readonly cellKey: string
      readonly durationMs: number
    }
  | {
      readonly kind: 'beeArrived'
      readonly beeId: number
      readonly cellKey: string
      readonly typeId: string
    }
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
  /** Milliseconds left on the clock. The game ends when this reaches zero. */
  clockMs: number
  levelIndex: number
  /** Words already scored this game; a word may only be played once. */
  played: Set<string>
  msSinceSpawn: number
  /** Time inside the current wave or calm. */
  waveElapsedMs: number
  /** Whether bees may currently arrive. */
  inWave: boolean
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
