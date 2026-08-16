import type { WordPolicy } from './types'
import { lengthOf, tokenise } from './symbols'

/**
 * The standard word policy: a minimum length in letters, with `Qu` counting as two.
 *
 * Minimum length is injected rather than read from config here, because content is a
 * layer below the composition root and must not reach up for its own settings.
 */
export function createWordPolicy(minLetters: number): WordPolicy {
  return { minLetters, tokenise, lengthOf }
}
