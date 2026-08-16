/**
 * Board symbols.
 *
 * A symbol is what one cell can hold. That is not the same as a character: `Qu` is a
 * single symbol occupying one cell but counting as two letters, so tokenising a word
 * is not the same as splitting it, and word length is not trail length.
 *
 * This table must match the one in tools/build-wordlists.mjs. The packed dictionary
 * records the table it was built with, and the dictionary loader checks it, so drift
 * fails loudly rather than silently mis-decoding every word.
 */
export const SYMBOLS: readonly string[] = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'Qu',
]

export const SYMBOL_INDEX: ReadonlyMap<string, number> = new Map(
  SYMBOLS.map((symbol, index) => [symbol, index]),
)

export const QU = 'Qu'
export const QU_INDEX = SYMBOL_INDEX.get(QU)!

/**
 * Symbols that satisfy the generator's vowel floor.
 *
 * `Qu` counts: it ends in a vowel and behaves like one when joining consonants.
 * This belongs to the alphabet rather than to configuration — which letters are
 * vowels is a fact about English, not a number to tune.
 */
export const VOWELS: ReadonlySet<string> = new Set(['A', 'E', 'I', 'O', 'U', 'Qu'])

export function isVowel(symbol: string): boolean {
  return VOWELS.has(symbol)
}

/** Letters a symbol contributes to word length. `Qu` contributes two. */
export function lettersIn(symbol: string): number {
  return symbol.length
}

/**
 * Split a word into board symbols, or null if it cannot be formed.
 *
 * A Q not followed by a U has no tile, so those words are unformable. Boggle makes
 * the same trade rather than spend a cell on a bare Q.
 */
export function tokenise(word: string): number[] | null {
  const upper = word.toUpperCase()
  const symbols: number[] = []

  for (let i = 0; i < upper.length; i++) {
    if (upper[i] === 'Q') {
      if (upper[i + 1] !== 'U') return null
      symbols.push(QU_INDEX)
      i++
      continue
    }
    const index = SYMBOL_INDEX.get(upper[i]!)
    if (index === undefined) return null
    symbols.push(index)
  }

  return symbols
}

/** Letters in a sequence of board symbols, counting `Qu` as two. */
export function lengthOf(symbols: readonly string[]): number {
  let total = 0
  for (const symbol of symbols) total += lettersIn(symbol)
  return total
}
