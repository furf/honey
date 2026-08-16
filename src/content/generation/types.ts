import type { Cell } from '../../core/types'
import type { Rng } from '../../core/rng'

/**
 * The letter-placement seam.
 *
 * Swappable independently of the theme, so two generators can be compared with the
 * presentation held fixed. See docs/adr/0002-layered-architecture.md.
 */
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
