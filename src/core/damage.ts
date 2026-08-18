import { clampHealth } from './health'
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
  const cost = deps.config.health.stingCost
  const cellKeys = state.trail.length > 0 ? [...state.trail] : [cellKey]

  state.trail = []
  // The pointer may still be down; ignore the rest of the gesture until it lifts.
  state.dragVoided = true
  state.health = clampHealth(state.health - cost, deps.config)

  state.events.push({ kind: 'stung', cellKey, cellKeys, beeId, healthLost: cost })

  endIfDead(game)
}

export function endIfDead(game: Game): boolean {
  const { state } = game
  if (state.health > 0 || state.screen === 'gameOver') return state.screen === 'gameOver'

  state.screen = 'gameOver'
  state.trail = []
  state.events.push({ kind: 'gameOver', pot: state.pot })
  return true
}
