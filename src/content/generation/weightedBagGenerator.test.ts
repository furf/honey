import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { buildAdjacency, createHoneycomb } from '../../core/honeycomb'
import { createRng } from '../../core/rng'
import type { Cell, GenerationConfig, WordsConfig } from '../../core/types'
import { createPackedDictionary } from '../dictionary/packedDictionary'
import type { Dictionary } from '../../core/ports'
import { SYMBOLS, isVowel } from '../dictionary/symbols'
import { analyse, toSolverBoard } from './solver'
import { createWeightedBagGenerator } from './weightedBagGenerator'

const DATA = resolve(dirname(fileURLToPath(import.meta.url)), '../dictionary/data')

let dictionary: Dictionary

beforeAll(() => {
  const buffer = readFileSync(resolve(DATA, 'words.bin'))
  dictionary = createPackedDictionary(
    buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
  )
})

const words: WordsConfig = { minLetters: 4, maxLetters: 9 }

const generation: GenerationConfig = {
  minCommonWords: 40,
  minLongestWord: 6,
  requireEveryCellUsed: true,
  letterWeights: {
    A: 82, B: 20, C: 34, D: 42, E: 110, F: 24, G: 26, H: 30, I: 78,
    J: 3, K: 12, L: 46, M: 28, N: 68, O: 72, P: 26, Qu: 4, R: 62,
    S: 66, T: 74, U: 34, V: 12, W: 18, X: 3, Y: 22, Z: 3,
  },
  vowelFloor: 0.3,
  vowelCeiling: 0.4,
  rareLetterCaps: { J: 1, Qu: 1, X: 1, Z: 1, K: 2, V: 2, W: 2 },
  reseedHistoryDepth: 4,
  maxGenerationAttempts: 200,
  lengthWeights: { 4: 1, 5: 3, 6: 9, 7: 20 },
  familyWeight: 6,
  bigramWeight: 40,
  longWordLetters: 6,
  minLongWords: 0,
  hillClimbSteps: 0,
  reseedSharpness: 1,
}

function makeGenerator(overrides: Partial<GenerationConfig> = {}) {
  return createWeightedBagGenerator({
    dictionary,
    generation: { ...generation, ...overrides },
    words,
  })
}

function seeded(seed: number, overrides: Partial<GenerationConfig> = {}) {
  const cells = createHoneycomb(3, 100)
  makeGenerator(overrides).seedHoneycomb(cells, createRng(seed))
  return cells
}

function lettersOf(cells: Map<string, Cell>) {
  return [...cells.values()].map((cell) => cell.letter)
}

function analyseCells(cells: Map<string, Cell>) {
  return analyse(toSolverBoard(cells, buildAdjacency(cells)), dictionary, words)
}

describe('seedHoneycomb', () => {
  it('fills every cell', () => {
    expect(lettersOf(seeded(1)).every((letter) => letter !== '')).toBe(true)
  })

  it('only places letters the bag contains', () => {
    for (const letter of lettersOf(seeded(2))) expect(SYMBOLS).toContain(letter)
  })

  it('produces the same board for the same seed', () => {
    expect(lettersOf(seeded(7))).toEqual(lettersOf(seeded(7)))
  })

  it('produces different boards for different seeds', () => {
    expect(lettersOf(seeded(7))).not.toEqual(lettersOf(seeded(8)))
  })

  it('satisfies every invariant across many seeds', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const analysis = analyseCells(seeded(seed))
      expect(analysis.commonWords.length, `seed ${seed} common words`).toBeGreaterThanOrEqual(
        generation.minCommonWords,
      )
      expect(analysis.longestWordLength, `seed ${seed} longest word`).toBeGreaterThanOrEqual(
        generation.minLongestWord,
      )
      expect(analysis.unusedCellKeys, `seed ${seed} unused cells`).toEqual([])
    }
  })

  it('keeps the vowel count inside its band', () => {
    // A floor alone let boards drift to 52% vowels, which produced boards full of
    // AEON, ARIA and RAIA. The ceiling is what keeps consonants on the board.
    for (let seed = 1; seed <= 8; seed++) {
      const letters = lettersOf(seeded(seed))
      const vowels = letters.filter(isVowel).length
      expect(vowels, `seed ${seed} vowels`).toBeGreaterThanOrEqual(
        Math.ceil(letters.length * generation.vowelFloor),
      )
      expect(vowels, `seed ${seed} vowels`).toBeLessThanOrEqual(
        Math.floor(letters.length * generation.vowelCeiling),
      )
    }
  })

  it('respects the caps on rare letters', () => {
    for (let seed = 1; seed <= 8; seed++) {
      const counts = new Map<string, number>()
      for (const letter of lettersOf(seeded(seed))) {
        counts.set(letter, (counts.get(letter) ?? 0) + 1)
      }
      for (const [letter, cap] of Object.entries(generation.rareLetterCaps)) {
        expect(counts.get(letter) ?? 0, `${letter} on seed ${seed}`).toBeLessThanOrEqual(cap)
      }
    }
  })

  it('returns a filled board rather than hanging when invariants cannot be met', () => {
    // Impossible to satisfy, so generation must exhaust its attempts and fall back.
    const cells = seeded(3, { minCommonWords: 100_000, maxGenerationAttempts: 5 })
    expect(lettersOf(cells).every((letter) => letter !== '')).toBe(true)
  })
})

