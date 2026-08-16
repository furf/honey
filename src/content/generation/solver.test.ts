import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { buildAdjacency, createHoneycomb } from '../../core/honeycomb'
import { key } from '../../core/hex'
import type { Axial } from '../../core/hex'
import type { Cell } from '../../core/types'
import { createPackedDictionary } from '../dictionary/packedDictionary'
import type { Dictionary } from '../../core/ports'
import { analyse, solve, toSolverBoard } from './solver'

const DATA = resolve(dirname(fileURLToPath(import.meta.url)), '../dictionary/data')

let dictionary: Dictionary

beforeAll(() => {
  const buffer = readFileSync(resolve(DATA, 'words.bin'))
  dictionary = createPackedDictionary(
    buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
  )
})

const OPTIONS = { minLetters: 4, maxLetters: 9 }

/** Build a board of the given rings, then place letters at named coordinates. */
function boardWith(rings: number, placements: [Axial, string][], filler = 'Z') {
  const cells = createHoneycomb(rings, 100)
  for (const cell of cells.values()) cell.letter = filler
  for (const [at, letter] of placements) {
    const cell = cells.get(key(at))
    if (!cell) throw new Error(`no cell at ${key(at)}`)
    cell.letter = letter
  }
  return { cells, adjacency: buildAdjacency(cells) }
}

function wordsOn(cells: Map<string, Cell>, adjacency: Map<string, string[]>, options = OPTIONS) {
  return solve(toSolverBoard(cells, adjacency), dictionary, options).paths
}

describe('solve', () => {
  it('finds a word along a chain of adjacent cells', () => {
    // T(0,0) - E(1,0) - A(1,-1) - M(0,-1), each step to an immediate neighbour.
    const { cells, adjacency } = boardWith(1, [
      [{ q: 0, r: 0 }, 'T'],
      [{ q: 1, r: 0 }, 'E'],
      [{ q: 1, r: -1 }, 'A'],
      [{ q: 0, r: -1 }, 'M'],
    ])
    const found = wordsOn(cells, adjacency)
    expect(found.has('TEAM')).toBe(true)
  })

  it('finds the same letters read the other way', () => {
    const { cells, adjacency } = boardWith(1, [
      [{ q: 0, r: 0 }, 'T'],
      [{ q: 1, r: 0 }, 'E'],
      [{ q: 1, r: -1 }, 'A'],
      [{ q: 0, r: -1 }, 'M'],
    ])
    expect(wordsOn(cells, adjacency).has('MATE')).toBe(true)
  })

  it('will not reuse a cell within one word', () => {
    // Only one E on the board, so EYES cannot be drawn without revisiting it.
    const { cells, adjacency } = boardWith(1, [
      [{ q: 0, r: 0 }, 'E'],
      [{ q: 1, r: 0 }, 'Y'],
      [{ q: 1, r: -1 }, 'S'],
    ])
    const found = wordsOn(cells, adjacency)
    expect(found.has('EYES')).toBe(false)
  })

  it('will not join cells that are not adjacent', () => {
    // T and M sit on opposite sides of the board, so TEAM has no continuous path.
    const { cells, adjacency } = boardWith(1, [
      [{ q: 0, r: 0 }, 'X'],
      [{ q: 1, r: 0 }, 'T'],
      [{ q: 1, r: -1 }, 'E'],
      [{ q: -1, r: 0 }, 'A'],
      [{ q: -1, r: 1 }, 'M'],
    ])
    expect(wordsOn(cells, adjacency).has('TEAM')).toBe(false)
  })

  it('honours the minimum length', () => {
    const { cells, adjacency } = boardWith(1, [
      [{ q: 0, r: 0 }, 'T'],
      [{ q: 1, r: 0 }, 'E'],
      [{ q: 1, r: -1 }, 'A'],
      [{ q: 0, r: -1 }, 'M'],
    ])
    const found = wordsOn(cells, adjacency)
    expect(found.has('TEA')).toBe(false)
    expect([...found.keys()].every((word) => word.length >= 4)).toBe(true)
  })

  it('honours the maximum length', () => {
    const { cells, adjacency } = boardWith(3, [], 'E')
    const found = wordsOn(cells, adjacency, { minLetters: 4, maxLetters: 5 })
    expect([...found.keys()].every((word) => word.length <= 5)).toBe(true)
  })

  it('counts Qu as two letters across one cell', () => {
    // QUIT spans three cells but is four letters, so it clears a minimum of four.
    const { cells, adjacency } = boardWith(1, [
      [{ q: 0, r: 0 }, 'Qu'],
      [{ q: 1, r: 0 }, 'I'],
      [{ q: 1, r: -1 }, 'T'],
    ])
    const found = wordsOn(cells, adjacency)
    expect(found.has('QUIT')).toBe(true)
    expect(found.get('QUIT')).toHaveLength(3)
  })

  it('reports a path whose cells are all distinct and adjacent in order', () => {
    const { cells, adjacency } = boardWith(3, [], 'E')
    const board = toSolverBoard(cells, adjacency)
    const found = solve(board, dictionary, OPTIONS).paths

    for (const [word, path] of found) {
      expect(new Set(path).size, `${word} revisits a cell`).toBe(path.length)
      for (let i = 1; i < path.length; i++) {
        const near = [...board.adjacency[path[i - 1]!]!]
        expect(near, `${word} jumps between cells`).toContain(path[i])
      }
    }
  })

  it('returns nothing for a board with no letters on it', () => {
    const cells = createHoneycomb(3, 100)
    expect(wordsOn(cells, buildAdjacency(cells)).size).toBe(0)
  })
})

describe('analyse', () => {
  it('reports common words, the longest word, and cells no common word uses', () => {
    const { cells, adjacency } = boardWith(1, [
      [{ q: 0, r: 0 }, 'T'],
      [{ q: 1, r: 0 }, 'E'],
      [{ q: 1, r: -1 }, 'A'],
      [{ q: 0, r: -1 }, 'M'],
    ])
    const result = analyse(toSolverBoard(cells, adjacency), dictionary, OPTIONS)

    expect(result.commonWords).toContain('TEAM')
    expect(result.longestWordLength).toBeGreaterThanOrEqual(4)
    // The three filler cells take part in no common word.
    expect(result.unusedCellKeys.length).toBeGreaterThan(0)
    expect(result.unusedCellKeys).toContain(key({ q: -1, r: 0 }))
  })

  it('marks every cell unused when the board yields nothing', () => {
    const cells = createHoneycomb(1, 100)
    for (const cell of cells.values()) cell.letter = 'Z'
    const adjacency = buildAdjacency(cells)
    const result = analyse(toSolverBoard(cells, adjacency), dictionary, OPTIONS)
    expect(result.commonWords).toEqual([])
    expect(result.unusedCellKeys).toHaveLength(cells.size)
  })
})

describe('performance', () => {
  it('solves a full board fast enough to run inside board generation', () => {
    // Vowel-heavy, so the search prunes late and this is close to a worst case.
    const letters = 'AEIORSTNLUCDPMHGBYFVKWZXJ'
    const cells = createHoneycomb(3, 100)
    let index = 0
    for (const cell of cells.values()) cell.letter = letters[index++ % letters.length]!
    const board = toSolverBoard(cells, buildAdjacency(cells))

    const started = performance.now()
    const runs = 20
    for (let i = 0; i < runs; i++) solve(board, dictionary, OPTIONS)
    const perSolve = (performance.now() - started) / runs

    // The generator may try many boards before one passes, so this has to stay cheap.
    expect(perSolve).toBeLessThan(50)
  })
})
