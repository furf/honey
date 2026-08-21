import type { FoundWord } from '../core/types'

/**
 * The order words are listed in at the end of a game.
 *
 * Longest first, because the best thing the player did should be the first thing they
 * see. Ties break alphabetically rather than by when they were found: a stable order
 * is easier to read down, and discovery order is not information anyone is looking
 * for once the game is over.
 *
 * Ranked by letters, not by characters — `Qu` occupies one cell but reads as two, and
 * the list should agree with what the player sees.
 */
export function sortFound(found: readonly FoundWord[]): FoundWord[] {
  return [...found].sort((a, b) =>
    b.letters - a.letters || a.word.localeCompare(b.word),
  )
}
