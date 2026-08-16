/**
 * The dictionary seam.
 *
 * Two lists back this interface: ENABLE validates what a player may score, and a
 * common subset is what the board generator counts when it decides a board is good.
 * Both are packed into one structure, with commonness a flag on the word.
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
