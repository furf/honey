import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { buildAdjacency, createHoneycomb } from '../../core/honeycomb'
import { createRng } from '../../core/rng'
import type { Cell, GenerationConfig, WordsConfig } from '../../core/types'
import { createPackedDictionary } from '../dictionary/packedDictionary'
import type { Dictionary } from '../dictionary/types'
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
  rareLetterCaps: { J: 1, Qu: 1, X: 1, Z: 1, K: 2, V: 2, W: 2 },
  reseedHistoryDepth: 4,
  maxGenerationAttempts: 200,
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

  it('meets the vowel floor', () => {
    for (let seed = 1; seed <= 8; seed++) {
      const letters = lettersOf(seeded(seed))
      const vowels = letters.filter(isVowel).length
      expect(vowels).toBeGreaterThanOrEqual(Math.ceil(letters.length * generation.vowelFloor))
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
