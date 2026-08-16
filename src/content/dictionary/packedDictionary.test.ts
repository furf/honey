import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { createPackedDictionary } from './packedDictionary'
import { SYMBOLS, lengthOf, tokenise } from './symbols'
import type { Dictionary } from './types'

const DATA = resolve(dirname(fileURLToPath(import.meta.url)), 'data')

function readBinary(name: string): ArrayBuffer {
  const buffer = readFileSync(resolve(DATA, name))
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
}

function readJson<T>(name: string): T {
  return JSON.parse(readFileSync(resolve(DATA, name), 'utf8')) as T
}

interface Fixture {
  words: { word: string; common: boolean }[]
  absent: string[]
  unformable: string[]
  outOfRange: string[]
}

interface Meta {
  symbols: string[]
  wordCount: number
  commonCount: number
}

let dictionary: Dictionary
let fixture: Fixture
let meta: Meta

beforeAll(() => {
  meta = readJson<Meta>('words.meta.json')
  fixture = readJson<Fixture>('words.fixture.json')
  dictionary = createPackedDictionary(readBinary('words.bin'), meta)
})

describe('packed dictionary', () => {
  it('accepts every word in the sample', () => {
    const missing = fixture.words.filter(({ word }) => !dictionary.has(word)).map((w) => w.word)
    expect(missing).toEqual([])
  })

  it('agrees with the sample on which words are common', () => {
    const disagreements = fixture.words
      .filter(({ word, common }) => dictionary.isCommon(word) !== common)
      .map(({ word, common }) => `${word} expected ${common}`)
    expect(disagreements).toEqual([])
  })

  it('rejects words that are not words', () => {
    for (const word of fixture.absent) expect(dictionary.has(word)).toBe(false)
  })

  it('rejects words containing a Q not followed by a U', () => {
    // These are real ENABLE words, but a bare Q has no tile, so they cannot be formed.
    for (const word of fixture.unformable) expect(dictionary.has(word)).toBe(false)
  })

  it('rejects words outside the configured length bounds', () => {
    for (const word of fixture.outOfRange) expect(dictionary.has(word)).toBe(false)
  })

  it('recognises prefixes of real words', () => {
    for (const { word } of fixture.words.slice(0, 200)) {
      for (let length = 1; length <= word.length; length++) {
        // A prefix ending on a bare Q is not tokenisable, so skip those.
        const prefix = word.slice(0, length)
        if (prefix.endsWith('Q')) continue
        expect(dictionary.hasPrefix(prefix)).toBe(true)
      }
    }
  })

  it('rejects prefixes no word starts with', () => {
    for (const prefix of ['ZZ', 'QQ', 'XQ', 'JXV']) {
      expect(dictionary.hasPrefix(prefix)).toBe(false)
    }
  })

  it('treats the empty prefix as present', () => {
    expect(dictionary.hasPrefix('')).toBe(true)
  })

  it('refuses a binary built with a different symbol table', () => {
    expect(() =>
      createPackedDictionary(readBinary('words.bin'), { symbols: ['A', 'B'] }),
    ).toThrow(/symbol table/)
  })

  it('refuses a file that is not a dictionary', () => {
    const notADictionary = new Uint32Array([0xdeadbeef, 1, 1, 0]).buffer
    expect(() => createPackedDictionary(notADictionary)).toThrow(/not a dictionary/)
  })
})

describe('walk', () => {
  it('reaches the same verdict as has() for a known word', () => {
    const { walk } = dictionary
    const symbols = tokenise('HONEY')!
    let node = walk.root
    let edge = -1
    for (const symbol of symbols) {
      edge = walk.step(node, symbol)
      expect(edge).not.toBe(-1)
      node = walk.target(edge)
    }
    expect(walk.isWord(edge)).toBe(true)
    expect(dictionary.has('HONEY')).toBe(true)
  })

  it('dead-ends where no word continues', () => {
    const { walk } = dictionary
    const zed = SYMBOLS.indexOf('Z')
    const node = walk.target(walk.step(walk.root, zed))
    expect(walk.step(node, zed)).toBe(-1)
  })
})

describe('symbols', () => {
  it('matches the table the binary was built with', () => {
    expect(meta.symbols).toEqual([...SYMBOLS])
  })

  it('tokenises Qu as a single symbol', () => {
    expect(tokenise('QUIT')).toHaveLength(3)
    expect(tokenise('QUEST')).toHaveLength(4)
  })

  it('counts Qu as two letters, so a 4-letter word can span 3 cells', () => {
    expect(lengthOf(['Qu', 'I', 'T'])).toBe(4)
    expect(lengthOf(['H', 'O', 'N', 'E', 'Y'])).toBe(5)
  })

  it('refuses to tokenise a Q not followed by a U', () => {
    expect(tokenise('QAT')).toBeNull()
    expect(tokenise('FAQIR')).toBeNull()
  })
})
