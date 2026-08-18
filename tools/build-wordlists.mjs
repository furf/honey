#!/usr/bin/env node
/**
 * Builds the packed dictionary from two source lists.
 *
 * ENABLE decides what a player may score. Google Web Trillion Word Corpus counts
 * decide which of those words are common enough for the board generator to count as
 * "findable". Both inputs are build-time only and never ship — only the packed output
 * does. See docs/adr/0003-two-word-lists.md.
 *
 * Inputs (download with tools/fetch-wordlists.sh):
 *   tools/wordlists/raw/enable1.txt
 *   tools/wordlists/raw/count_1w.txt
 *
 * Output:
 *   src/content/dictionary/data/words.bin
 *   src/content/dictionary/data/words.meta.json
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const RAW = resolve(ROOT, 'tools/wordlists/raw')
const OUT = resolve(ROOT, 'src/content/dictionary/data')

/** Must match config.words. Kept here because the build runs outside the app. */
const MIN_LETTERS = 4
const MAX_LETTERS = 9

/**
 * How many of the most frequent words count as "common" for board generation.
 *
 * Tightened from 30,000: web-corpus frequency inflates place names and acronyms, so
 * the tail of a larger list carries oddities like RAIA and TAOS that a player will
 * never look for. This only governs which words the generator counts as findable —
 * every ENABLE word remains scorable.
 */
const COMMON_TARGET = 20_000

// ---------------------------------------------------------------------------
// Board symbols
// ---------------------------------------------------------------------------

/**
 * `Qu` is a single board symbol occupying one cell but counting as two letters.
 * Words with a Q not followed by a U therefore cannot be formed at all.
 */
export const SYMBOLS = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'Qu',
]

const SYMBOL_INDEX = new Map(SYMBOLS.map((symbol, index) => [symbol, index]))

// Derived, never hardcoded: the table has no bare Q, so Qu is not at index 26.
const QU_INDEX = SYMBOL_INDEX.get('Qu')

/** Split a word into board symbols, or null if it cannot be formed. */
function tokenise(word) {
  const symbols = []
  for (let i = 0; i < word.length; i++) {
    if (word[i] === 'Q') {
      // A bare Q has no tile. Boggle makes the same trade rather than spend a cell.
      if (word[i + 1] !== 'U') return null
      symbols.push(QU_INDEX)
      i++
      continue
    }
    const index = SYMBOL_INDEX.get(word[i])
    if (index === undefined) return null
    symbols.push(index)
  }
  return symbols
}

// ---------------------------------------------------------------------------
// Source lists
// ---------------------------------------------------------------------------

function readEnable() {
  const lines = readFileSync(resolve(RAW, 'enable1.txt'), 'utf8').split('\n')
  const words = []
  for (const line of lines) {
    const word = line.trim().toUpperCase()
    if (word.length < MIN_LETTERS || word.length > MAX_LETTERS) continue
    if (!/^[A-Z]+$/.test(word)) continue
    const symbols = tokenise(word)
    if (symbols === null) continue
    words.push({ word, symbols })
  }
  return words
}

function readFrequencies() {
  const text = readFileSync(resolve(RAW, 'count_1w.txt'), 'utf8')
  const counts = new Map()
  for (const line of text.split('\n')) {
    const tab = line.indexOf('\t')
    if (tab < 0) continue
    const word = line.slice(0, tab).trim().toUpperCase()
    const count = Number(line.slice(tab + 1).trim())
    if (!Number.isFinite(count)) continue
    // The corpus is case-folded to a single entry per spelling; keep the largest.
    if (!counts.has(word) || counts.get(word) < count) counts.set(word, count)
  }
  return counts
}

// ---------------------------------------------------------------------------
// DAWG construction (Daciuk incremental minimisation)
// ---------------------------------------------------------------------------

class Node {
  constructor() {
    this.edges = new Map() // symbol index -> Node
    this.isWord = false
    this.isCommon = false
    this.id = -1
  }

