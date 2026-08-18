import type { Rng } from '../../core/rng'
import type { Cell, GenerationConfig, WordsConfig } from '../../core/types'
import type { Dictionary, LetterGenerator } from '../../core/ports'
import { buildAdjacency } from '../../core/honeycomb'
import bigrams from '../dictionary/data/bigrams.json'
import { SYMBOLS, isVowel } from '../dictionary/symbols'
import { toSolverBoard } from './solver'
import { scoreBoard, type BoardScore, type ObjectiveWeights } from './objective'

/**
 * Letter placement by refinement rather than resampling.
 *
 * Drawing whole boards at random and keeping the best is fine when the target is
 * "enough words", but hopeless when the target is a *shape* — long words, and stems
 * with several endings. Random boards almost never have those, so no number of draws
 * finds one.
 *
 * This draws a board, then improves it: repeatedly take one cell, try every letter it
 * could hold, and keep the change if the board scores better. Local search reaches
 * boards that sampling would never produce.
 *
 * Neighbouring letters are scored against English bigram frequencies, so a path across
 * the honeycomb spells plausible fragments rather than noise — and a rare letter tends
 * to land beside the vowels that make it usable.
 */

const SYMBOL_COUNT = SYMBOLS.length

if (bigrams.symbols.join(',') !== SYMBOLS.join(',')) {
  throw new Error('bigrams.json was built with a different symbol table than symbols.ts')
}

export interface FamilyGeneratorOptions {
  readonly dictionary: Dictionary
  readonly generation: GenerationConfig
  readonly words: WordsConfig
}

