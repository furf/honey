import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { buildAdjacency, createHoneycomb } from '../../core/honeycomb'
import { createRng } from '../../core/rng'
import type { Dictionary } from '../../core/ports'
import type { Cell, GenerationConfig, WordsConfig } from '../../core/types'
import { createPackedDictionary } from '../dictionary/packedDictionary'
import { isVowel } from '../dictionary/symbols'
import { solve, toSolverBoard } from './solver'
import { createFamilyGenerator } from './familyGenerator'

const DATA = resolve(dirname(fileURLToPath(import.meta.url)), '../dictionary/data')

let dictionary: Dictionary

beforeAll(() => {
  const buffer = readFileSync(resolve(DATA, 'words.bin'))
  dictionary = createPackedDictionary(
    buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
  )
})

/**
 * Mirrors src/config/game.ts. Restated rather than imported because content sits below
 * config and may not reach up for it — the boundary is what keeps the generator a
 * swappable strategy rather than something wired to one game's settings.
 */
const generation: GenerationConfig = {
    minCommonWords: 40,
    minLongestWord: 6,
    requireEveryCellUsed: true,

    // A hand-tuned bag rather than raw English frequency: a 37-cell board that is a
    // consonant swamp is unplayable however statistically legitimate it is.
    letterWeights: {
      A: 82, B: 20, C: 34, D: 42, E: 110, F: 24, G: 26, H: 30, I: 78,
      J: 3, K: 12, L: 46, M: 28, N: 68, O: 72, P: 26, Qu: 4, R: 62,
      S: 66, T: 74, U: 34, V: 12, W: 18, X: 3, Y: 22, Z: 3,
    },

    // A band, not a floor. Measured at 52% vowels when only a floor was enforced,
    // which produced boards full of AEON, ARIA and RAIA rather than words players
    // enjoy finding.
    vowelFloor: 0.3,
    vowelCeiling: 0.4,
    rareLetterCaps: { J: 1, Qu: 1, X: 1, Z: 1, K: 2, V: 2, W: 2 },
    reseedHistoryDepth: 4,
    maxGenerationAttempts: 6,

    // Longer words must be worth disproportionately more, or the generator maximises
    // count and fills the board with four-letter words — which is what it did.
    lengthWeights: { 4: 1, 5: 3, 6: 9, 7: 20, 8: 34, 9: 50 },
    familyWeight: 6,
    bigramWeight: 40,
    longWordLetters: 6,
    minLongWords: 6,
    hillClimbSteps: 45,
    reseedSharpness: 24,
  
}

const words: WordsConfig = { minLetters: 4, maxLetters: 9 }
const RINGS = 2

function makeGenerator() {
  return createFamilyGenerator({ dictionary, generation, words })
}

function seeded(seed: number) {
  const cells = createHoneycomb(RINGS, 100)
  makeGenerator().seedHoneycomb(cells, createRng(seed))
  return cells
}

function wordsOn(cells: Map<string, Cell>) {
  return solve(toSolverBoard(cells, buildAdjacency(cells)), dictionary, words).common
}

/** Words sharing their first four letters, as the objective counts them. */
function familiesOn(cells: Map<string, Cell>) {
  const families = new Map<string, string[]>()
  for (const word of wordsOn(cells)) {
    const stem = word.slice(0, 4)
    families.set(stem, [...(families.get(stem) ?? []), word])
  }
  return [...families.values()].filter((members) => members.length >= 2)
}