  /**
   * Two nodes are interchangeable only if they agree on both flags and on every
   * outgoing edge. Commonness participates because it is stored on the node.
   */
  signature() {
    const parts = [this.isWord ? '1' : '0', this.isCommon ? '1' : '0']
    for (const [symbol, child] of this.edges) parts.push(`${symbol}:${child.id}`)
    return parts.join('|')
  }
}

function buildDawg(entries) {
  const root = new Node()
  const register = new Map()
  let nextId = 0
  let previous = []

  const replaceOrRegister = (node) => {
    const lastSymbol = [...node.edges.keys()].at(-1)
    if (lastSymbol === undefined) return
    const child = node.edges.get(lastSymbol)

    if (child.edges.size > 0) replaceOrRegister(child)

    const signature = child.signature()
    const existing = register.get(signature)
    if (existing !== undefined) {
      node.edges.set(lastSymbol, existing)
    } else {
      child.id = nextId++
      register.set(signature, child)
    }
  }

  for (const { symbols, isCommon } of entries) {
    // Walk down the prefix this word shares with the previous one.
    let shared = 0
    while (
      shared < symbols.length &&
      shared < previous.length &&
      symbols[shared] === previous[shared]
    ) {
      shared++
    }

    let node = root
    for (let i = 0; i < shared; i++) node = node.edges.get(symbols[i])

    // Everything below that point is now final and can be minimised.
    if (node.edges.size > 0) replaceOrRegister(node)

    for (let i = shared; i < symbols.length; i++) {
      const child = new Node()
      node.edges.set(symbols[i], child)
      node = child
    }
    node.isWord = true
    node.isCommon = isCommon

    previous = symbols
  }

  replaceOrRegister(root)
  root.id = nextId++

  return root
}

// ---------------------------------------------------------------------------
// Serialisation
// ---------------------------------------------------------------------------

/**
 * One edge per uint32:
 *   bits  0-4   symbol index (0..26)
 *   bit   5     isWord     — a word ends at the target
 *   bit   6     isCommon   — that word is common enough for board generation
 *   bit   7     isLast     — final edge in this node's block
 *   bits  8-31  target     — index of the target's edge block, 0 if it has none
 *
 * Index 0 is a dummy so that target 0 unambiguously means "no outgoing edges".
 * Nothing ever points at the root, so the root may live anywhere after it.
 */
