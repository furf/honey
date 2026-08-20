import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { createPackedDictionary } from './packedDictionary'
import type { Dictionary } from '../../core/ports'

/**
 * The banned list, checked against the dictionary that actually ships.
 *
 * The failure mode of a blocklist is not missing a word — it is quietly removing
 * innocent ones. Most of what follows guards the words that must survive, because
 * "grape" disappearing behind "rape" is the mistake nobody notices until a player
 * hits it mid-game.
 *
 * A blocked word is simply absent, so tracing one gives the ordinary "not a word"
 * response with no hint that anything was filtered.
 */

const DATA = resolve(dirname(fileURLToPath(import.meta.url)), 'data')

let dictionary: Dictionary

beforeAll(() => {
  const buffer = readFileSync(resolve(DATA, 'words.bin'))
  dictionary = createPackedDictionary(
    buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
  )
})

describe('banned words are absent', () => {
  it('blocks profanity', () => {
    for (const word of ['SHIT', 'FUCK', 'CRAP', 'PISS', 'BITCH', 'BASTARD', 'TWAT']) {
      expect(dictionary.has(word), word).toBe(false)
    }
  })

  it('blocks inflections, not just the base word', () => {
    for (const word of ['SHITS', 'FUCKED', 'FUCKING', 'PISSED', 'BITCHES', 'WANKED']) {
      expect(dictionary.has(word), word).toBe(false)
    }
  })

  it('blocks terms for sexual violence and their inflections', () => {
    for (const word of ['RAPE', 'RAPES', 'RAPED', 'RAPING', 'RAPIST', 'INCEST', 'MOLEST']) {
      expect(dictionary.has(word), word).toBe(false)
    }
  })

  it('blocks vulgar sexual terms while leaving the clinical ones', () => {
    for (const word of ['CUNT', 'DILDO', 'PUSSY', 'HORNY', 'ORGASM', 'FELLATIO']) {
      expect(dictionary.has(word), word).toBe(false)
    }
  })

  it('blocks slurs, including plurals', () => {
    for (const word of ['NIGGER', 'FAGGOT', 'CHINK', 'CHINKS', 'GYPSY', 'GYPSIES', 'RETARD']) {
      expect(dictionary.has(word), word).toBe(false)
    }
  })

  it('blocks compounds, not only the word on its own', () => {
    for (const word of ['BULLSHIT', 'DUMBASS', 'JACKASS', 'ASSHOLE']) {
      expect(dictionary.has(word), word).toBe(false)
    }
  })

  it('never offers a banned word to the board generator either', () => {
    // A banned word is gone from the dictionary entirely, so it cannot be counted as
    // findable or built into a board.
    for (const word of ['SHIT', 'RAPE', 'CUNT', 'NIGGER']) {
      expect(dictionary.isCommon(word), word).toBe(false)
    }
  })
})

describe('clinical vocabulary stays in play', () => {
  it('keeps anatomical terms', () => {
    // The brief draws the line at register, not subject: scientific words are words.
    for (const word of [
      'PENIS', 'VAGINA', 'VULVA', 'ANUS', 'RECTUM', 'SCROTUM', 'TESTICLE',
      'UTERUS', 'OVARY', 'CERVIX', 'SEMEN', 'SPERM', 'NIPPLE', 'PROSTATE',
    ]) {
      expect(dictionary.has(word), word).toBe(true)
    }
  })
})

describe('innocent words survive', () => {
  it('keeps words that merely start with a banned stem', () => {
    // The Scunthorpe problem: substring matching would take all of these.
    for (const word of ['GRAPE', 'GRAPES', 'DRAPE', 'SCRAPE', 'RAPIER', 'THERAPIST']) {
      expect(dictionary.has(word), word).toBe(true)
    }
  })

  it('keeps words containing "ass"', () => {
    for (const word of ['CLASS', 'GRASS', 'BRASS', 'GLASS', 'ASSESS', 'ASSIST', 'PASSAGE']) {
      expect(dictionary.has(word), word).toBe(true)
    }
  })

  it('keeps words containing "anal", "cum", "sex" and "tit"', () => {
    for (const word of [
      'ANALYSIS', 'ANALOG', 'CANAL', 'BANAL',
      'CUCUMBER', 'DOCUMENT', 'CUMIN',
      'SEXTET', 'SEXTON', 'UNISEX',
      'TITLE', 'TITAN', 'ATTITUDE',
    ]) {
      expect(dictionary.has(word), word).toBe(true)
    }
  })

  it('keeps inflections of short slurs that are ordinary English', () => {
    // These are why short terms are matched exactly rather than as stems.
    for (const word of ['JAPES', 'SPICES', 'SPICY', 'MONGER', 'MONGREL', 'COCOON']) {
      expect(dictionary.has(word), word).toBe(true)
    }
  })

  it('keeps inflections of mild profanity that are ordinary English', () => {
    for (const word of ['PRICKLY', 'PRICKED', 'COCKPIT', 'COCKTAIL', 'COCKY']) {
      expect(dictionary.has(word), word).toBe(true)
    }
  })
})
