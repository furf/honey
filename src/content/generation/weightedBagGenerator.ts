import type { Rng } from '../../core/rng'
import type { Cell, GenerationConfig, WordsConfig } from '../../core/types'
import { buildAdjacency } from '../../core/honeycomb'
import type { Dictionary } from '../dictionary/types'
import { SYMBOLS, isVowel } from '../dictionary/symbols'
import { analyse, solve, toSolverBoard } from './solver'
import type { BoardAnalysis, LetterGenerator } from './types'

/**
 * Letter placement by weighted draw, filtered through the board invariants.
 *
 * The spec asked for letters that are random but not *truly* random — boards where
 * words can be found, without the same board twice. This is generate-and-test: draw a
 * board from a hand-tuned bag, solve it, and reject it unless it offers enough. The
 * solver runs in a fraction of a millisecond, so hundreds of attempts are affordable.
 *
 * Reseeds work the same way in miniature: every candidate letter is scored by the
 * words it would create, and penalised for being one this cell held recently, which is
 * what keeps a cell from cycling between the same two letters all game.
 */

export interface WeightedBagOptions {
  readonly dictionary: Dictionary
  readonly generation: GenerationConfig
  readonly words: WordsConfig
}

export function createWeightedBagGenerator(options: WeightedBagOptions): LetterGenerator {
  const { dictionary, generation, words } = options
  const solveOptions = { minLetters: words.minLetters, maxLetters: words.maxLetters }

  const weightedSymbols = SYMBOLS.map(
    (symbol) => [symbol, generation.letterWeights[symbol] ?? 0] as const,
  ).filter(([, weight]) => weight > 0)

  const vowelPool = weightedSymbols.filter(([symbol]) => isVowel(symbol))
  const anyPool = weightedSymbols

  if (vowelPool.length === 0) throw new Error('letterWeights contains no vowels')

  /** Adjacency depends only on which cells exist, so it survives every reseed. */
  const adjacencyCache = new WeakMap<ReadonlyMap<string, Cell>, Map<string, string[]>>()
  const adjacencyFor = (cells: ReadonlyMap<string, Cell>) => {
    let adjacency = adjacencyCache.get(cells)
    if (!adjacency) {
      adjacency = buildAdjacency(cells)
      adjacencyCache.set(cells, adjacency)
    }
    return adjacency
  }

  const analyseCells = (cells: ReadonlyMap<string, Cell>): BoardAnalysis =>
    analyse(toSolverBoard(cells, adjacencyFor(cells)), dictionary, solveOptions)

  const passes = (analysis: BoardAnalysis): boolean =>
    analysis.commonWords.length >= generation.minCommonWords &&
    analysis.longestWordLength >= generation.minLongestWord &&
    (!generation.requireEveryCellUsed || analysis.unusedCellKeys.length === 0)

  /**
   * Draw one letter, respecting the caps on rare letters.
   *
   * A cap that has been reached simply removes that letter from the draw rather than
   * causing a redraw loop, so a tight cap cannot stall generation.
   */
  const draw = (pool: readonly (readonly [string, number])[], used: Map<string, number>, rng: Rng) => {
    const available = pool.filter(([symbol]) => {
      const cap = generation.rareLetterCaps[symbol]
      return cap === undefined || (used.get(symbol) ?? 0) < cap
    })
    const chosen = rng.weighted(available.length > 0 ? available : pool)
    used.set(chosen, (used.get(chosen) ?? 0) + 1)
    return chosen
  }

  /** Fill every cell, guaranteeing the vowel floor before filling the remainder. */
  const fill = (cells: Map<string, Cell>, rng: Rng): void => {
    const size = cells.size
    const vowelTarget = Math.ceil(size * generation.vowelFloor)
    const used = new Map<string, number>()

    const letters: string[] = []
    for (let i = 0; i < vowelTarget; i++) letters.push(draw(vowelPool, used, rng))
    for (let i = vowelTarget; i < size; i++) letters.push(draw(anyPool, used, rng))

    // Shuffle so the guaranteed vowels are not all clustered at the centre.
    for (let i = letters.length - 1; i > 0; i--) {
      const j = rng.int(i + 1)
      ;[letters[i], letters[j]] = [letters[j]!, letters[i]!]
    }

    let index = 0
    for (const cell of cells.values()) cell.letter = letters[index++]!
  }

  return {
    id: 'weighted-bag',

    seedHoneycomb(cells: Map<string, Cell>, rng: Rng): void {
      let best: { letters: string[]; score: number } | null = null

      for (let attempt = 0; attempt < generation.maxGenerationAttempts; attempt++) {
        fill(cells, rng)
        const analysis = analyseCells(cells)

        if (passes(analysis)) return

        // Rank near-misses so a failure to satisfy every invariant still yields the
        // best board seen rather than the last one tried.
        const score =
          analysis.commonWords.length -
          analysis.unusedCellKeys.length * 2 -
          Math.max(0, generation.minLongestWord - analysis.longestWordLength) * 10

        if (best === null || score > best.score) {
          best = { letters: [...cells.values()].map((cell) => cell.letter), score }
        }
      }

      // Relaxing beats hanging. A board this weak is rare, and still playable.
      if (best) {
        let index = 0
        for (const cell of cells.values()) cell.letter = best.letters[index++]!
      }
    },

    reseedCell(cell: Cell, cells: Map<string, Cell>, rng: Rng): string {
      const original = cell.letter
      const adjacency = adjacencyFor(cells)

      // Caps count the rest of the board, so a reseed cannot mint a second Z.
      const used = new Map<string, number>()
      for (const other of cells.values()) {
        if (other === cell) continue
        used.set(other.letter, (used.get(other.letter) ?? 0) + 1)
      }

      const candidates: (readonly [string, number])[] = []
      for (const [symbol, weight] of weightedSymbols) {
        // A reseed must visibly change the letter. Returning the same one would look
        // to the player like the cell simply refilled and did nothing.
        if (symbol === original) continue

        const cap = generation.rareLetterCaps[symbol]
        if (cap !== undefined && (used.get(symbol) ?? 0) >= cap) continue

        cell.letter = symbol
        const { common } = solve(toSolverBoard(cells, adjacency), dictionary, solveOptions)

        // Recent letters are penalised so a cell that empties repeatedly does not
        // keep coming back as the same letter. Most recent is penalised hardest.
        const recency = cell.history.indexOf(symbol)
        const variety =
          recency === -1 ? 1 : (recency + 1) / (generation.reseedHistoryDepth + 1)

        // Weight keeps the bag's character; without it every reseed returns E or S.
        const score = common.size * variety * Math.sqrt(weight)
        if (score > 0) candidates.push([symbol, score])
      }

      cell.letter = original

      // Weighted rather than best-scoring: always taking the maximum would make
      // reseeds deterministic and the board repetitive, which variety is meant to
      // prevent. A dead board with no scoring candidate falls back to the bag.
      let chosen = candidates.length > 0 ? rng.weighted(candidates) : draw(anyPool, used, rng)

      // The fallback draws blind, so it can still land on the letter already here.
      if (chosen === original) {
        const alternatives = anyPool.filter(([symbol]) => symbol !== original)
        if (alternatives.length > 0) chosen = rng.weighted(alternatives)
      }

      cell.letter = chosen
      cell.history = [chosen, ...cell.history].slice(0, generation.reseedHistoryDepth)
      return chosen
    },
  }
}
