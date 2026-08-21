import type { Cell } from './types'
import type { Dictionary } from './ports'

/**
 * Trail rules: how a drag becomes a word.
 *
 * A trail is the ordered run of cells under an in-progress drag. These functions are
 * pure — they take a trail and return a new one — so every rule below is testable
 * without a board, a pointer, or a frame.
 *
 * See docs/design/gameplay.md.
 */

export type TrailEffect = 'started' | 'extended' | 'backtracked' | 'ignored'

export interface TrailStep {
  readonly trail: string[]
  readonly effect: TrailEffect
}

/**
 * Move a trail onto a cell.
 *
 * Dragging onto a cell already in the trail truncates the trail to end there. That is
 * how a player corrects a mis-drag, and it is one movement rather than one per cell:
 * having drawn S-T-I-N-G-E-R, dropping back onto the I leaves S-T-I.
 *
 * Truncation deliberately does not require adjacency. A finger moving back across the
 * board covers several cells between the samples the pointer actually reports, so the
 * cell it lands on is frequently nowhere near the one it left. Requiring adjacency
 * would make the correction work only when it happened to be drawn slowly.
 *
 * A step to a non-adjacent cell that is *not* in the trail is ignored rather than
 * interpolated. A fast flick across the board would otherwise invent a path the
 * player never drew.
 */
export function stepTrail(
  trail: readonly string[],
  cellKey: string,
  adjacency: ReadonlyMap<string, readonly string[]>,
): TrailStep {
  if (trail.length === 0) return { trail: [cellKey], effect: 'started' }

  const last = trail[trail.length - 1]!
  if (cellKey === last) return { trail: [...trail], effect: 'ignored' }

  // Checked before adjacency: a truncation is a move backwards through cells the
  // player already chose, so where their finger currently is does not constrain it.
  // Stepping onto the immediately previous cell is this same rule at one position.
  const at = trail.indexOf(cellKey)
  if (at !== -1) return { trail: trail.slice(0, at + 1), effect: 'backtracked' }

  const near = adjacency.get(last)
  if (!near || !near.includes(cellKey)) return { trail: [...trail], effect: 'ignored' }

  return { trail: [...trail, cellKey], effect: 'extended' }
}

/** The word a trail spells. `Qu` contributes two characters from one cell. */
export function wordOf(trail: readonly string[], cells: ReadonlyMap<string, Cell>): string {
  let word = ''
  for (const cellKey of trail) word += cells.get(cellKey)?.letter ?? ''
  return word.toUpperCase()
}

/**
 * Letters in a trail, which is not the same as the number of cells.
 *
 * A four-letter word containing `Qu` spans only three cells, and it is the letters
 * that must clear the minimum.
 */
export function lettersIn(trail: readonly string[], cells: ReadonlyMap<string, Cell>): number {
  let total = 0
  for (const cellKey of trail) total += cells.get(cellKey)?.letter.length ?? 0
  return total
}

export type Verdict =
  | { readonly kind: 'scored'; readonly word: string }
  | {
      readonly kind: 'rejected'
      readonly reason: 'tooShort' | 'alreadyPlayed' | 'notAWord'
      readonly word: string
    }

/**
 * Judge a released trail.
 *
 * Order matters and mirrors what the player did. Too short comes first and carries no
 * penalty — they evidently changed their mind. Already-played is separated from
 * not-a-word because the player did find a real word, and telling them so is the
 * difference between feedback and a shrug.
 *
 * Stings are not judged here: they resolve the moment the trail touches a bee, so a
 * stung trail never reaches release.
 */
export function judgeTrail(
  trail: readonly string[],
  cells: ReadonlyMap<string, Cell>,
  dictionary: Dictionary,
  minLetters: number,
  played: ReadonlySet<string>,
): Verdict {
  const word = wordOf(trail, cells)

  if (lettersIn(trail, cells) < minLetters) return { kind: 'rejected', reason: 'tooShort', word }
  if (played.has(word)) return { kind: 'rejected', reason: 'alreadyPlayed', word }
  if (!dictionary.has(word)) return { kind: 'rejected', reason: 'notAWord', word }

  return { kind: 'scored', word }
}
