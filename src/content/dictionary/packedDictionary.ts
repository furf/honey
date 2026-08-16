import type { Dictionary, DictionaryWalk } from './types'
import { SYMBOLS, tokenise } from './symbols'

/**
 * Reader for the structure built by tools/build-wordlists.mjs.
 *
 * One edge per uint32:
 *   bits  0-4   symbol index
 *   bit   5     isWord     — a word ends at the target
 *   bit   6     isCommon   — that word is common enough for board generation
 *   bit   7     isLast     — final edge in this node's block
 *   bits  8-31  target     — index of the target's edge block, 0 if it has none
 *
 * Index 0 is a dummy, so a target of 0 unambiguously means "no outgoing edges".
 */

const MAGIC = 0x484f4e59 // "HONY"
const VERSION = 1

const SYMBOL_MASK = 0x1f
const IS_WORD = 1 << 5
const IS_COMMON = 1 << 6
const IS_LAST = 1 << 7
const TARGET_SHIFT = 8

export interface PackedDictionaryMeta {
  readonly symbols: readonly string[]
}

/**
 * Build a dictionary from packed bytes.
 *
 * `meta` is the sidecar written alongside the binary. Its symbol table is compared
 * against this build's, because a mismatch would silently mis-decode every word
 * rather than fail.
 */
export function createPackedDictionary(
  bytes: ArrayBuffer,
  meta?: PackedDictionaryMeta,
): Dictionary {
  const header = new Uint32Array(bytes, 0, 4)
  if (header[0] !== MAGIC) throw new Error('words.bin: not a dictionary file')
  if (header[1] !== VERSION) throw new Error(`words.bin: unsupported version ${header[1]}`)

  const rootOffset = header[2]!
  const edgeCount = header[3]!
  const edges = new Uint32Array(bytes, header.byteLength, edgeCount)

  if (meta && meta.symbols.join(',') !== SYMBOLS.join(',')) {
    throw new Error(
      'words.bin was built with a different symbol table than src/content/dictionary/symbols.ts',
    )
  }

  const walk: DictionaryWalk = {
    root: rootOffset,

    step(node: number, symbolIndex: number): number {
      if (node === 0) return -1
      for (let i = node; i < edges.length; i++) {
        const edge = edges[i]!
        if ((edge & SYMBOL_MASK) === symbolIndex) return edge
        if (edge & IS_LAST) return -1
      }
      return -1
    },

    target: (edge: number): number => edge >>> TARGET_SHIFT,
    isWord: (edge: number): boolean => (edge & IS_WORD) !== 0,
    isCommon: (edge: number): boolean => (edge & IS_COMMON) !== 0,
  }

  /** Follow a whole symbol sequence, returning the final edge or -1. */
  function follow(symbols: readonly number[]): number {
    let node = walk.root
    let edge = -1
    for (const symbol of symbols) {
      edge = walk.step(node, symbol)
      if (edge === -1) return -1
      node = walk.target(edge)
    }
    return edge
  }

  return {
    has(word: string): boolean {
      const symbols = tokenise(word)
      if (symbols === null || symbols.length === 0) return false
      const edge = follow(symbols)
      return edge !== -1 && walk.isWord(edge)
    },

    isCommon(word: string): boolean {
      const symbols = tokenise(word)
      if (symbols === null || symbols.length === 0) return false
      const edge = follow(symbols)
      return edge !== -1 && walk.isWord(edge) && walk.isCommon(edge)
    },

    hasPrefix(prefix: string): boolean {
      const symbols = tokenise(prefix)
      if (symbols === null) return false
      if (symbols.length === 0) return true
      return follow(symbols) !== -1
    },

    walk,
  }
}
