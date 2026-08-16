import type { Cell } from '../../core/types'
import type { Dictionary, BoardAnalysis } from '../../core/ports'
import { SYMBOL_INDEX } from '../dictionary/symbols'

/**
 * Finds every word on a honeycomb.
 *
 * This runs on every board the generator considers and again on every reseed, so it
 * is the hottest code in the project. Two things keep it fast: the dictionary walk is
 * incremental, so a prefix is never re-walked, and the board is flattened to numeric
 * indices so the search never touches a string or a Map in its inner loop.
 */

/** A honeycomb flattened for search. Built once per board, reused across queries. */
export interface SolverBoard {
  /** Dictionary symbol index per cell. */
  readonly symbols: Int32Array
  /** Letters a cell contributes to word length — 2 for `Qu`, otherwise 1. */
  readonly weights: Int32Array
  /** The letter on each cell, for assembling words once one is found. */
  readonly letters: readonly string[]
  /** Neighbour indices per cell. */
  readonly adjacency: readonly Int32Array[]
  /** Cell key per index, so results can be mapped back to the honeycomb. */
  readonly keys: readonly string[]
}

/**
 * Flatten a honeycomb for the solver.
 *
 * A cell whose letter is not a known symbol gets index -1 and can start no word. That
 * happens for an unseeded board, which the generator asks about before filling it.
 */
export function toSolverBoard(
  cells: ReadonlyMap<string, Cell>,
  adjacency: ReadonlyMap<string, string[]>,
): SolverBoard {
  const keys = [...cells.keys()]
  const indexOf = new Map(keys.map((cellKey, index) => [cellKey, index]))

  const symbols = new Int32Array(keys.length)
  const weights = new Int32Array(keys.length)
  const letters: string[] = []

  keys.forEach((cellKey, index) => {
    const letter = cells.get(cellKey)!.letter
    letters.push(letter)
    symbols[index] = SYMBOL_INDEX.get(letter) ?? -1
    weights[index] = letter.length || 1
  })

  const flatAdjacency = keys.map((cellKey) =>
    Int32Array.from((adjacency.get(cellKey) ?? []).map((near) => indexOf.get(near)!)),
  )

  return { symbols, weights, letters, adjacency: flatAdjacency, keys }
}

export interface SolveOptions {
  readonly minLetters: number
  readonly maxLetters: number
}

export interface SolveResult {
  /** Each word found, with cells it can be drawn through. */
  readonly paths: Map<string, number[]>
  /** Which of those words are common. Recorded during the walk, not looked up after. */
  readonly common: Set<string>
}

/**
 * Every distinct word on the board, with the cells each one can be drawn through.
 *
 * A word found by several routes is reported once; the recorded path is whichever the
 * search reached first, which is enough for the generator's purposes.
 */
export function solve(
  board: SolverBoard,
  dictionary: Dictionary,
  options: SolveOptions,
): SolveResult {
  const { walk } = dictionary
  const { symbols, weights, letters, adjacency } = board
  const found = new Map<string, number[]>()
  const common = new Set<string>()

  const visited = new Uint8Array(symbols.length)
  const path = new Int32Array(options.maxLetters)

  const visit = (index: number, node: number, depth: number, lettersSoFar: number): void => {
    const symbol = symbols[index]!
    if (symbol < 0) return

    const edge = walk.step(node, symbol)
    if (edge === -1) return

    const total = lettersSoFar + weights[index]!
    if (total > options.maxLetters) return

    visited[index] = 1
    path[depth] = index

    if (total >= options.minLetters && walk.isWord(edge)) {
      let word = ''
      for (let i = 0; i <= depth; i++) word += letters[path[i]!]!
      // `Qu` is written mixed-case on the cell, so normalise before reporting.
      word = word.toUpperCase()
      if (!found.has(word)) {
        found.set(word, Array.from(path.subarray(0, depth + 1)))
        // Commonness is a flag on the edge we just followed, so it costs nothing
        // here and would cost a second walk per word if asked for later.
        if (walk.isCommon(edge)) common.add(word)
      }
    }

    if (total < options.maxLetters) {
      const next = walk.target(edge)
      for (const neighbour of adjacency[index]!) {
        if (visited[neighbour] === 0) visit(neighbour, next, depth + 1, total)
      }
    }

    visited[index] = 0
  }

  for (let start = 0; start < symbols.length; start++) {
    visit(start, walk.root, 0, 0)
  }

  return { paths: found, common }
}

/** What a board offers, as the generator's invariants need to see it. */
export function analyse(
  board: SolverBoard,
  dictionary: Dictionary,
  options: SolveOptions,
): BoardAnalysis {
  const { paths, common } = solve(board, dictionary, options)

  const commonWords: string[] = []
  let longestWordLength = 0
  const used = new Uint8Array(board.symbols.length)

  for (const [word, cells] of paths) {
    if (word.length > longestWordLength) longestWordLength = word.length
    if (common.has(word)) {
      commonWords.push(word)
      // Only common words count towards coverage. A cell reachable solely by obscure
      // words is a cell the player will never actually use.
      for (const index of cells) used[index] = 1
    }
  }

  const unusedCellKeys: string[] = []
  for (let index = 0; index < used.length; index++) {
    if (used[index] === 0) unusedCellKeys.push(board.keys[index]!)
  }

  return { commonWords, longestWordLength, unusedCellKeys }
}
