import type { Cell, Game } from './types'

/**
 * Taking honey out of a cell, and what happens when it runs out.
 *
 * Shared by harvests and by bee sips, because both deplete cells the same way. That
 * sharing is the mechanism behind a deliberate ambivalence: a bee robs the player,
 * but its sips push cells toward the same empty threshold a harvest does, so bees
 * also refresh the board.
 * See docs/adr/0001-idle-decay-and-capacity-based-honey.md.
 */
export function takeHoney(game: Game, cellKey: string, amount: number): number {
  const cell = game.state.cells.get(cellKey)
  if (!cell) return 0

  const taken = Math.min(cell.honey, amount)
  cell.honey -= amount

  if (cell.honey <= 0) reseed(game, cell, cellKey)

  return taken
}

/** A depleted cell takes a new letter and a full pot of honey. */
function reseed(game: Game, cell: Cell, cellKey: string): void {
  const { state, deps } = game
  const from = cell.letter
  const to = deps.generator.reseedCell(cell, state.cells, deps.rng)

  cell.honey = deps.config.honey.cellCapacity
  state.events.push({ kind: 'cellReseeded', cellKey, from, to })
}