describe('freshness', () => {
  /**
   * Every game should feel new. A generator that leans on the highest-frequency
   * letters will keep serving the same handful of words, which these measurements
   * are here to catch — a regression would show up as rising overlap long before
   * anyone noticed it while playing.
   */
  const BOARDS = 16
  const wordSets: Set<string>[] = []

  beforeAll(() => {
    for (let seed = 1; seed <= BOARDS; seed++) {
      wordSets.push(new Set(analyseCells(seeded(seed * 1013)).commonWords))
    }
  })

  const pairwiseOverlaps = () => {
    const overlaps: number[] = []
    for (let i = 0; i < wordSets.length; i++) {
      for (let j = i + 1; j < wordSets.length; j++) {
        const a = wordSets[i]!
        const b = wordSets[j]!
        let shared = 0
        for (const word of a) if (b.has(word)) shared++
        overlaps.push(shared / (a.size + b.size - shared))
      }
    }
    return overlaps
  }

  const appearanceCounts = () => {
    const counts = new Map<string, number>()
    for (const set of wordSets) {
      for (const word of set) counts.set(word, (counts.get(word) ?? 0) + 1)
    }
    return counts
  }

  it('shares almost nothing between any two boards', () => {
    const overlaps = pairwiseOverlaps()
    const mean = overlaps.reduce((sum, value) => sum + value, 0) / overlaps.length
    // Measured at 0.015. The threshold is loose enough not to be flaky and tight
    // enough that a generator leaning on common letters would trip it.
    expect(mean).toBeLessThan(0.05)
    expect(Math.max(...overlaps)).toBeLessThan(0.2)
  })

  it('has no word that turns up on every board', () => {
    const counts = appearanceCounts()
    const ubiquitous = [...counts.entries()]
      .filter(([, count]) => count > BOARDS * 0.5)
      .map(([word, count]) => `${word} on ${count}/${BOARDS}`)
    expect(ubiquitous).toEqual([])
  })

  it('draws from a far wider vocabulary than any one board shows', () => {
    const counts = appearanceCounts()
    const perBoard = wordSets.reduce((sum, set) => sum + set.size, 0) / wordSets.length
    // Measured at roughly 20x: ~99 common words per board, ~2000 distinct overall.
    expect(counts.size).toBeGreaterThan(perBoard * 8)
  })

  it('finds most of its words on a single board only', () => {
    const counts = appearanceCounts()
    const once = [...counts.values()].filter((count) => count === 1).length
    expect(once / counts.size).toBeGreaterThan(0.5)
  })
})

describe('reseedCell', () => {
  it('returns a letter from the bag and writes it to the cell', () => {
    const cells = seeded(4)
    const cell = [...cells.values()][0]!
    const letter = makeGenerator().reseedCell(cell, cells, createRng(1))
    expect(SYMBOLS).toContain(letter)
    expect(cell.letter).toBe(letter)
  })

  it('records history, newest first, bounded by the configured depth', () => {
    const cells = seeded(5)
    const generator = makeGenerator()
    const cell = [...cells.values()][0]!
    const rng = createRng(9)

    const chosen: string[] = []
    for (let i = 0; i < 8; i++) chosen.push(generator.reseedCell(cell, cells, rng))

    expect(cell.history.length).toBeLessThanOrEqual(generation.reseedHistoryDepth)
    expect(cell.history[0]).toBe(chosen.at(-1))
  })

  it('changes exactly one cell, and actually changes it', () => {
    const cells = seeded(6)
    const cell = [...cells.values()][3]!
    const before = lettersOf(cells)
    makeGenerator().reseedCell(cell, cells, createRng(2))
    const after = lettersOf(cells)

    expect(after.filter((letter, index) => letter !== before[index])).toHaveLength(1)
  })

  it('never returns the letter already on the cell', () => {
    // A reseed that returns the same letter looks to the player like nothing happened.
    const cells = seeded(16)
    const generator = makeGenerator()
    const rng = createRng(17)
    const all = [...cells.values()]

    for (let i = 0; i < 80; i++) {
      const cell = all[i % all.length]!
      const previous = cell.letter
      expect(generator.reseedCell(cell, cells, rng)).not.toBe(previous)
    }
  })

  it('never breaches a rare letter cap', () => {
    const cells = seeded(10)
    const generator = makeGenerator()
    const rng = createRng(11)
    const all = [...cells.values()]

    for (let i = 0; i < 60; i++) {
      generator.reseedCell(all[i % all.length]!, cells, rng)
      const counts = new Map<string, number>()
      for (const cell of all) counts.set(cell.letter, (counts.get(cell.letter) ?? 0) + 1)
      for (const [letter, cap] of Object.entries(generation.rareLetterCaps)) {
        expect(counts.get(letter) ?? 0, `${letter} after ${i + 1} reseeds`).toBeLessThanOrEqual(cap)
      }
    }
  })

  it('varies its choice rather than returning one letter forever', () => {
    const cells = seeded(12)
    const generator = makeGenerator()
    const cell = [...cells.values()][0]!
    const rng = createRng(13)

    const seen = new Set<string>()
    for (let i = 0; i < 20; i++) seen.add(generator.reseedCell(cell, cells, rng))

    // The history penalty exists precisely to stop a cell cycling between two letters.
    expect(seen.size).toBeGreaterThan(3)
  })

  it('is deterministic for a given seed', () => {
    const run = () => {
      const cells = seeded(14)
      const generator = makeGenerator()
      const cell = [...cells.values()][2]!
      const rng = createRng(15)
      return [0, 1, 2, 3].map(() => generator.reseedCell(cell, cells, rng))
    }
    expect(run()).toEqual(run())
  })
})
