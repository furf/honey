/**
 * Decides whether a word is banned.
 *
 * Split from the list itself so the rules can be tested directly, which matters more
 * here than usual: the failure mode of a blocklist is not missing a word, it is
 * quietly removing innocent ones. "Grape" must survive "rape", "analysis" must survive
 * "anal", and "class" must survive anything at all.
 */

import { allow, exact, fragments, stems } from './banned.mjs'

/**
 * Suffixes that may follow a stem.
 *
 * A remainder only counts as an inflection if it appears here, which is what stops a
 * stem from swallowing every word that happens to begin with the same letters.
 */
const SUFFIXES = [
  '', 's', 'es', 'ed', 'ing', 'er', 'ers', 'est', 'ist', 'ists', 'y', 'ies',
  'ish', 'ness', 'less', 'like', 'ly', 'able', 'ible', 'ings', 'ery', 'eries',
]

/**
 * Suffixes that trigger a spelling change on the stem.
 *
 * Dropping a final "e" or doubling a final consonant is only legitimate before these.
 * Allowing it before every suffix is how "rape" would reach "rapier".
 */
const CHANGING_SUFFIXES = ['ed', 'ing', 'er', 'ers', 'y', 'ist', 'ists', 'able', 'ery']

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u'])

function isSuffix(rest, allowed = SUFFIXES) {
  return allowed.includes(rest)
}

/** True when `word` is `stem` or an inflection of it. */
export function matchesStem(word, stem) {
  if (word === stem) return true

  if (word.startsWith(stem) && isSuffix(word.slice(stem.length))) return true

  // rape -> raping, raped, rapist
  if (stem.endsWith('e')) {
    const trimmed = stem.slice(0, -1)
    if (word.startsWith(trimmed) && isSuffix(word.slice(trimmed.length), CHANGING_SUFFIXES)) {
      return true
    }
  }

  // gypsy -> gypsies, horny -> hornier
  if (stem.endsWith('y')) {
    const trimmed = `${stem.slice(0, -1)}i`
    const YS = ['es', 'ed', 'er', 'ers', 'est', 'ly', 'ness']
    if (word.startsWith(trimmed) && isSuffix(word.slice(trimmed.length), YS)) return true
  }

  // shag -> shagged, shagging
  const last = stem.at(-1)
  const previous = stem.at(-2)
  const beforeThat = stem.at(-3)
  const consonantVowelConsonant =
    last !== undefined &&
    previous !== undefined &&
    beforeThat !== undefined &&
    !VOWELS.has(last) &&
    VOWELS.has(previous) &&
    !VOWELS.has(beforeThat)

  if (consonantVowelConsonant) {
    const doubled = stem + last
    if (word.startsWith(doubled) && isSuffix(word.slice(doubled.length), CHANGING_SUFFIXES)) {
      return true
    }
  }

  return false
}

/**
 * Build a predicate over lower-case words.
 *
 * The allow list is checked first and wins outright, so pardoning collateral never
 * depends on the order rules happen to run in.
 */
export function createBanFilter(lists = { stems, exact, fragments, allow }) {
  // A term listed both ways is a mistake that hides itself: the exact entry looks
  // like it is limiting the match while the stem quietly keeps inflecting. "cock"
  // in both lists took "cocky" with it.
  const overlap = (lists.exact ?? []).filter((word) => lists.stems.includes(word))
  if (overlap.length > 0) {
    throw new Error(`banned list: ${overlap.join(', ')} appears in both stems and exact`)
  }

  const allowed = new Set(lists.allow.map((word) => word.toLowerCase()))
  const exactList = new Set((lists.exact ?? []).map((word) => word.toLowerCase()))
  const stemList = lists.stems.map((word) => word.toLowerCase())
  const fragmentList = lists.fragments.map((word) => word.toLowerCase())

  return function isBanned(raw) {
    const word = raw.toLowerCase()

    if (allowed.has(word)) return false
    if (exactList.has(word)) return true
    if (fragmentList.some((fragment) => word.includes(fragment))) return true
    if (stemList.some((stem) => matchesStem(word, stem))) return true

    return false
  }
}
