import type { Game } from './types'

/**
 * Stings and the end of a game.
 *
 * Shared by the trail (the player swipes into a bee) and by bees (a bee lands on a
 * cell the player is currently holding). Both are the same event from opposite
 * directions, and both must void the drag identically.
 */

/**
 * A sting voids the whole trail, not just the cell it happened on.
 *
 * The player loses the word they were building, so the feedback has to cover every
 * cell they had selected — marking only the point of contact understates what was
 * lost.
 */
export function applySting(game: Game, cellKey: string, beeId: number): void {
  const { state, deps } = game
  const cost = deps.config.clock.stingCostMs
  const cellKeys = state.trail.length > 0 ? [...state.trail] : [cellKey]

  state.trail = []
  // The pointer may still be down; ignore the rest of the gesture until it lifts.
  state.dragVoided = true

  // Clamped at zero rather than allowed to go negative: the clock is a duration, and
  // a sting that would overshoot simply ends the game.
  const lost = Math.min(state.clockMs, cost)
  state.clockMs -= lost

  state.events.push({ kind: 'stung', cellKey, cellKeys, beeId, timeLostMs: lost })

  endIfOutOfTime(game)
}

export function endIfOutOfTime(game: Game): boolean {
  const { state } = game
  if (state.clockMs > 0 || state.screen === 'gameOver') return state.screen === 'gameOver'

  state.screen = 'gameOver'
  state.trail = []
  state.events.push({ kind: 'gameOver', pot: state.pot })
  return true
}
