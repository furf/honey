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
 * Dragging back onto the immediately previous cell removes the last cell rather than
 * adding it, which is how a player corrects a mis-drag. Any other cell already in the
 * trail is refused, because a word may not reuse a cell.
 *
 * A step to a non-adjacent cell is ignored rather than interpolated. A fast flick
 * across the board would otherwise invent a path the player never drew.
 */
export function stepTrail(
  trail: readonly string[],
  cellKey: string,
  adjacency: ReadonlyMap<string, readonly string[]>,
): TrailStep {
  if (trail.length === 0) return { trail: [cellKey], effect: 'started' }

  const last = trail[trail.length - 1]!
  if (cellKey === last) return { trail: [...trail], effect: 'ignored' }

  // Checked before the revisit rule, because the previous cell is itself in the trail.
  if (trail.length >= 2 && cellKey === trail[trail.length - 2]) {
    return { trail: trail.slice(0, -1), effect: 'backtracked' }
  }

  if (trail.includes(cellKey)) return { trail: [...trail], effect: 'ignored' }

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
