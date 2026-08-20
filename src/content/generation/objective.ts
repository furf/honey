import type { Dictionary } from '../../core/ports'
import { solve, type SolverBoard, type SolveOptions } from './solver'

/**
 * What makes a board good.
 *
 * The original generator maximised the raw count of findable common words, which
 * sounds right and is not: short words vastly outnumber long ones in any dictionary,
 * so maximising count optimises straight into a sea of four-letter words. Measured on
 * real boards, 66% of findable words were four letters and only 2% were seven or more.
 *
 * This scores three things instead, and the weights decide what kind of board wins.
 */

export interface ObjectiveWeights {
  /** Score per common word, by length. Longer words must be worth disproportionately more. */
  readonly lengthWeights: Readonly<Record<number, number>>
  /** Score for words that share a stem, which is what lets a player score in runs. */
  readonly familyWeight: number
  /**
   * How many leading letters count as a shared stem.
   *
   * Four matches TUCK across TUCKS, TUCKED and TUCKING.
   */
  readonly stemLetters: number
  /**
   * How sharply a family beats the same number of unrelated words.
   *
   * Above 1, each extra member of a family is worth more than the last, which is what
   * makes the generator chase runs rather than scattered pairs.
   */
  readonly familyExponent: number
  /** Score for neighbouring letters that actually follow one another in English. */
  readonly bigramWeight: number
  /** Letters that make a word count as "long" for the invariant. */
  readonly longWordLetters: number
}

export interface BoardScore {
  readonly total: number
  readonly commonWords: number
  readonly longWords: number
  /** Letters in the longest findable common word. */
  readonly longestWord: number
  /** Words belonging to a family of two or more. */
  readonly familyWords: number
  readonly largestFamily: number
  readonly unusedCells: number
  readonly lengthHistogram: ReadonlyMap<number, number>
}

function weightFor(weights: Readonly<Record<number, number>>, length: number): number {
  let best = 0
  let bestKey = -Infinity
  for (const [key, value] of Object.entries(weights)) {
    const at = Number(key)
    if (at <= length && at > bestKey) {
      bestKey = at
      best = value
    }
  }
  return best
}

/**
 * Mean log-probability that each adjacent pair of letters follows one another.
 *
 * Taken in whichever direction reads better, because a trail may be drawn either way
 * across the same pair.
 */
/** Log-probability assigned to a letter pair the corpus never contained. */
const UNSEEN_PAIR = -12

export function bigramScore(board: SolverBoard, logProbs: readonly number[], size: number): number {
  let total = 0
  let pairs = 0

  for (let index = 0; index < board.symbols.length; index++) {
    const from = board.symbols[index]!
    if (from < 0) continue
    for (const neighbour of board.adjacency[index]!) {
      // Each pair is visited twice; count it once.
      if (neighbour <= index) continue
      const to = board.symbols[neighbour]!
      if (to < 0) continue
      // An unseen pair scores badly rather than being impossible, so the search still
      // has a gradient to climb.
      total += Math.max(logProbs[from * size + to] ?? UNSEEN_PAIR, logProbs[to * size + from] ?? UNSEEN_PAIR)
      pairs++
    }
  }

  return pairs > 0 ? total / pairs : 0
}

export function scoreBoard(
  board: SolverBoard,
  dictionary: Dictionary,
  options: SolveOptions,
  weights: ObjectiveWeights,
  logProbs: readonly number[],
  symbolCount: number,
): BoardScore {
  const { paths, common } = solve(board, dictionary, options)

  const histogram = new Map<number, number>()
  const families = new Map<string, number>()
  const used = new Uint8Array(board.symbols.length)

  let wordScore = 0
  let longWords = 0
  let longestWord = 0

  for (const word of common) {
    histogram.set(word.length, (histogram.get(word.length) ?? 0) + 1)
    wordScore += weightFor(weights.lengthWeights, word.length)
    if (word.length >= weights.longWordLetters) longWords++
    if (word.length > longestWord) longestWord = word.length

    const stem = word.slice(0, weights.stemLetters)
    families.set(stem, (families.get(stem) ?? 0) + 1)

    for (const index of paths.get(word)!) used[index] = 1
  }

  // A family of n is worth more than n separate words: the run is the point, and the
  // pace it creates is what testers asked for.
  let familyScore = 0
  let familyWords = 0
  let largestFamily = 0
  for (const count of families.values()) {
    if (count < 2) continue
    familyScore += Math.pow(count - 1, weights.familyExponent)
    familyWords += count
    if (count > largestFamily) largestFamily = count
  }

  let unusedCells = 0
  for (let index = 0; index < used.length; index++) if (used[index] === 0) unusedCells++

  const total =
    wordScore +
    weights.familyWeight * familyScore +
    weights.bigramWeight * bigramScore(board, logProbs, symbolCount)

  return {
    total,
    commonWords: common.size,
    longWords,
    longestWord,
    familyWords,
    largestFamily,
    unusedCells,
    lengthHistogram: histogram,
  }
}
