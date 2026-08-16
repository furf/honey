/**
 * Ports: the interfaces the rules depend on, implemented in the content layer.
 *
 * These live in core rather than alongside their implementations because the rules
 * are what require them. The core judges words, so it owns the shape of a dictionary;
 * the core reseeds cells, so it owns the shape of a letter generator. Content
 * supplies adapters that satisfy these, and can be swapped without the rules noticing.
 *
 * See docs/adr/0002-layered-architecture.md.
 */

import type { Cell } from './types'
import type { Rng } from './rng'

/**
 * Two lists back this port: ENABLE validates what a player may score, and a common
 * subset is what the board generator counts when deciding a board is good.
 * See docs/adr/0003-two-word-lists.md.
 */
export interface Dictionary {
  /** Whether a word may be scored. */
  has(word: string): boolean
  /** Whether any word starts with this prefix. */
  hasPrefix(prefix: string): boolean
  /** Whether a word is common enough for the generator to count it. */
  isCommon(word: string): boolean
  /** Allocation-free traversal, for the solver. */
  readonly walk: DictionaryWalk
}

/**
 * A cursor-free walk over the packed dictionary.
 *
 * The solver extends a prefix one symbol at a time across millions of partial paths,
 * so it must not allocate per step. Positions are plain numbers and edges are packed
 * integers, which is why this is lower-level than the rest of the seam.
 */
export interface DictionaryWalk {
  /** Starting position. */
  readonly root: number
  /** Packed edge leaving `node` by `symbolIndex`, or -1 if no word continues. */
  step(node: number, symbolIndex: number): number
  /** Position reached by following an edge. */
  target(edge: number): number
  /** Whether a word ends at this edge's target. */
  isWord(edge: number): boolean
  /** Whether that word is common. Meaningless unless `isWord` is also true. */
  isCommon(edge: number): boolean
}

/**
 * How words are split into board letters.
 *
 * `Qu` occupies one cell but counts as two letters, so tokenising is not the same as
 * splitting characters, and word length is not the same as trail length.
 */
export interface WordPolicy {
  /** Shortest scoring word, in letters. */
  readonly minLetters: number
  /** Split a word into board symbols, or null if it cannot be formed. */
  tokenise(word: string): number[] | null
  /** Letters in a sequence of board symbols, counting `Qu` as two. */
  lengthOf(symbols: readonly string[]): number
}

/** The letter-placement port, swappable independently of the theme. */
export interface LetterGenerator {
  readonly id: string

  /**
   * Fill an empty honeycomb, retrying until the board satisfies every invariant in
   * config.generation.
   */
  seedHoneycomb(cells: Map<string, Cell>, rng: Rng): void

  /**
   * Choose a replacement letter for a depleted cell.
   *
   * Candidates are scored both by how many new words they create and by how different
   * they are from the cell's recent history, so a cell that reseeds repeatedly does
   * not keep returning the same letter.
   */
  reseedCell(cell: Cell, cells: Map<string, Cell>, rng: Rng): string
}

/** What a board offers, as measured by the solver. */
export interface BoardAnalysis {
  readonly commonWords: readonly string[]
  readonly longestWordLength: number
  /** Keys of cells that appear in no word at all. */
  readonly unusedCellKeys: readonly string[]
}