function serialise(root) {
  const nodes = []
  const seen = new Set()

  const collect = (node) => {
    if (seen.has(node)) return
    seen.add(node)
    nodes.push(node)
    for (const child of node.edges.values()) collect(child)
  }
  collect(root)

  // Lay out blocks first so every target offset is known before writing edges.
  const offsets = new Map()
  let cursor = 1
  for (const node of nodes) {
    if (node.edges.size === 0) {
      offsets.set(node, 0)
      continue
    }
    offsets.set(node, cursor)
    cursor += node.edges.size
  }

  const edges = new Uint32Array(cursor)
  for (const node of nodes) {
    if (node.edges.size === 0) continue
    let index = offsets.get(node)
    const entries = [...node.edges.entries()].sort((a, b) => a[0] - b[0])
    entries.forEach(([symbol, child], position) => {
      const isLast = position === entries.length - 1
      edges[index++] =
        (symbol & 0x1f) |
        (child.isWord ? 1 << 5 : 0) |
        (child.isCommon ? 1 << 6 : 0) |
        (isLast ? 1 << 7 : 0) |
        (offsets.get(child) << 8)
    })
  }

  return { edges, rootOffset: offsets.get(root), nodeCount: nodes.length }
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

// The symbol table deliberately has no bare Q, so indices are not alphabet positions.
if (SYMBOLS.includes('Q')) throw new Error('symbol table must not contain a bare Q')
if (QU_INDEX === undefined) throw new Error('symbol table must contain Qu')
if (SYMBOLS.length > 32) throw new Error('symbol index must fit in 5 bits')

console.error('Reading ENABLE...')
const enable = readEnable()
console.error(`  ${enable.length.toLocaleString()} words of ${MIN_LETTERS}-${MAX_LETTERS} letters`)

console.error('Reading frequency counts...')
const counts = readFrequencies()

// Rank the playable words by corpus frequency and keep the top slice as "common".
const ranked = enable
  .filter((entry) => counts.has(entry.word))
  .sort((a, b) => counts.get(b.word) - counts.get(a.word))

const commonWords = new Set(ranked.slice(0, COMMON_TARGET).map((entry) => entry.word))
console.error(`  ${commonWords.size.toLocaleString()} common words`)

if (ranked.length < COMMON_TARGET) {
  console.error(
    `  warning: only ${ranked.length.toLocaleString()} playable words have frequency data`,
  )
}

console.error('Building DAWG...')
// Daciuk's algorithm requires input sorted by symbol sequence, not by spelling.
const entries = enable
  .map((entry) => ({ ...entry, isCommon: commonWords.has(entry.word) }))
  .sort((a, b) => {
    const length = Math.min(a.symbols.length, b.symbols.length)
    for (let i = 0; i < length; i++) {
      if (a.symbols[i] !== b.symbols[i]) return a.symbols[i] - b.symbols[i]
    }
    return a.symbols.length - b.symbols.length
  })

const root = buildDawg(entries)
const { edges, rootOffset, nodeCount } = serialise(root)

console.error(`  ${nodeCount.toLocaleString()} nodes, ${edges.length.toLocaleString()} edges`)

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

/**
 * Decode the packed structure independently of how it was written, and confirm every
 * word survives the round trip.
 *
 * The raw inputs are far too large to commit, so this is the only place the full list
 * can be checked. A committed fixture covers the reader in CI; this covers the build.
 */
function verify(edges, rootOffset, allEntries, commonSet) {
  const follow = (symbols) => {
    let node = rootOffset
    let edge = -1
    for (const symbol of symbols) {
      if (node === 0) return -1
      let found = -1
      for (let i = node; i < edges.length; i++) {
        const candidate = edges[i]
        if ((candidate & 0x1f) === symbol) {
          found = candidate
          break
        }
        if (candidate & (1 << 7)) break
      }
      if (found === -1) return -1
      edge = found
      node = found >>> 8
    }
    return edge
  }

  let checked = 0
  for (const { word, symbols } of allEntries) {
    const edge = follow(symbols)
    if (edge === -1 || !(edge & (1 << 5))) {
      throw new Error(`round trip failed: "${word}" is missing from the packed dictionary`)
    }
    const isCommon = (edge & (1 << 6)) !== 0
    if (isCommon !== commonSet.has(word)) {
      throw new Error(`round trip failed: "${word}" commonness is ${isCommon}, expected ${!isCommon}`)
    }
    checked++
  }

  // Qu words checked by name. They exercise the one symbol whose index is not its
  // position in the alphabet, which is where an encoding mistake will hide.
  for (const word of ['QUIT', 'QUEST', 'AQUAS', 'QUALIFY', 'CASQUED']) {
    const symbols = tokenise(word)
    if (symbols === null) throw new Error(`"${word}" should tokenise`)
    const edge = follow(symbols)
    if (edge === -1 || !(edge & (1 << 5))) {
      throw new Error(`round trip failed: Qu word "${word}" is missing`)
    }
  }

  // Words that must not be present, to catch a structure that accepts everything.
  const absent = ['ZZZZ', 'QQQQ', 'ABCDEFGH', 'XYZZY', 'QATS', 'QOPH', 'QINDARS']
  for (const word of absent) {
    const symbols = tokenise(word)
    if (symbols === null) continue
    const edge = follow(symbols)
    if (edge !== -1 && edge & (1 << 5)) {
      throw new Error(`round trip failed: "${word}" should not be a word`)
    }
  }

  return checked
}

console.error('Verifying...')
const verified = verify(edges, rootOffset, entries, commonWords)
console.error(`  ${verified.toLocaleString()} words round-tripped`)

mkdirSync(OUT, { recursive: true })

// Header: magic, version, rootOffset, edgeCount. Then the edge array.
const header = new Uint32Array([0x484f4e59, 1, rootOffset, edges.length])
const output = new Uint8Array(header.byteLength + edges.byteLength)
output.set(new Uint8Array(header.buffer), 0)
output.set(new Uint8Array(edges.buffer), header.byteLength)

writeFileSync(resolve(OUT, 'words.bin'), output)

// ---------------------------------------------------------------------------
// Adjacency statistics
// ---------------------------------------------------------------------------

/**
 * How often each symbol follows each other symbol, across the common words.
 *
 * The board generator uses this to place letters whose neighbours are letters that
 * actually follow them in English, so a path across the honeycomb spells plausible
 * fragments rather than noise. Counted over common words only: bigrams from words no
 * player will look for are not the ones worth arranging the board around.
 */
function buildBigrams(commonEntries) {
  const size = SYMBOLS.length
  const counts = new Float64Array(size * size)

  for (const { symbols } of commonEntries) {
    for (let i = 1; i < symbols.length; i++) {
      counts[symbols[i - 1] * size + symbols[i]] += 1
    }
  }

  // Conditional log-probability with add-one smoothing, so an unseen pair scores
  // badly rather than being impossible — the generator needs a gradient, not a wall.
  const logProbs = new Array(size * size).fill(0)
  for (let from = 0; from < size; from++) {
    let total = 0
    for (let to = 0; to < size; to++) total += counts[from * size + to] + 1
    for (let to = 0; to < size; to++) {
      logProbs[from * size + to] = Math.log((counts[from * size + to] + 1) / total)
    }
  }

  return logProbs.map((value) => Math.round(value * 1000) / 1000)
}

const commonEntries = entries.filter((entry) => commonWords.has(entry.word))
writeFileSync(
  resolve(OUT, 'bigrams.json'),
  `${JSON.stringify({ symbols: SYMBOLS, logProbs: buildBigrams(commonEntries) })}\n`,
)
console.error(`  bigrams over ${commonEntries.length.toLocaleString()} common words`)

const meta = {
  generatedBy: 'tools/build-wordlists.mjs',
  validationSource: 'ENABLE (enable1.txt), public domain',
  frequencySource: 'Google Web Trillion Word Corpus counts (count_1w.txt), build-time only',
  minLetters: MIN_LETTERS,
  maxLetters: MAX_LETTERS,
  wordCount: enable.length,
  commonCount: commonWords.size,
  nodeCount,
  edgeCount: edges.length,
  bytes: output.byteLength,
  symbols: SYMBOLS,
}
writeFileSync(resolve(OUT, 'words.meta.json'), `${JSON.stringify(meta, null, 2)}\n`)

// A committed sample so the reader is covered in CI, where the raw inputs are absent.
// Evenly spaced through the sorted list rather than random, so it is reproducible and
// spans the whole structure instead of clustering.
const SAMPLE_SIZE = 1500
const stride = Math.max(1, Math.floor(entries.length / SAMPLE_SIZE))
const sample = []
for (let i = 0; i < entries.length; i += stride) {
  const entry = entries[i]
  sample.push({ word: entry.word, common: commonWords.has(entry.word) })
}

const fixture = {
  note: 'Generated by tools/build-wordlists.mjs. Do not edit by hand.',
  words: sample,
  absent: ['ZZZZ', 'QQQQ', 'ABCDEFGH', 'XYZZY', 'BLORP', 'FLIMSILYY'],
  // Present in ENABLE but unformable, because a bare Q has no tile.
  unformable: ['QAT', 'QOPH', 'QINDAR', 'FAQIR', 'NIQAB', 'TRANQ'],
  // Outside the length bounds, so deliberately excluded from the build.
  outOfRange: ['CAT', 'AA', 'ANTIDISESTABLISHMENT'],
}
writeFileSync(resolve(OUT, 'words.fixture.json'), `${JSON.stringify(fixture, null, 2)}\n`)

console.error(`Wrote ${(output.byteLength / 1024).toFixed(0)} KB to src/content/dictionary/data/`)