describe('seedHoneycomb', () => {
  it('fills every cell from the alphabet', () => {
    for (const cell of seeded(1).values()) expect(cell.letter).not.toBe('')
  })

  it('is deterministic for a seed, and different across seeds', () => {
    const letters = (seed: number) => [...seeded(seed).values()].map((cell) => cell.letter)
    expect(letters(5)).toEqual(letters(5))
    expect(letters(5)).not.toEqual(letters(6))
  })

  it('keeps the vowel band and the rare letter caps', () => {
    for (let seed = 1; seed <= 5; seed++) {
      const letters = [...seeded(seed).values()].map((cell) => cell.letter)
      const vowels = letters.filter(isVowel).length

      expect(vowels).toBeGreaterThanOrEqual(Math.ceil(letters.length * generation.vowelFloor))
      expect(vowels).toBeLessThanOrEqual(Math.floor(letters.length * generation.vowelCeiling))

      const counts = new Map<string, number>()
      for (const letter of letters) counts.set(letter, (counts.get(letter) ?? 0) + 1)
      for (const [letter, cap] of Object.entries(generation.rareLetterCaps)) {
        expect(counts.get(letter) ?? 0, `${letter} on seed ${seed}`).toBeLessThanOrEqual(cap)
      }
    }
  })

  it('meets the long-word floor that the old generator could not', () => {
    // The previous generator maximised word count and averaged 2 six-letter words on
    // a board this size. Long words are the whole reason this generator exists.
    for (let seed = 1; seed <= 5; seed++) {
      const long = [...wordsOn(seeded(seed))].filter(
        (word) => word.length >= generation.longWordLetters,
      )
      expect(long.length, `seed ${seed}`).toBeGreaterThanOrEqual(generation.minLongWords)
    }
  })

  it('is not dominated by four-letter words', () => {
    let short = 0
    let total = 0
    for (let seed = 1; seed <= 5; seed++) {
      for (const word of wordsOn(seeded(seed))) {
        total++
        if (word.length === 4) short++
      }
    }
    // Measured at 66% before this generator; the target is roughly 45%.
    expect(short / total).toBeLessThan(0.55)
  })

  it('builds families a player can score in a run', () => {
    // TUCK, TUCKS, TUCKED, TUCKING — scoring several words off one stem is what
    // makes the game feel fast.
    for (let seed = 1; seed <= 5; seed++) {
      const families = familiesOn(seeded(seed))
      expect(families.length, `seed ${seed}`).toBeGreaterThan(3)
      expect(Math.max(...families.map((members) => members.length))).toBeGreaterThanOrEqual(3)
    }
  })

  it('leaves no cell out of every common word', () => {
    for (let seed = 1; seed <= 3; seed++) {
      const cells = seeded(seed)
      const board = toSolverBoard(cells, buildAdjacency(cells))
      const { paths, common } = solve(board, dictionary, words)

      const used = new Set<number>()
      for (const word of common) for (const index of paths.get(word)!) used.add(index)

      expect(used.size, `seed ${seed}`).toBe(cells.size)
    }
  })
})

describe('freshness', () => {
  const BOARDS = 10
  const sets: Set<string>[] = []

  beforeAll(() => {
    for (let seed = 1; seed <= BOARDS; seed++) sets.push(wordsOn(seeded(seed * 1013)))
  })

  it('shares little between any two boards', () => {
    // Higher than the old generator's 0.015, because aiming at a shape necessarily
    // narrows the space. Still nowhere near repetitive.
    const overlaps: number[] = []
    for (let i = 0; i < sets.length; i++) {
      for (let j = i + 1; j < sets.length; j++) {
        let shared = 0
        for (const word of sets[i]!) if (sets[j]!.has(word)) shared++
        overlaps.push(shared / (sets[i]!.size + sets[j]!.size - shared))
      }
    }
    const mean = overlaps.reduce((sum, value) => sum + value, 0) / overlaps.length
    expect(mean).toBeLessThan(0.08)
  })

  it('never produces the same board twice', () => {
    const boards = new Set<string>()
    for (let seed = 1; seed <= BOARDS; seed++) {
      boards.add([...seeded(seed * 1013).values()].map((cell) => cell.letter).join(''))
    }
    expect(boards.size).toBe(BOARDS)
  })
})

describe('reseedCell', () => {
  it('changes the letter and records history', () => {
    const cells = seeded(21)
    const generator = makeGenerator()
    const cell = [...cells.values()][0]!
    const rng = createRng(3)

    for (let i = 0; i < 12; i++) {
      const before = cell.letter
      const after = generator.reseedCell(cell, cells, rng)
      expect(after).not.toBe(before)
      expect(cell.history.length).toBeLessThanOrEqual(generation.reseedHistoryDepth)
    }
  })

  it('respects rare letter caps as the board changes', () => {
    const cells = seeded(22)
    const generator = makeGenerator()
    const all = [...cells.values()]
    const rng = createRng(4)

    for (let i = 0; i < 20; i++) {
      generator.reseedCell(all[i % all.length]!, cells, rng)
      const counts = new Map<string, number>()
      for (const cell of all) counts.set(cell.letter, (counts.get(cell.letter) ?? 0) + 1)
      for (const [letter, cap] of Object.entries(generation.rareLetterCaps)) {
        expect(counts.get(letter) ?? 0).toBeLessThanOrEqual(cap)
      }
    }
  })

  it('keeps the board playable after many reseeds', () => {
    const cells = seeded(23)
    const generator = makeGenerator()
    const all = [...cells.values()]
    const rng = createRng(5)

    for (let i = 0; i < all.length; i++) generator.reseedCell(all[i]!, cells, rng)

    expect(wordsOn(cells).size).toBeGreaterThanOrEqual(generation.minCommonWords)
  })
})
