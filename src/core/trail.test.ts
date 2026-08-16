import { describe, expect, it } from 'vitest'
import { buildAdjacency, createHoneycomb } from './honeycomb'
import { key } from './hex'
import { judgeTrail, lettersIn, stepTrail, wordOf } from './trail'
import { stubDictionary } from './testSupport'
import type { Cell } from './types'

const CENTRE = key({ q: 0, r: 0 })
const EAST = key({ q: 1, r: 0 })
const NORTH_EAST = key({ q: 1, r: -1 })
const WEST = key({ q: -1, r: 0 })
const FAR = key({ q: 3, r: 0 })

function board(letters: Record<string, string> = {}) {
  const cells = createHoneycomb(3, 100)
  for (const cell of cells.values()) cell.letter = 'Z'
  for (const [at, letter] of Object.entries(letters)) cells.get(at)!.letter = letter
  return { cells, adjacency: buildAdjacency(cells) }
}

describe('stepTrail', () => {
  const { adjacency } = board()

  it('starts a trail on an empty one', () => {
    const result = stepTrail([], CENTRE, adjacency)
    expect(result).toEqual({ trail: [CENTRE], effect: 'started' })
  })

  it('extends into an adjacent cell', () => {
    const result = stepTrail([CENTRE], EAST, adjacency)
    expect(result.effect).toBe('extended')
    expect(result.trail).toEqual([CENTRE, EAST])
  })

  it('ignores a cell that is not adjacent', () => {
    const result = stepTrail([CENTRE], FAR, adjacency)
    expect(result.effect).toBe('ignored')
    expect(result.trail).toEqual([CENTRE])
  })

  it('does not interpolate a flick across the board', () => {
    // A fast drag can skip cells. Inventing the path between them would draw a word
    // the player never traced.
    const result = stepTrail([CENTRE, EAST], FAR, adjacency)
    expect(result.trail).toEqual([CENTRE, EAST])
  })

  it('removes the last cell when dragged back onto the previous one', () => {
    const result = stepTrail([CENTRE, EAST, NORTH_EAST], EAST, adjacency)
    expect(result.effect).toBe('backtracked')
    expect(result.trail).toEqual([CENTRE, EAST])
  })

  it('backtracks all the way to a single cell', () => {
    let trail = [CENTRE, EAST]
    trail = stepTrail(trail, CENTRE, adjacency).trail
    expect(trail).toEqual([CENTRE])
  })

  it('refuses to revisit a cell that is not the previous one', () => {
    const result = stepTrail([CENTRE, EAST, NORTH_EAST], CENTRE, adjacency)
    expect(result.effect).toBe('ignored')
    expect(result.trail).toEqual([CENTRE, EAST, NORTH_EAST])
  })

  it('ignores staying on the same cell', () => {
    const result = stepTrail([CENTRE, EAST], EAST, adjacency)
    expect(result.effect).toBe('ignored')
    expect(result.trail).toEqual([CENTRE, EAST])
  })

  it('never produces a trail with a repeated cell', () => {
    const { adjacency: adj } = board()
    let trail: string[] = []
    const visits = [CENTRE, EAST, NORTH_EAST, CENTRE, WEST, EAST, NORTH_EAST]
    for (const at of visits) trail = stepTrail(trail, at, adj).trail
    expect(new Set(trail).size).toBe(trail.length)
  })
})

describe('wordOf and lettersIn', () => {
  it('reads letters in trail order', () => {
    const { cells } = board({ [CENTRE]: 'T', [EAST]: 'E', [NORTH_EAST]: 'A' })
    expect(wordOf([CENTRE, EAST, NORTH_EAST], cells)).toBe('TEA')
  })

  it('counts Qu as two letters across one cell', () => {
    const { cells } = board({ [CENTRE]: 'Qu', [EAST]: 'I', [NORTH_EAST]: 'T' })
    const trail = [CENTRE, EAST, NORTH_EAST]
    expect(wordOf(trail, cells)).toBe('QUIT')
    expect(trail).toHaveLength(3)
    expect(lettersIn(trail, cells)).toBe(4)
  })

  it('reports zero letters for an empty trail', () => {
    const { cells } = board()
    expect(lettersIn([], cells)).toBe(0)
  })
})

describe('judgeTrail', () => {
  const dictionary = stubDictionary(['TEAM', 'QUIT'])
  const played = new Set<string>()

  function judge(cells: ReadonlyMap<string, Cell>, trail: string[], seen = played) {
    return judgeTrail(trail, cells, dictionary, 4, seen)
  }

  it('scores a valid word', () => {
    const { cells } = board({
      [CENTRE]: 'T',
      [EAST]: 'E',
      [NORTH_EAST]: 'A',
      [WEST]: 'M',
    })
    expect(judge(cells, [CENTRE, EAST, NORTH_EAST, WEST])).toEqual({
      kind: 'scored',
      word: 'TEAM',
    })
  })

  it('rejects a trail below the minimum length', () => {
    const { cells } = board({ [CENTRE]: 'T', [EAST]: 'E', [NORTH_EAST]: 'A' })
    expect(judge(cells, [CENTRE, EAST, NORTH_EAST]).kind).toBe('rejected')
    expect(judge(cells, [CENTRE, EAST, NORTH_EAST])).toMatchObject({ reason: 'tooShort' })
  })

  it('accepts a four-letter word drawn across three cells', () => {
    // Qu is the reason length is counted in letters rather than cells.
    const { cells } = board({ [CENTRE]: 'Qu', [EAST]: 'I', [NORTH_EAST]: 'T' })
    expect(judge(cells, [CENTRE, EAST, NORTH_EAST])).toEqual({ kind: 'scored', word: 'QUIT' })
  })

  it('rejects a word already played this game', () => {
    const { cells } = board({
      [CENTRE]: 'T',
      [EAST]: 'E',
      [NORTH_EAST]: 'A',
      [WEST]: 'M',
    })
    const seen = new Set(['TEAM'])
    expect(judge(cells, [CENTRE, EAST, NORTH_EAST, WEST], seen)).toMatchObject({
      reason: 'alreadyPlayed',
    })
  })

  it('rejects letters that are not a word', () => {
    const { cells } = board({ [CENTRE]: 'Z', [EAST]: 'Z', [NORTH_EAST]: 'Z', [WEST]: 'Z' })
    expect(judge(cells, [CENTRE, EAST, NORTH_EAST, WEST])).toMatchObject({ reason: 'notAWord' })
  })

  it('reports too short before already played', () => {
    // A short trail is a change of mind, and must never be treated as a duplicate.
    const { cells } = board({ [CENTRE]: 'T', [EAST]: 'E', [NORTH_EAST]: 'A' })
    const seen = new Set(['TEA'])
    expect(judge(cells, [CENTRE, EAST, NORTH_EAST], seen)).toMatchObject({ reason: 'tooShort' })
  })

  it('reports already played before not a word', () => {
    const { cells } = board({ [CENTRE]: 'Z', [EAST]: 'Z', [NORTH_EAST]: 'Z', [WEST]: 'Z' })
    const seen = new Set(['ZZZZ'])
    expect(judge(cells, [CENTRE, EAST, NORTH_EAST, WEST], seen)).toMatchObject({
      reason: 'alreadyPlayed',
    })
  })
})
