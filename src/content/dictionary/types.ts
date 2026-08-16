/**
 * The dictionary seam.
 *
 * Two lists back this interface: ENABLE validates what a player may score, and a
 * common subset is what the board generator counts when it decides a board is good.
 * See docs/adr/0003-two-word-lists.md.
 */
export interface Dictionary {
  /** Whether a word may be scored. */
  has(word: string): boolean
  /** Whether any word starts with this prefix — the solver's hot path. */
  hasPrefix(prefix: string): boolean
  /** Whether a word is common enough for the generator to count it. */
  isCommon(word: string): boolean
}

/**
 * How words are split into board letters.
 *
 * `Qu` occupies one cell but counts as two letters, so tokenising is not the same as
 * splitting characters, and word length is not the same as trail length.
 */
export interface WordPolicy {
  /** Split a word into board letters, or null if it cannot be formed. */
  tokenise(word: string): string[] | null
  /** Letters in a word, counting `Qu` as two. */
  lengthOf(letters: readonly string[]): number
}