export function createFamilyGenerator(options: FamilyGeneratorOptions): LetterGenerator {
  const { dictionary, generation, words } = options
  const solveOptions = { minLetters: words.minLetters, maxLetters: words.maxLetters }
  const logProbs = bigrams.logProbs as readonly number[]

  const weights: ObjectiveWeights = {
    lengthWeights: generation.lengthWeights,
    familyWeight: generation.familyWeight,
    bigramWeight: generation.bigramWeight,
    longWordLetters: generation.longWordLetters,
  }

  const pool = SYMBOLS.map(
    (symbol) => [symbol, generation.letterWeights[symbol] ?? 0] as const,
  ).filter(([, weight]) => weight > 0)

  const vowelPool = pool.filter(([symbol]) => isVowel(symbol))
  const consonantPool = pool.filter(([symbol]) => !isVowel(symbol))

  const adjacencyCache = new WeakMap<ReadonlyMap<string, Cell>, Map<string, string[]>>()
  const adjacencyFor = (cells: ReadonlyMap<string, Cell>) => {
    let adjacency = adjacencyCache.get(cells)
    if (!adjacency) {
      adjacency = buildAdjacency(cells)
      adjacencyCache.set(cells, adjacency)
    }
    return adjacency
  }

  const evaluate = (cells: ReadonlyMap<string, Cell>): BoardScore =>
    scoreBoard(
      toSolverBoard(cells, adjacencyFor(cells)),
      dictionary,
      solveOptions,
      weights,
      logProbs,
      SYMBOL_COUNT,
    )

  const acceptable = (score: BoardScore): boolean =>
    score.commonWords >= generation.minCommonWords &&
    score.longWords >= generation.minLongWords &&
    (!generation.requireEveryCellUsed || score.unusedCells === 0)

  // ---- letter bookkeeping -------------------------------------------------

  const countLetters = (cells: ReadonlyMap<string, Cell>) => {
    const counts = new Map<string, number>()
    let vowels = 0
    for (const cell of cells.values()) {
      counts.set(cell.letter, (counts.get(cell.letter) ?? 0) + 1)
      if (isVowel(cell.letter)) vowels++
    }
    return { counts, vowels }
  }

  const vowelBand = (size: number) => ({
    floor: Math.ceil(size * generation.vowelFloor),
    ceiling: Math.max(
      Math.ceil(size * generation.vowelFloor),
      Math.floor(size * generation.vowelCeiling),
    ),
  })

  const draw = (
    from: readonly (readonly [string, number])[],
    used: Map<string, number>,
    rng: Rng,
  ) => {
    const available = from.filter(([symbol]) => {
      const cap = generation.rareLetterCaps[symbol]
      return cap === undefined || (used.get(symbol) ?? 0) < cap
    })
    const chosen = rng.weighted(available.length > 0 ? available : from)
    used.set(chosen, (used.get(chosen) ?? 0) + 1)
    return chosen
  }

  const fill = (cells: Map<string, Cell>, rng: Rng): void => {
    const size = cells.size
    const { floor, ceiling } = vowelBand(size)
    const target = floor + rng.int(ceiling - floor + 1)
    const used = new Map<string, number>()

    const letters: string[] = []
    for (let i = 0; i < target; i++) letters.push(draw(vowelPool, used, rng))
    for (let i = target; i < size; i++) letters.push(draw(consonantPool, used, rng))

    for (let i = letters.length - 1; i > 0; i--) {
      const j = rng.int(i + 1)
      ;[letters[i], letters[j]] = [letters[j]!, letters[i]!]
    }

    let index = 0
    for (const cell of cells.values()) cell.letter = letters[index++]!
  }

  /**
   * Letters this cell could take without breaking the vowel band or a rare-letter cap.
   *
   * Legality is checked here rather than after scoring, so the search never spends a
   * solve on a board it would have to reject anyway.
   */
  const candidatesFor = (
    cell: Cell,
    counts: Map<string, number>,
    vowels: number,
    size: number,
  ): string[] => {
    const { floor, ceiling } = vowelBand(size)
    const wasVowel = isVowel(cell.letter)
    const allowed: string[] = []

    for (const [symbol] of pool) {
      if (symbol === cell.letter) continue

      const cap = generation.rareLetterCaps[symbol]
      const already = (counts.get(symbol) ?? 0) - (symbol === cell.letter ? 1 : 0)
      if (cap !== undefined && already >= cap) continue

      const nextVowels = vowels - (wasVowel ? 1 : 0) + (isVowel(symbol) ? 1 : 0)
      if (nextVowels < floor || nextVowels > ceiling) continue

      allowed.push(symbol)
    }

    return allowed
  }

  /**
   * Improve a board one cell at a time.
   *
   * Stops early once the board is acceptable and a full pass finds no improvement,
   * so an already-good board costs little.
   */
  const refine = (cells: Map<string, Cell>, rng: Rng): BoardScore => {
    const all = [...cells.values()]
    let best = evaluate(cells)
    let sinceImprovement = 0

    for (let step = 0; step < generation.hillClimbSteps; step++) {
      const cell = all[rng.int(all.length)]!
      const { counts, vowels } = countLetters(cells)
      const candidates = candidatesFor(cell, counts, vowels, all.length)
      if (candidates.length === 0) continue

      const original = cell.letter
      let bestLetter = original
      let bestScore = best

      for (const candidate of candidates) {
        cell.letter = candidate
        const score = evaluate(cells)
        if (score.total > bestScore.total) {
          bestScore = score
          bestLetter = candidate
        }
      }

      cell.letter = bestLetter
      if (bestLetter !== original) {
        best = bestScore
        sinceImprovement = 0
      } else {
        sinceImprovement++
        // A full sweep of the board without a single improvement means this is a
        // local optimum; more steps would only re-test the same cells.
        if (acceptable(best) && sinceImprovement >= all.length) break
      }
    }

    return best
  }

  return {
    id: 'family',

    seedHoneycomb(cells: Map<string, Cell>, rng: Rng): void {
      let bestLetters: string[] | null = null
      let bestScore = -Infinity

      for (let attempt = 0; attempt < generation.maxGenerationAttempts; attempt++) {
        fill(cells, rng)
        const score = refine(cells, rng)

        if (acceptable(score)) return

        if (score.total > bestScore) {
          bestScore = score.total
          bestLetters = [...cells.values()].map((cell) => cell.letter)
        }
      }

      // Relaxing beats hanging. A board this weak is rare, and still playable.
      if (bestLetters) {
        let index = 0
        for (const cell of cells.values()) cell.letter = bestLetters[index++]!
      }
    },

    reseedCell(cell: Cell, cells: Map<string, Cell>, rng: Rng): string {
      const original = cell.letter
      const { counts, vowels } = countLetters(cells)
      const candidates = candidatesFor(cell, counts, vowels, cells.size)

      const raw: { letter: string; score: number; variety: number }[] = []
      let bestScore = 0

      for (const candidate of candidates) {
        cell.letter = candidate
        const score = evaluate(cells)

        // Recent letters are penalised, so a cell that empties repeatedly does not
        // keep coming back as the same letter.
        const recency = cell.history.indexOf(candidate)
        const variety = recency === -1 ? 1 : (recency + 1) / (generation.reseedHistoryDepth + 1)

        const total = Math.max(0, score.total)
        if (total > bestScore) bestScore = total
        raw.push({ letter: candidate, score: total, variety })
      }

      cell.letter = original

      // Weight by how close a candidate is to the best one, raised to a power.
      // Weighting by raw score barely distinguishes a great letter from a poor one —
      // scores differ by a few per cent — so a board refined over dozens of steps
      // erodes back to noise within a single pass of reseeds. Measured: 158 findable
      // words down to 28 after reseeding every cell once.
      const scored: (readonly [string, number])[] = []
      for (const candidate of raw) {
        const relative = bestScore > 0 ? candidate.score / bestScore : 0
        const weight = Math.pow(relative, generation.reseedSharpness) * candidate.variety
        if (weight > 0) scored.push([candidate.letter, weight])
      }

      // Weighted rather than best-scoring: always taking the maximum would make
      // reseeds deterministic and the board repetitive.
      const chosen =
        scored.length > 0 ? rng.weighted(scored) : draw(consonantPool, new Map(), rng)

      cell.letter = chosen
      cell.history = [chosen, ...cell.history].slice(0, generation.reseedHistoryDepth)
      return chosen
    },
  }
}
